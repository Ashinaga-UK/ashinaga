import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { getDatabase } from '../db/connection';
import { auth } from './auth.config';
import { AuthGuard } from './auth.guard';
import { ACCOUNT_DEACTIVATED_CODE, ACCOUNT_DEACTIVATED_MESSAGE } from './session-guard';

jest.mock('./auth.config', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('../db/connection', () => ({
  getDatabase: jest.fn(),
}));

function executionContextWithHeaders(headers: Record<string, unknown> = {}) {
  const request = { headers } as { headers: Record<string, unknown>; user?: unknown };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as never;
  return { context, request };
}

function mockSessionUser(user: { id: string; email: string; userType: string }) {
  (auth.api.getSession as jest.Mock).mockResolvedValue({ user });
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let mockDb: {
    select: jest.Mock;
    from: jest.Mock;
    where: jest.Mock;
    limit: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    guard = new AuthGuard();
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ isActive: true }]),
    };
    (getDatabase as jest.MockedFunction<typeof getDatabase>).mockReturnValue(mockDb as never);
  });

  it('allows a scholar without looking up a staff row', async () => {
    mockSessionUser({ id: 'scholar-1', email: 'scholar@example.com', userType: 'scholar' });

    const { context, request } = executionContextWithHeaders();
    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.user).toEqual({
      id: 'scholar-1',
      email: 'scholar@example.com',
      userType: 'scholar',
    });
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('allows an active staff member', async () => {
    mockSessionUser({ id: 'staff-1', email: 'staff@example.com', userType: 'staff' });

    const { context, request } = executionContextWithHeaders();
    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.user).toEqual({
      id: 'staff-1',
      email: 'staff@example.com',
      userType: 'staff',
    });
  });

  it('rejects a deactivated staff member with 403 ACCOUNT_DEACTIVATED, not 401', async () => {
    mockSessionUser({ id: 'staff-2', email: 'leaver@example.com', userType: 'staff' });
    mockDb.limit.mockResolvedValue([{ isActive: false }]);

    const { context, request } = executionContextWithHeaders();
    const error = await guard.canActivate(context).catch((e) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error).not.toBeInstanceOf(UnauthorizedException);
    expect(error.getStatus()).toBe(403);
    expect(error.getResponse()).toEqual({
      code: ACCOUNT_DEACTIVATED_CODE,
      message: ACCOUNT_DEACTIVATED_MESSAGE,
    });
    expect(request.user).toBeUndefined();
  });

  it('allows staff with no staff row yet (invitation signup race)', async () => {
    mockSessionUser({ id: 'staff-3', email: 'new@example.com', userType: 'staff' });
    mockDb.limit.mockResolvedValue([]);

    const { context } = executionContextWithHeaders();
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('fails closed with 401 when the staff lookup throws', async () => {
    mockSessionUser({ id: 'staff-4', email: 'staff@example.com', userType: 'staff' });
    mockDb.limit.mockRejectedValue(new Error('db down'));

    const { context } = executionContextWithHeaders();
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('maps unknown session errors to 401', async () => {
    (auth.api.getSession as jest.Mock).mockRejectedValue(new Error('boom'));

    const { context } = executionContextWithHeaders();
    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authentication failed')
    );
  });

  it('rejects a missing session with 401', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(null);

    const { context } = executionContextWithHeaders();
    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('User not authenticated')
    );
    expect(mockDb.select).not.toHaveBeenCalled();
  });
});
