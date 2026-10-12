import { Test, type TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';

// Mock the auth config
jest.mock('./auth.config', () => ({
  auth: {
    handler: jest.fn().mockResolvedValue({
      status: 200,
      headers: new Map(),
      text: jest.fn().mockResolvedValue('{"success":true}'),
    }),
  },
}));

jest.mock('../db/connection', () => ({
  getDatabase: jest.fn(),
}));

describe('AuthController', () => {
  let controller: AuthController;
  let mockDb: {
    select: jest.Mock;
    update: jest.Mock;
    insert: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const { getDatabase } = require('../db/connection');
    mockDb = {
      select: jest.fn(),
      update: jest.fn(),
      insert: jest.fn(),
      delete: jest.fn(),
    };
    getDatabase.mockReturnValue(mockDb);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should handle sign in requests', async () => {
    const mockReq = {
      url: '/api/auth/sign-in/email',
      method: 'POST',
      body: { email: 'test@example.com', password: 'password' },
      headers: {
        'content-type': 'application/json',
      },
      protocol: 'http',
      hostname: 'localhost',
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      header: jest.fn(),
      redirect: jest.fn(),
    };

    await controller.signInWithEmail(mockReq as never, mockRes as never);

    const { auth } = require('./auth.config');
    expect(auth.handler).toHaveBeenCalled();
    expect(mockRes.send).toHaveBeenCalledWith('{"success":true}');
  });

  it('rejects signup without an invitation token', async () => {
    const { auth } = require('./auth.config');
    const mockRes = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      send: jest.fn(),
      header: jest.fn(),
      redirect: jest.fn(),
    };

    await controller.signUpWithEmail(
      {
        url: '/api/auth/sign-up/email',
        method: 'POST',
        body: {
          email: 'prep@example.com',
          password: 'password123',
          name: 'Prep Scholar',
        },
        headers: { 'content-type': 'application/json' },
        protocol: 'http',
        hostname: 'localhost',
      } as never,
      mockRes as never
    );

    expect(auth.handler).not.toHaveBeenCalled();
    expect(mockDb.select).not.toHaveBeenCalled();
    expect(mockRes.statusCode).toBe(400);
    expect(mockRes.send).toHaveBeenCalledWith({ error: 'Invalid invitation' });
  });

  it('does not forward sign-up through the auth fallback', async () => {
    const { auth } = require('./auth.config');
    const mockRes = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      send: jest.fn(),
      header: jest.fn(),
      redirect: jest.fn(),
    };

    await controller.handleAuthFallback(
      {
        url: '/api/auth/sign-up/email/',
        method: 'POST',
        headers: {},
        protocol: 'http',
        hostname: 'localhost',
      } as never,
      mockRes as never
    );

    expect(auth.handler).not.toHaveBeenCalled();
    expect(mockRes.statusCode).toBe(400);
    expect(mockRes.send).toHaveBeenCalledWith({ error: 'Invalid invitation' });
  });

  it('should reject prep-year signup before forwarding when required fields are missing', async () => {
    const { auth } = require('./auth.config');
    const invitationRow = {
      id: 'inv-prep',
      email: 'prep@example.com',
      token: 'valid-token',
      status: 'pending',
      expiresAt: new Date(Date.now() + 86_400_000),
      userType: 'scholar',
      scholarData: {
        programStage: 'prep_year',
      },
    };

    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([invitationRow]),
        }),
      }),
    });

    const mockRes = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      send: jest.fn(),
      header: jest.fn(),
      redirect: jest.fn(),
    };

    const mockReq = {
      url: '/api/auth/sign-up/email',
      method: 'POST',
      body: {
        email: 'prep@example.com',
        password: 'password123',
        name: 'Prep Scholar',
        invitationToken: 'valid-token',
      },
      headers: {
        'content-type': 'application/json',
      },
      protocol: 'http',
      hostname: 'localhost',
    };

    await controller.signUpWithEmail(mockReq as never, mockRes as never);

    expect(auth.handler).not.toHaveBeenCalled();
    expect(mockRes.statusCode).toBe(400);
    expect(mockRes.send).toHaveBeenCalledWith({
      error: 'Intended university is required for prep-year sign up',
    });
  });

  it('should allow prep-year signup when required fields are present and create the scholar profile', async () => {
    const { auth } = require('./auth.config');
    const invitationRow = {
      id: 'inv-prep',
      email: 'prep@example.com',
      token: 'valid-token',
      status: 'pending',
      expiresAt: new Date(Date.now() + 86_400_000),
      userType: 'scholar',
      scholarData: {
        programStage: 'prep_year',
        intendedUniversity: 'University of Example',
        intendedCourse: 'Engineering',
        degreePathway: 'Foundation Year',
        program: 'Prep',
        year: '2026',
        university: 'Invitation University',
      },
    };

    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([invitationRow]),
        }),
      }),
    });

    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockImplementation(() => {
          const result = Promise.resolve(undefined);
          return Object.assign(result, {
            returning: jest.fn().mockResolvedValue([{ id: 'inv-prep' }]),
          });
        }),
      }),
    });

    const insertValues = jest.fn().mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({
      values: insertValues,
    });

    auth.handler.mockResolvedValueOnce({
      status: 200,
      headers: new Map(),
      text: jest.fn().mockResolvedValue('{"user":{"id":"user-123"}}'),
    });

    const mockRes = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      send: jest.fn(),
      header: jest.fn(),
      redirect: jest.fn(),
    };

    const mockReq = {
      url: '/api/auth/sign-up/email',
      method: 'POST',
      body: {
        email: 'prep@example.com',
        password: 'password123',
        name: 'Prep Scholar',
        invitationToken: 'valid-token',
        intendedUniversity: 'University of Example',
        intendedCourse: 'Engineering',
        degreePathway: 'Foundation Year',
      },
      headers: {
        'content-type': 'application/json',
      },
      protocol: 'http',
      hostname: 'localhost',
    };

    await controller.signUpWithEmail(mockReq as never, mockRes as never);

    expect(auth.handler).toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        intendedUniversity: 'University of Example',
        intendedCourse: 'Engineering',
        degreePathway: 'Foundation Year',
        programStage: 'prep_year',
      })
    );
  });

  it('prefers invitation intended-destination fields over the signup body', async () => {
    const { auth } = require('./auth.config');
    const invitationRow = {
      id: 'inv-prep',
      email: 'prep@example.com',
      token: 'valid-token',
      status: 'pending',
      expiresAt: new Date(Date.now() + 86_400_000),
      userType: 'scholar',
      scholarData: {
        programStage: 'prep_year',
        intendedUniversity: 'University of Edinburgh',
        intendedCourse: 'Computer Science',
        degreePathway: 'Foundation Year',
        program: 'Prep',
      },
    };

    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([invitationRow]),
        }),
      }),
    });

    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockImplementation(() => {
          const result = Promise.resolve(undefined);
          return Object.assign(result, {
            returning: jest.fn().mockResolvedValue([{ id: 'inv-prep' }]),
          });
        }),
      }),
    });
    const insertValues = jest.fn().mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({ values: insertValues });

    auth.handler.mockResolvedValueOnce({
      status: 200,
      headers: new Map(),
      text: jest.fn().mockResolvedValue('{"user":{"id":"user-locked"}}'),
    });

    const mockRes = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      send: jest.fn(),
      header: jest.fn(),
      redirect: jest.fn(),
    };

    await controller.signUpWithEmail(
      {
        url: '/api/auth/sign-up/email',
        method: 'POST',
        body: {
          email: 'prep@example.com',
          password: 'password123',
          name: 'Prep Scholar',
          invitationToken: 'valid-token',
          intendedUniversity: 'Attacker University',
          intendedCourse: 'Hacking',
          degreePathway: 'Other',
        },
        headers: { 'content-type': 'application/json' },
        protocol: 'http',
        hostname: 'localhost',
      } as never,
      mockRes as never
    );

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        intendedUniversity: 'University of Edinburgh',
        intendedCourse: 'Computer Science',
        degreePathway: 'Foundation Year',
      })
    );
  });

  it('fails signup when invitation scholarData cannot be parsed', async () => {
    const { auth } = require('./auth.config');

    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            {
              id: 'inv-prep',
              email: 'prep@example.com',
              token: 'valid-token',
              status: 'pending',
              expiresAt: new Date(Date.now() + 86_400_000),
              userType: 'scholar',
              scholarData: '{not-json',
            },
          ]),
        }),
      }),
    });

    const mockRes = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      send: jest.fn(),
      header: jest.fn(),
      redirect: jest.fn(),
    };

    await controller.signUpWithEmail(
      {
        url: '/api/auth/sign-up/email',
        method: 'POST',
        body: {
          email: 'prep@example.com',
          password: 'password123',
          name: 'Prep Scholar',
          invitationToken: 'valid-token',
        },
        headers: { 'content-type': 'application/json' },
        protocol: 'http',
        hostname: 'localhost',
      } as never,
      mockRes as never
    );

    expect(auth.handler).not.toHaveBeenCalled();
    expect(mockRes.statusCode).toBe(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      error: 'Invitation data is corrupted. Please contact support.',
    });
  });

  it('rolls back the user and the invitation when profile setup fails', async () => {
    const { auth } = require('./auth.config');
    const sets: Array<Record<string, unknown>> = [];

    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            {
              id: 'inv-staff',
              email: 'staff@example.com',
              token: 'valid-token',
              status: 'pending',
              expiresAt: new Date(Date.now() + 86_400_000),
              userType: 'staff',
              scholarData: null,
            },
          ]),
        }),
      }),
    });

    mockDb.update.mockReturnValue({
      set: jest.fn().mockImplementation((values: Record<string, unknown>) => {
        sets.push(values);
        return {
          where: jest.fn().mockImplementation(() => {
            const result = Promise.resolve(undefined);
            return Object.assign(result, {
              returning: jest.fn().mockResolvedValue([{ id: 'inv-staff' }]),
            });
          }),
        };
      }),
    });
    mockDb.insert.mockReturnValue({
      values: jest.fn().mockRejectedValue(new Error('profile insert failed')),
    });
    const deleteWhere = jest.fn().mockResolvedValue(undefined);
    mockDb.delete.mockReturnValue({ where: deleteWhere });

    auth.handler.mockResolvedValueOnce({
      status: 200,
      headers: new Map(),
      text: jest.fn().mockResolvedValue('{"user":{"id":"user-rollback"}}'),
    });

    const mockRes = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      send: jest.fn(),
      header: jest.fn(),
      redirect: jest.fn(),
    };

    await controller.signUpWithEmail(
      {
        url: '/api/auth/sign-up/email',
        method: 'POST',
        body: {
          email: 'staff@example.com',
          password: 'password123',
          name: 'Staff Invitee',
          invitationToken: 'valid-token',
        },
        headers: { 'content-type': 'application/json' },
        protocol: 'http',
        hostname: 'localhost',
      } as never,
      mockRes as never
    );

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      error: 'Account setup failed. Please contact support.',
    });
    expect(sets.some((value) => value.status === 'accepted')).toBe(false);
    expect(mockDb.delete).toHaveBeenCalled();
    expect(deleteWhere).toHaveBeenCalled();
  });
});
