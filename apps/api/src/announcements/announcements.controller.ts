import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, ScholarFilterDto } from './dto/create-announcement.dto';
import { GetAnnouncementsQueryDto } from './dto/get-announcements.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    userType?: string;
  };
}

@ApiTags('announcements')
@Controller('api/announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @UseGuards(StaffGuard)
  async getAnnouncements(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetAnnouncementsQueryDto
  ) {
    return this.announcementsService.getAnnouncements(query);
  }

  @Post()
  @UseGuards(StaffGuard)
  async createAnnouncement(
    @Body() createAnnouncementDto: CreateAnnouncementDto,
    @Req() req: AuthenticatedRequest
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.announcementsService.createAnnouncement(createAnnouncementDto, userId);
  }

  @Get('scholars')
  @UseGuards(StaffGuard)
  async getScholarsForFiltering(): Promise<ScholarFilterDto[]> {
    return this.announcementsService.getScholarsForFiltering();
  }

  @Get('filter-options')
  @UseGuards(StaffGuard)
  async getFilterOptions() {
    return this.announcementsService.getFilterOptions();
  }

  @Get('my-announcements')
  @UseGuards(AuthGuard)
  async getMyAnnouncements(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetAnnouncementsQueryDto,
    @Req() req: AuthenticatedRequest
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.announcementsService.getAnnouncementsForScholar(userId, query);
  }

  @Delete(':id')
  @UseGuards(StaffGuard)
  async archiveAnnouncement(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.announcementsService.archiveAnnouncement(id, userId);
  }
}
