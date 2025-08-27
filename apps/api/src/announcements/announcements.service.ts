import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { database } from '../db/connection';
import { announcementFilters, announcements, scholars, users } from '../db/schema';
import { CreateAnnouncementDto, ScholarFilterDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  async createAnnouncement(createAnnouncementDto: CreateAnnouncementDto, createdBy: string) {
    const { title, content, filters = [] } = createAnnouncementDto;

    // Create the announcement
    const [announcement] = await database
      .insert(announcements)
      .values({
        title,
        content,
        createdBy,
      })
      .returning();

    // Create filters if provided
    if (filters.length > 0) {
      await database.insert(announcementFilters).values(
        filters.map((filter) => ({
          announcementId: announcement.id,
          filterType: filter.filterType,
          filterValue: filter.filterValue,
        }))
      );
    }

    return announcement;
  }

  async getScholarsForFiltering(): Promise<ScholarFilterDto[]> {
    const result = await database
      .select({
        id: scholars.id,
        userId: scholars.userId,
        name: users.name,
        email: users.email,
        program: scholars.program,
        year: scholars.year,
        university: scholars.university,
        location: scholars.location,
        status: scholars.status,
      })
      .from(scholars)
      .innerJoin(users, eq(scholars.userId, users.id))
      .orderBy(users.name);

    return result.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      email: row.email,
      program: row.program,
      year: row.year,
      university: row.university,
      location: row.location,
      status: row.status,
    }));
  }

  async getFilterOptions() {
    const scholars = await this.getScholarsForFiltering();

    const programs = [...new Set(scholars.map((s) => s.program))].sort();
    const years = [...new Set(scholars.map((s) => s.year))].sort();
    const universities = [...new Set(scholars.map((s) => s.university))].sort();
    const locations = [...new Set(scholars.map((s) => s.location).filter(Boolean))].sort();
    const statuses = [...new Set(scholars.map((s) => s.status))].sort();

    return {
      programs,
      years,
      universities,
      locations,
      statuses,
    };
  }
}
