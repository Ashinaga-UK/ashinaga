import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, ScholarFilterDto } from './dto/create-announcement.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    userType?: string;
  };
}

@Controller('api/announcements')
@UseGuards(AuthGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  async getAnnouncements() {
    return this.announcementsService.getAnnouncements();
  }

  @Post()
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
  async getScholarsForFiltering(): Promise<ScholarFilterDto[]> {
    return this.announcementsService.getScholarsForFiltering();
  }

  @Get('filter-options')
  async getFilterOptions() {
    return this.announcementsService.getFilterOptions();
  }
}
