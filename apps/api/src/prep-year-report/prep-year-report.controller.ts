import { Controller, Get, Header, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StaffGuard } from '../auth/staff.guard';
import { GetPrepYearReportQueryDto } from './dto/get-prep-year-report-query.dto';
import { PrepYearReportService } from './prep-year-report.service';

@ApiTags('prep-year-report')
@Controller('api/prep-year')
export class PrepYearReportController {
  constructor(private readonly prepYearReportService: PrepYearReportService) {}

  @Get('report/csv')
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export Prep Year cohort overview as CSV' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="prep-year-cohort-report.csv"')
  async exportCsv(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetPrepYearReportQueryDto
  ) {
    return this.prepYearReportService.exportCsv(query);
  }

  @Get('report')
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Prep Year cohort overview report' })
  async getReport(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetPrepYearReportQueryDto
  ) {
    return this.prepYearReportService.getReport(query);
  }
}
