import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { getDatabase } from '../db/connection';
import {
  ACCOUNT_DEACTIVATED_CODE,
  ACCOUNT_DEACTIVATED_MESSAGE,
  assertSessionAllowed,
} from './session-guard';

jest.mock('../db/connection', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('better-auth', () => ({
  betterAuth: jest.fn(() => ({ handler: jest.fn(), api: {} })),
}));
jest.mock('better-auth/adapters/drizzle', () => ({ drizzleAdapter: jest.fn(() => ({})) }));

// Load auth.config after mocks so betterAuth captures the real config.
import './auth.config';

// Captured at import, before afterEach clears mock history.
const betterAuthConfig = (betterAuth as jest.Mock).mock.calls[0][0];

function mockStaffRows(rows: Array<{ isActive: boolean }>) {
  const limit = jest.fn().mockResolvedValue(rows);
  const db = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit,
  };
  (getDatabase as jest.Mock).mockReturnValue(db);
  return db;
}

describe('assertSessionAllowed', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.clearAllMocks();
  });

  it('allows an active staff member', async () => {
    mockStaffRows([{ isActive: true }]);
    await expect(assertSessionAllowed({ userId: 'u1' })).resolves.toBeUndefined();
  });

  it('allows a user with no staff row (invitation signup / scholars)', async () => {
    mockStaffRows([]);
    await expect(assertSessionAllowed({ userId: 'new-user' })).resolves.toBeUndefined();
  });

  it('rejects inactive staff with ACCOUNT_DEACTIVATED', async () => {
    mockStaffRows([{ isActive: false }]);

    const error = await assertSessionAllowed({ userId: 'u2' }).catch((e) => e);

    expect(error).toBeInstanceOf(APIError);
    expect(error.statusCode).toBe(403);
    expect(error.body).toEqual({
      code: ACCOUNT_DEACTIVATED_CODE,
      message: ACCOUNT_DEACTIVATED_MESSAGE,
    });
    expect(ACCOUNT_DEACTIVATED_CODE).toBe('ACCOUNT_DEACTIVATED');
  });

  it('does not bypass the check when NODE_ENV is test', async () => {
    process.env.NODE_ENV = 'test';
    mockStaffRows([{ isActive: false }]);
    await expect(assertSessionAllowed({ userId: 'u3' })).rejects.toBeInstanceOf(APIError);
  });
});

describe('betterAuth session hook wiring', () => {
  it('runs the guard from databaseHooks.session.create.before', async () => {
    const config = betterAuthConfig as {
      databaseHooks: {
        session: { create: { before: (session: { userId: string }) => Promise<unknown> } };
      };
    };

    mockStaffRows([{ isActive: false }]);
    await expect(
      config.databaseHooks.session.create.before({ userId: 'u4' })
    ).rejects.toBeInstanceOf(APIError);

    mockStaffRows([]);
    await expect(
      config.databaseHooks.session.create.before({ userId: 'u5' })
    ).resolves.toBeUndefined();
  });
});
