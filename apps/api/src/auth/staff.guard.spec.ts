import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { getDatabase } from '../db/connection';
import { auth } from './auth.config';
import { StaffGuard } from './staff.guard';

// Mock auth config so getSession can be scripted per case.
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

describe('StaffGuard', () => {
  let guard: StaffGuard;
  let mockDb: {
    select: jest.Mock;
    from: jest.Mock;
    where: jest.Mock;
    limit: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    guard = new StaffGuard();
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest
        .fn()
        .mockResolvedValue([{ id: 'staff-1', userId: 'user-1', isActive: true, role: 'admin' }]),
    };
    (getDatabase as jest.MockedFunction<typeof getDatabase>).mockReturnValue(mockDb);
  });

  it('allows an active staff member and attaches request user info', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', email: 'staff@example.com', userType: 'staff' },
    });

    const { context, request } = executionContextWithHeaders();
    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.user).toEqual({
      id: 'user-1',
      email: 'staff@example.com',
      userType: 'staff',
      staffRole: 'admin',
    });
  });

  it('rejects a deactivated staff member with Forbidden', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-2', email: 'leaver@example.com', userType: 'staff' },
    });
    mockDb.limit.mockResolvedValue([
      { id: 'staff-2', userId: 'user-2', isActive: false, role: 'viewer' },
    ]);

    const { context } = executionContextWithHeaders();

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('rejects when no staff row exists', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-3', email: 'ghost@example.com', userType: 'staff' },
    });
    mockDb.limit.mockResolvedValue([]);

    const { context } = executionContextWithHeaders();
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('rejects a non-staff userType with Forbidden', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-4', email: 'scholar@example.com', userType: 'scholar' },
    });

    const { context } = executionContextWithHeaders();
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('rejects a missing session with Unauthorized', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(null);

    const { context } = executionContextWithHeaders();
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(mockDb.select).not.toHaveBeenCalled();
  });
});
