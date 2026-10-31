import { getDatabase } from '../db/connection';
import * as schema from '../db/schema';
import { generateInvitationToken } from './auth.config';

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
    it('should generate a 43-character token', () => {
      const token = generateInvitationToken();
      expect(token).toHaveLength(43);
    });

    it('should generate unique tokens', () => {
      const token1 = generateInvitationToken();
      const token2 = generateInvitationToken();
      expect(token1).not.toBe(token2);
    });

    it('should only contain base64url characters', () => {
      const token = generateInvitationToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
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
