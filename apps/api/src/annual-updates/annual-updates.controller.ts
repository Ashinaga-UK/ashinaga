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
import { UpsertAnnualUpdateDto } from './dto/upsert-annual-update.dto';

interface AuthenticatedRequest {
  user: {
    id: string;
    email?: string;
    userType?: string;
  };
}

@ApiTags('annual-updates')
@ApiBearerAuth()
@Controller('api/annual-updates')
@UseGuards(AuthGuard)
export class AnnualUpdatesController {
  constructor(private readonly annualUpdatesService: AnnualUpdatesService) {}

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

  @Get('scholar/:scholarId')
  @UseGuards(StaffGuard)
  async getAnnualUpdatesForScholar(@Param('scholarId', ParseUUIDPipe) scholarId: string) {
    return this.annualUpdatesService.getAnnualUpdatesForScholar(scholarId);
  }

  @Get('scholar/:scholarId/export/csv')
  @UseGuards(StaffGuard)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="scholar-annual-reviews-export.csv"')
  async exportAnnualUpdatesForScholarCsv(@Param('scholarId', ParseUUIDPipe) scholarId: string) {
    return this.annualUpdatesService.exportAnnualUpdatesCsv(scholarId);
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
