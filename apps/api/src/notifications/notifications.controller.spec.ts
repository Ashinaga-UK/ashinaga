import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, type TestingModule } from '@nestjs/testing';
import { CronGuard } from './cron.guard';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  const service = { runDailyJobs: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: service }],
    }).compile();
    controller = module.get(NotificationsController);
  });

  it('guards the job route with CronGuard', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, NotificationsController.prototype.runDailyJobs)
    ).toEqual(expect.arrayContaining([CronGuard]));
  });

  it('returns the job counts from the service', async () => {
    service.runDailyJobs.mockResolvedValue({ dueSoon: 1, monthlySummaries: 0, staffDigests: 2 });
    await expect(controller.runDailyJobs()).resolves.toEqual({
      dueSoon: 1,
      monthlySummaries: 0,
      staffDigests: 2,
    });
  });
});
