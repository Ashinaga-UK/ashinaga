import { Controller, Get, Header, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StaffGuard } from '../auth/staff.guard';
import { GetScholarActivityQueryDto } from './dto/get-scholar-activity-query.dto';
import { ScholarActivityReportService } from './scholar-activity-report.service';

@ApiTags('scholar-activity-report')
@Controller('api/scholar-activity')
export class ScholarActivityReportController {
  constructor(private readonly scholarActivityReportService: ScholarActivityReportService) {}

  @Get('report/csv')
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export scholar activity report as CSV' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="scholar-activity-report.csv"')
  async exportCsv(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetScholarActivityQueryDto
  ) {
    return this.scholarActivityReportService.exportCsv(query);
  }

  @Get('report')
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get scholar activity report' })
  async getReport(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetScholarActivityQueryDto
  ) {
    return this.scholarActivityReportService.getReport(query);
  }
}
