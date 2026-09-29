import { Module } from '@nestjs/common';
import { PrepYearReportModule } from '../prep-year-report/prep-year-report.module';
import { ScholarsModule } from '../scholars/scholars.module';
import { OverviewController } from './overview.controller';
import { OverviewService } from './overview.service';

@Module({
  imports: [ScholarsModule, PrepYearReportModule],
  controllers: [OverviewController],
  providers: [OverviewService],
})
export class OverviewModule {}
