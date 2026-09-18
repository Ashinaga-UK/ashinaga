import { Module } from '@nestjs/common';
import { CronGuard } from './cron.guard';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { StaffNotificationsController } from './staff-notifications.controller';

@Module({
  controllers: [NotificationsController, StaffNotificationsController],
  providers: [NotificationsService, CronGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
