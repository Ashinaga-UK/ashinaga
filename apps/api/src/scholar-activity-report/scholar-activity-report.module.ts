import { Module } from '@nestjs/common';
import { ScholarActivityReportController } from './scholar-activity-report.controller';
import { ScholarActivityReportService } from './scholar-activity-report.service';

@Module({
  controllers: [ScholarActivityReportController],
  providers: [ScholarActivityReportService],
  exports: [ScholarActivityReportService],
})
export class ScholarActivityReportModule {}
