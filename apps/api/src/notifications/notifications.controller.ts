import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { CronGuard } from './cron.guard';
import { NotificationsService } from './notifications.service';

@ApiExcludeController()
@Controller('api/jobs')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('notifications')
  @HttpCode(200)
  @UseGuards(CronGuard)
  async runDailyJobs() {
    return this.notificationsService.runDailyJobs();
  }
}
