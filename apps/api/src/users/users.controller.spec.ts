import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    updateUser: jest.fn(),
    setStaffAdmin: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateStaffAdmin', () => {
    it('passes the target, flag and caller to the service', async () => {
      const updated = { success: true, userId: 'target', isSuperAdmin: true, role: 'admin' };
      mockUsersService.setStaffAdmin.mockResolvedValue(updated);

      const result = await controller.updateStaffAdmin(
        'target',
        { isSuperAdmin: true },
        { user: { id: 'caller' } }
      );

      expect(mockUsersService.setStaffAdmin).toHaveBeenCalledWith('target', true, 'caller');
      expect(result).toBe(updated);
    });

    it('propagates the service 403 for non-super-admins', async () => {
      mockUsersService.setStaffAdmin.mockRejectedValue(
        new ForbiddenException('Only super-admins can change admin access')
      );

      await expect(
        controller.updateStaffAdmin('target', { isSuperAdmin: true }, { user: { id: 'viewer' } })
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
