import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StaffGuard } from '../auth/staff.guard';
import { UpdatePlatformUrlDto } from './dto/update-platform-url.dto';
import { PlatformsService } from './platforms.service';

interface StaffRequest {
  user: {
    id: string;
    staffRole?: string;
  };
}

@ApiTags('platforms')
@ApiBearerAuth()
@Controller('api/platforms')
@UseGuards(StaffGuard)
export class PlatformsController {
  constructor(private readonly platformsService: PlatformsService) {}

  @Get()
  async listPlatforms(@Req() req: StaffRequest) {
    return this.platformsService.listPlatforms(req.user.staffRole);
  }

  @Patch(':slug')
  async updatePlatformUrl(
    @Param('slug') slug: string,
    @Req() req: StaffRequest,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdatePlatformUrlDto
  ) {
    return this.platformsService.updatePlatformUrl(slug, req.user.staffRole, dto);
  }
}
