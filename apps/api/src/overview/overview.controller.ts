import { Controller, Get, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StaffGuard } from '../auth/staff.guard';
import { OverviewService } from './overview.service';

interface AuthenticatedRequest {
  user?: { id: string };
}

@ApiTags('overview')
@Controller('api/overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get()
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Staff overview: cohort counts and the attention list' })
  async getOverview(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.overviewService.getOverview(userId);
  }
}
