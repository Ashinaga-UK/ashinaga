import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StaffGuard } from '../auth/staff.guard';
import { GetSubmissionReportQueryDto } from './dto/get-submission-report-query.dto';
import { SubmissionReportService } from './submission-report.service';

@ApiTags('submission-report')
@Controller('api/submissions')
export class SubmissionReportController {
  constructor(private readonly submissionReportService: SubmissionReportService) {}

  @Get('report/csv')
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export scholar submissions as CSV' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="submissions-report.csv"')
  async exportCsv(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetSubmissionReportQueryDto
  ) {
    return this.submissionReportService.exportCsv(query);
  }

  @Get('report')
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get scholar submission volume, mix, and history' })
  async getReport(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetSubmissionReportQueryDto
  ) {
    return this.submissionReportService.getReport(query);
  }

  @Get('scholars/:scholarId')
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one scholar submission history' })
  async getScholarReport(
    @Param('scholarId', new ParseUUIDPipe()) scholarId: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetSubmissionReportQueryDto
  ) {
    return this.submissionReportService.getScholarReport(scholarId, query);
  }
}
