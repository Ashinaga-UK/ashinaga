import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AvatarsService } from '../avatars/avatars.service';
import { database } from '../db/connection';
import { UsersService } from './users.service';

jest.mock('../db/connection', () => ({
  database: {
    select: jest.fn(),
    update: jest.fn(),
    transaction: jest.fn(),
  },
}));

type StaffRow = { userId: string; isActive: boolean; isSuperAdmin: boolean };

const requesterId = 'staff-super';
const targetId = 'staff-target';

// Every select in setStaffAdmin ends in `.limit()` or `.for()`; resolve both
// with the next queued result. `locks` records which selects took `FOR UPDATE`.
function selectReturning(queue: unknown[][], locks: unknown[][] = []) {
  return jest.fn(() => {
    const rows = queue.shift() ?? [];
    const chain: Record<string, jest.Mock> = {};
    chain.from = jest.fn().mockReturnValue(chain);
    chain.where = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockResolvedValue(rows);
    chain.for = jest.fn(() => {
      locks.push(rows);
      const locked = Promise.resolve(rows) as Promise<unknown[]> & { limit?: jest.Mock };
      locked.limit = jest.fn().mockResolvedValue(rows);
      return locked;
    });
    return chain;
  });
}

function mockDb({
  requester,
  activeSuperAdmins = [],
  target,
}: {
  requester?: StaffRow;
  activeSuperAdmins?: { userId: string }[];
  target?: StaffRow;
}) {
  // All reads happen inside the transaction, in this order: the locked set of
  // active super-admins, then the caller, then the target.
  const locks: unknown[][] = [];
  const set = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });
  const tx = {
    select: selectReturning(
      [activeSuperAdmins, requester ? [requester] : [], target ? [target] : []],
      locks
    ),
    update: jest.fn().mockReturnValue({ set }),
  };
  (database.transaction as jest.Mock).mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));
  return { tx, set, locks };
}

const superAdmin: StaffRow = { userId: requesterId, isActive: true, isSuperAdmin: true };

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: AvatarsService,
          useValue: {
            resolveImageUpdate: jest.fn(),
            deleteStoredAvatar: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setStaffAdmin', () => {
    it('promotes an active non-admin and sets role to admin', async () => {
      const { set } = mockDb({
        requester: superAdmin,
        activeSuperAdmins: [{ userId: requesterId }],
        target: { userId: targetId, isActive: true, isSuperAdmin: false },
      });

      const result = await service.setStaffAdmin(targetId, true, requesterId);

      expect(result).toEqual({
        success: true,
        userId: targetId,
        isSuperAdmin: true,
        role: 'admin',
      });
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ isSuperAdmin: true, role: 'admin' })
      );
    });

    it('demotes an admin and sets role to viewer when another super-admin remains', async () => {
      const { set } = mockDb({
        requester: superAdmin,
        activeSuperAdmins: [{ userId: requesterId }, { userId: targetId }],
        target: { userId: targetId, isActive: true, isSuperAdmin: true },
      });

      const result = await service.setStaffAdmin(targetId, false, requesterId);

      expect(result).toEqual({
        success: true,
        userId: targetId,
        isSuperAdmin: false,
        role: 'viewer',
      });
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ isSuperAdmin: false, role: 'viewer' })
      );
    });

    it('rejects changing your own admin access', async () => {
      mockDb({ requester: superAdmin });

      await expect(service.setStaffAdmin(requesterId, false, requesterId)).rejects.toBeInstanceOf(
        BadRequestException
      );
      expect(database.transaction).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller is not a super-admin', async () => {
      const { tx } = mockDb({
        requester: { userId: requesterId, isActive: true, isSuperAdmin: false },
      });

      await expect(service.setStaffAdmin(targetId, true, requesterId)).rejects.toThrow(
        new ForbiddenException('Only super-admins can change admin access')
      );
      expect(tx.update).not.toHaveBeenCalled();
    });

    it('returns 403 and writes nothing when the caller was demoted before the lock', async () => {
      // Another admin demoted the caller after they loaded the page. Once the
      // lock is taken, the caller's row is re-read and no longer a super-admin,
      // even though the target and admin set would otherwise allow the change.
      const { tx, locks } = mockDb({
        activeSuperAdmins: [{ userId: 'staff-other-admin' }, { userId: targetId }],
        requester: { userId: requesterId, isActive: true, isSuperAdmin: false },
        target: { userId: targetId, isActive: true, isSuperAdmin: true },
      });

      await expect(service.setStaffAdmin(targetId, false, requesterId)).rejects.toThrow(
        new ForbiddenException('Only super-admins can change admin access')
      );
      expect(tx.update).not.toHaveBeenCalled();
      // The caller is read inside the transaction with FOR UPDATE.
      expect(locks).toContainEqual([{ userId: requesterId, isActive: true, isSuperAdmin: false }]);
    });

    it('returns 403 when the caller is an inactive super-admin', async () => {
      const { tx } = mockDb({
        requester: { userId: requesterId, isActive: false, isSuperAdmin: true },
      });

      await expect(service.setStaffAdmin(targetId, true, requesterId)).rejects.toBeInstanceOf(
        ForbiddenException
      );
      expect(tx.update).not.toHaveBeenCalled();
    });

    it('returns 404 when the target has no staff record (e.g. a scholar)', async () => {
      mockDb({ requester: superAdmin, activeSuperAdmins: [{ userId: requesterId }] });

      await expect(service.setStaffAdmin(targetId, true, requesterId)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('rejects promoting inactive staff', async () => {
      const { tx } = mockDb({
        requester: superAdmin,
        activeSuperAdmins: [{ userId: requesterId }],
        target: { userId: targetId, isActive: false, isSuperAdmin: false },
      });

      await expect(service.setStaffAdmin(targetId, true, requesterId)).rejects.toThrow(
        new BadRequestException('Cannot change admin access for an inactive staff member')
      );
      expect(tx.update).not.toHaveBeenCalled();
    });

    it('rejects demoting the last super-admin', async () => {
      const { tx } = mockDb({
        requester: superAdmin,
        activeSuperAdmins: [{ userId: targetId }],
        target: { userId: targetId, isActive: true, isSuperAdmin: true },
      });

      await expect(service.setStaffAdmin(targetId, false, requesterId)).rejects.toThrow(
        new BadRequestException('Cannot remove the last super-admin')
      );
      expect(tx.update).not.toHaveBeenCalled();
    });
  });
});
