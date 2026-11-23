import { Module } from '@nestjs/common';
import { SubmissionReportController } from './submission-report.controller';
import { SubmissionReportService } from './submission-report.service';

@Module({
  controllers: [SubmissionReportController],
  providers: [SubmissionReportService],
})
export class SubmissionReportModule {}
