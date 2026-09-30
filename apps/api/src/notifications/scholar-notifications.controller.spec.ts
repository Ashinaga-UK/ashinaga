import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, type TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { NotificationsService } from './notifications.service';
import { ScholarNotificationsController } from './scholar-notifications.controller';

describe('ScholarNotificationsController', () => {
  let controller: ScholarNotificationsController;
  const service = {
    getScholarFeed: jest.fn(),
    markScholarNotificationsRead: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScholarNotificationsController],
      providers: [{ provide: NotificationsService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(ScholarNotificationsController);
  });

  it('guards scholar feed routes with AuthGuard', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ScholarNotificationsController)).toEqual(
      expect.arrayContaining([AuthGuard])
    );
  });

  it('returns the scholar feed for the current scholar', async () => {
    const feed = {
      items: [],
      total: 0,
      unreadCount: 0,
      page: 1,
      limit: 20,
    };
    service.getScholarFeed.mockResolvedValue(feed);

    await expect(
      controller.getScholarFeed(
        { page: 1, limit: 20 },
        { user: { id: 'scholar-user-1', userType: 'scholar' } } as never
      )
    ).resolves.toEqual(feed);
    expect(service.getScholarFeed).toHaveBeenCalledWith('scholar-user-1', { page: 1, limit: 20 });
  });

  it('rejects staff users from the scholar feed', async () => {
    await expect(
      controller.getScholarFeed({ page: 1 }, { user: { id: 'staff-1', userType: 'staff' } } as never)
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects unauthenticated requests', async () => {
    await expect(
      controller.markRead({ all: true }, { user: undefined } as never)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('marks notifications as read for the current scholar', async () => {
    service.markScholarNotificationsRead.mockResolvedValue({ updated: 2 });

    await expect(
      controller.markRead(
        { all: true },
        { user: { id: 'scholar-user-1', userType: 'scholar' } } as never
      )
    ).resolves.toEqual({ updated: 2 });
    expect(service.markScholarNotificationsRead).toHaveBeenCalledWith('scholar-user-1', {
      all: true,
    });
  });
});
