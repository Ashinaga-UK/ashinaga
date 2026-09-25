import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import { AnnualUpdatesService } from './annual-updates.service';
import { ExportAnnualUpdatesDto } from './dto/export-annual-updates.dto';
import { UpdateAnnualReviewCopyDto } from './dto/update-annual-review-copy.dto';
import { UpsertAnnualUpdateDto } from './dto/upsert-annual-update.dto';

interface AuthenticatedRequest {
  user: {
    id: string;
    email?: string;
    userType?: string;
    staffRole?: string;
  };
}

@ApiTags('annual-updates')
@ApiBearerAuth()
@Controller('api/annual-updates')
@UseGuards(AuthGuard)
export class AnnualUpdatesController {
  constructor(private readonly annualUpdatesService: AnnualUpdatesService) {}

  @Get('copy')
  async getAnnualReviewCopy(@Req() req: AuthenticatedRequest) {
    return this.annualUpdatesService.getAnnualReviewCopy(req.user.id, req.user.userType);
  }

  @Put('copy')
  @UseGuards(StaffGuard)
  async updateAnnualReviewCopy(
    @Req() req: AuthenticatedRequest,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateAnnualReviewCopyDto
  ) {
    return this.annualUpdatesService.updateAnnualReviewCopy(req.user.id, req.user.staffRole, dto);
  }

  @Get()
  @UseGuards(StaffGuard)
  async getAnnualUpdatesReport() {
    return this.annualUpdatesService.getAnnualUpdatesReport();
  }

  @Get('export/csv')
  @UseGuards(StaffGuard)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="annual-reviews-export.csv"')
  async exportAnnualUpdatesCsv(): Promise<string> {
    return this.annualUpdatesService.exportAnnualUpdatesCsv();
  }

  @Post('export/csv')
  @UseGuards(StaffGuard)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="annual-reviews-export.csv"')
  async exportFilteredAnnualUpdatesCsv(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: ExportAnnualUpdatesDto
  ): Promise<string> {
    return this.annualUpdatesService.exportAnnualUpdatesCsv(undefined, dto.annualUpdateIds);
  }

  @Get('scholar/:scholarId/export/csv')
  @UseGuards(StaffGuard)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="scholar-annual-reviews-export.csv"')
  async exportAnnualUpdatesForScholarCsv(@Param('scholarId', ParseUUIDPipe) scholarId: string) {
    return this.annualUpdatesService.exportAnnualUpdatesCsv(scholarId);
  }

  @Get('scholar/:scholarId')
  @UseGuards(StaffGuard)
  async getAnnualUpdatesForScholar(@Param('scholarId', ParseUUIDPipe) scholarId: string) {
    return this.annualUpdatesService.getAnnualUpdatesForScholar(scholarId);
  }

  @Get('my/draft')
  async getMyDraftAnnualUpdate(@Req() req: AuthenticatedRequest) {
    return this.annualUpdatesService.getMyDraftAnnualUpdate(req.user.id);
  }

  @Get('my')
  async getMyAnnualUpdate(
    @Req() req: AuthenticatedRequest,
    @Query('academicYear') academicYear?: string
  ) {
    return this.annualUpdatesService.getMyAnnualUpdate(req.user.id, academicYear);
  }

  @Put('my')
  async saveDraft(
    @Req() req: AuthenticatedRequest,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpsertAnnualUpdateDto
  ) {
    return this.annualUpdatesService.saveDraft(req.user.id, dto);
  }

  @Post('my/submit')
  async submit(
    @Req() req: AuthenticatedRequest,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpsertAnnualUpdateDto
  ) {
    return this.annualUpdatesService.submit(req.user.id, dto);
  }
}
