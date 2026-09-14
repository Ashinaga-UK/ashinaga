import { Module } from '@nestjs/common';
import { PrepYearReportController } from './prep-year-report.controller';
import { PrepYearReportService } from './prep-year-report.service';

@Module({
  controllers: [PrepYearReportController],
  providers: [PrepYearReportService],
})
export class PrepYearReportModule {}
