import {
  Controller,
  Get,
  Header,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StaffGuard } from '../auth/staff.guard';
import { GetSubmissionReportQueryDto } from './dto/get-submission-report-query.dto';
import { SubmissionReportService } from './submission-report.service';

interface AuthenticatedRequest {
  user?: { id: string };
}

function staffUserId(req: AuthenticatedRequest): string {
  const id = req.user?.id;
  if (!id) throw new UnauthorizedException('User not authenticated');
  return id;
}

@ApiTags('submission-report')
@Controller('api/submissions')
export class SubmissionReportController {
  constructor(private readonly submissionReportService: SubmissionReportService) {}

  @Get('report/csv')
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export request submissions by month, type and cohort as CSV' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="submissions-report.csv"')
  async exportCsv(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetSubmissionReportQueryDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.submissionReportService.exportCsv(query, staffUserId(req));
  }

  @Get('report')
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get request submissions by month, type and cohort' })
  async getReport(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetSubmissionReportQueryDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.submissionReportService.getReport(query, staffUserId(req));
  }
}
