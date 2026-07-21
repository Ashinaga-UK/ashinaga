import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AnnualUpdatesController } from './annual-updates.controller';
import { AnnualUpdatesService } from './annual-updates.service';

@Module({
  controllers: [AnnualUpdatesController],
  providers: [AnnualUpdatesService, AuthGuard],
  exports: [AnnualUpdatesService],
})
export class AnnualUpdatesModule {}
