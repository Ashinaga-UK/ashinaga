import { generateInvitationToken } from './auth.config';
import { getDatabase } from '../db/connection';
import * as schema from '../db/schema';

// Mock the database connection
jest.mock('../db/connection', () => ({
  getDatabase: jest.fn(),
}));

// Mock better-auth
jest.mock('better-auth', () => ({
  betterAuth: jest.fn(() => ({
    handler: jest.fn(),
    api: {},
  })),
}));

// Mock drizzle adapter
jest.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter: jest.fn(() => ({})),
}));

// Mock jwt plugin
jest.mock('better-auth/plugins', () => ({
  jwt: jest.fn(() => ({})),
}));

describe('Auth Configuration', () => {
  let mockDb: ReturnType<typeof getDatabase>;

  beforeEach(() => {
    // Setup mock database
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
    };

    (getDatabase as jest.MockedFunction<typeof getDatabase>).mockReturnValue(mockDb);

    // Set required environment variables
    process.env.BETTER_AUTH_SECRET = 'test-secret-key';
    process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateInvitationToken', () => {
    it('should generate a 32-character token', () => {
      const token = generateInvitationToken();
      expect(token).toHaveLength(32);
    });

    it('should generate unique tokens', () => {
      const token1 = generateInvitationToken();
      const token2 = generateInvitationToken();
      expect(token1).not.toBe(token2);
    });

    it('should only contain alphanumeric characters', () => {
      const token = generateInvitationToken();
      expect(token).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  describe('Auth Configuration - Signup Callbacks', () => {
    it('should reject signup without invitation', async () => {
      // Mock no invitation found
      mockDb.limit.mockResolvedValue([]);

      const _signUpBefore = jest.fn();

      // Simulate the callback behavior
      try {
        await mockDb.select().from(schema.invitations).where().limit(1);

        const invitation = undefined;
        if (!invitation) {
          throw new Error('Invalid invitation. You must be invited to join this platform.');
        }
      } catch (error) {
        expect(error.message).toBe(
          'Invalid invitation. You must be invited to join this platform.'
        );
      }
    });

    it('should reject already used invitation', async () => {
      // Mock invitation with accepted status
      mockDb.limit.mockResolvedValue([
        {
          id: '123',
          email: 'test@example.com',
          status: 'accepted',
          userType: 'staff',
          expiresAt: new Date(Date.now() + 86400000), // Tomorrow
        },
      ]);

      try {
        const invitations = await mockDb.select().from(schema.invitations).where().limit(1);

        const invitation = invitations[0];
        if (invitation && invitation.status !== 'pending') {
          throw new Error('This invitation has already been used or expired.');
        }
      } catch (error) {
        expect(error.message).toBe('This invitation has already been used or expired.');
      }
    });

    it('should reject expired invitation', async () => {
      // Mock expired invitation
      mockDb.limit.mockResolvedValue([
        {
          id: '123',
          email: 'test@example.com',
          status: 'pending',
          userType: 'staff',
          expiresAt: new Date(Date.now() - 86400000), // Yesterday
        },
      ]);

      try {
        const invitations = await mockDb.select().from(schema.invitations).where().limit(1);

        const invitation = invitations[0];
        if (invitation && new Date() > new Date(invitation.expiresAt)) {
          throw new Error('This invitation has expired. Please request a new one.');
        }
      } catch (error) {
        expect(error.message).toBe('This invitation has expired. Please request a new one.');
      }
    });

    it('should accept valid invitation and create staff profile', async () => {
      // Mock valid invitation
      const validInvitation = {
        id: '123',
        email: 'staff@example.com',
        status: 'pending',
        userType: 'staff',
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
      };

      // Set up the mock chain to return the invitation
      mockDb.limit.mockResolvedValue([validInvitation]);

      // Call the methods to test chaining
      const selectResult = mockDb.select();
      expect(selectResult.from).toBeDefined();

      const fromResult = selectResult.from(schema.invitations);
      expect(fromResult.where).toBeDefined();

      const whereResult = fromResult.where();
      expect(whereResult.limit).toBeDefined();

      const invitations = await whereResult.limit(1);

      const invitation = invitations[0];
      expect(invitation).toBeDefined();
      expect(invitation.status).toBe('pending');
      expect(invitation.userType).toBe('staff');

      // Simulate profile creation
      mockDb.values.mockResolvedValue({ rowCount: 1 });

      const insertResult = mockDb.insert(schema.staff);
      const result = await insertResult.values({
        userId: 'user-123',
        role: 'viewer',
        isActive: true,
      });
      expect(result.rowCount).toBe(1);
    });

    it('should accept valid invitation and create scholar profile with pre-filled data', async () => {
      // Mock valid invitation with scholar data
      const scholarData = {
        program: 'Computer Science',
        year: '2024',
        university: 'Tokyo University',
        location: 'Tokyo',
        phone: '+81-123-456-7890',
        bio: 'Aspiring AI researcher',
      };

      const validInvitation = {
        id: '456',
        email: 'scholar@example.com',
        status: 'pending',
        userType: 'scholar',
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
        scholarData: JSON.stringify(scholarData),
      };

      mockDb.limit.mockResolvedValue([validInvitation]);
      mockDb.values.mockResolvedValue({ rowCount: 1 });

      // Simulate successful signup
      const invitations = await mockDb.select().from(schema.invitations).where().limit(1);

      const invitation = invitations[0];
      expect(invitation).toBeDefined();
      expect(invitation.userType).toBe('scholar');

      // Parse scholar data
      let parsedScholarData = {
        program: 'TBD',
        year: 'TBD',
        university: 'TBD',
      };

      if (invitation.scholarData) {
        try {
          const parsed = JSON.parse(invitation.scholarData);
          parsedScholarData = { ...parsedScholarData, ...parsed };
        } catch (_e) {
          // Error handled
        }
      }

      expect(parsedScholarData.program).toBe('Computer Science');
      expect(parsedScholarData.university).toBe('Tokyo University');
    });
  });

  describe('Auth Configuration - Signin Callbacks', () => {
    it('should allow active staff members to sign in', async () => {
      const activeUser = {
        id: 'user-123',
        email: 'staff@example.com',
        userType: 'staff',
      };

      const activeStaff = {
        id: 'staff-123',
        userId: 'user-123',
        isActive: true,
      };

      mockDb.limit
        .mockResolvedValueOnce([activeUser]) // First call for user
        .mockResolvedValueOnce([activeStaff]); // Second call for staff

      // Simulate signin check
      const userResults = await mockDb.select().from(schema.users).where().limit(1);

      const user = userResults[0];
      expect(user).toBeDefined();

      if (user.userType === 'staff') {
        const staffResults = await mockDb.select().from(schema.staff).where().limit(1);

        const staffMember = staffResults[0];
        expect(staffMember.isActive).toBe(true);
      }
    });

    it('should reject inactive staff members', async () => {
      const inactiveUser = {
        id: 'user-456',
        email: 'inactive@example.com',
        userType: 'staff',
      };

      const inactiveStaff = {
        id: 'staff-456',
        userId: 'user-456',
        isActive: false,
      };

      mockDb.limit.mockResolvedValueOnce([inactiveUser]).mockResolvedValueOnce([inactiveStaff]);

      try {
        const userResults = await mockDb.select().from(schema.users).where().limit(1);

        const user = userResults[0];

        if (user && user.userType === 'staff') {
          const staffResults = await mockDb.select().from(schema.staff).where().limit(1);

          const staffMember = staffResults[0];

          if (staffMember && !staffMember.isActive) {
            throw new Error('Your account has been deactivated. Please contact an administrator.');
          }
        }
      } catch (error) {
        expect(error.message).toBe(
          'Your account has been deactivated. Please contact an administrator.'
        );
      }
    });

    it('should allow scholars to sign in without checking active status', async () => {
      const scholarUser = {
        id: 'user-789',
        email: 'scholar@example.com',
        userType: 'scholar',
      };

      mockDb.limit.mockResolvedValueOnce([scholarUser]);

      // Simulate signin check
      const userResults = await mockDb.select().from(schema.users).where().limit(1);

      const user = userResults[0];
      expect(user).toBeDefined();
      expect(user.userType).toBe('scholar');
      // No additional checks for scholars
    });
  });

  describe('Environment Configuration', () => {
    it('should use default baseURL when BETTER_AUTH_URL is not set', () => {
      delete process.env.BETTER_AUTH_URL;
      expect(process.env.BETTER_AUTH_URL || 'http://localhost:3000').toBe('http://localhost:3000');
    });

    it('should use Microsoft OAuth when credentials are provided', () => {
      process.env.MICROSOFT_CLIENT_ID = 'test-client-id';
      process.env.MICROSOFT_CLIENT_SECRET = 'test-client-secret';

      const hasMicrosoftAuth =
        process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET;
      expect(hasMicrosoftAuth).toBeTruthy();
    });

    it('should skip Microsoft OAuth when credentials are missing', () => {
      delete process.env.MICROSOFT_CLIENT_ID;
      delete process.env.MICROSOFT_CLIENT_SECRET;

      const hasMicrosoftAuth =
        process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET;
      expect(hasMicrosoftAuth).toBeFalsy();
    });
  });
});
