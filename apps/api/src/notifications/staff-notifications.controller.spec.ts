import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, type TestingModule } from '@nestjs/testing';
import { StaffGuard } from '../auth/staff.guard';
import { NotificationsService } from './notifications.service';
import { StaffNotificationsController } from './staff-notifications.controller';

describe('StaffNotificationsController', () => {
  let controller: StaffNotificationsController;
  const service = {
    getStaffFeed: jest.fn(),
    markStaffNotificationsRead: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffNotificationsController],
      providers: [{ provide: NotificationsService, useValue: service }],
    })
      .overrideGuard(StaffGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(StaffNotificationsController);
  });

  it('guards staff feed routes with StaffGuard', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, StaffNotificationsController)).toEqual(
      expect.arrayContaining([StaffGuard])
    );
  });

  it('returns the staff feed for the current user', async () => {
    const feed = {
      items: [],
      total: 0,
      unreadCount: 0,
      page: 1,
      limit: 20,
    };
    service.getStaffFeed.mockResolvedValue(feed);

    await expect(
      controller.getStaffFeed({ page: 1, limit: 20 }, { user: { id: 'staff-1' } } as never)
    ).resolves.toEqual(feed);
    expect(service.getStaffFeed).toHaveBeenCalledWith('staff-1', { page: 1, limit: 20 });
  });

  it('marks notifications as read for the current user', async () => {
    service.markStaffNotificationsRead.mockResolvedValue({ updated: 2 });

    await expect(
      controller.markRead({ all: true }, { user: { id: 'staff-1' } } as never)
    ).resolves.toEqual({ updated: 2 });
    expect(service.markStaffNotificationsRead).toHaveBeenCalledWith('staff-1', { all: true });
  });
});
