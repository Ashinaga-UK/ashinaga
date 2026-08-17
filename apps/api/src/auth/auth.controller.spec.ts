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
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const { getDatabase } = require('../db/connection');
    mockDb = {
      select: jest.fn(),
      update: jest.fn(),
      insert: jest.fn(),
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

  it('should reject prep-year signup before forwarding when required fields are missing', async () => {
    const { auth } = require('./auth.config');
    const invitationRow = {
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

    const updateWhere = jest.fn().mockResolvedValue(undefined);
    const updateSet = jest.fn().mockReturnValue({
      where: updateWhere,
    });
    mockDb.update.mockReturnValue({
      set: updateSet,
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
});
