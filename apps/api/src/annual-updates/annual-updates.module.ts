import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnnualUpdatesController } from './annual-updates.controller';
import { AnnualUpdatesService } from './annual-updates.service';

@Module({
  imports: [NotificationsModule],
  controllers: [AnnualUpdatesController],
  providers: [AnnualUpdatesService, AuthGuard],
  exports: [AnnualUpdatesService],
})
export class AnnualUpdatesModule {}
