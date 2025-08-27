import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, ScholarFilterDto } from './dto/create-announcement.dto';

@Controller('api/announcements')
@UseGuards(AuthGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  async createAnnouncement(@Body() createAnnouncementDto: CreateAnnouncementDto) {
    // TODO: Get actual user ID from auth context
    const createdBy = 'staff-user-id'; // This should come from the authenticated user
    return this.announcementsService.createAnnouncement(createAnnouncementDto, createdBy);
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
