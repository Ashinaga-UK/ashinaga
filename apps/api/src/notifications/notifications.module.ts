import { Module } from '@nestjs/common';
import { CronGuard } from './cron.guard';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, CronGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
