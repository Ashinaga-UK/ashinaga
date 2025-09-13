import { Injectable } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { database } from '../db/connection';
import {
  announcementFilters,
  announcementRecipients,
  announcements,
  scholars,
  users,
} from '../db/schema';
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

    // Create recipient records for scholars who match the filters
    await this.createRecipientRecords(announcement.id, filters);

    return announcement;
  }

  async getAnnouncements() {
    const result = await database
      .select({
        announcement: announcements,
        creator: users,
      })
      .from(announcements)
      .innerJoin(users, eq(announcements.createdBy, users.id))
      .orderBy(desc(announcements.createdAt));

    const announcementsWithDetails = await Promise.all(
      result.map(async (row) => {
        // Get filters for this announcement
        const filters = await database
          .select()
          .from(announcementFilters)
          .where(eq(announcementFilters.announcementId, row.announcement.id));

        // Get recipient count for this announcement
        const recipientCount = await database
          .select({ count: count() })
          .from(announcementRecipients)
          .where(eq(announcementRecipients.announcementId, row.announcement.id));

        return {
          id: row.announcement.id,
          title: row.announcement.title,
          content: row.announcement.content,
          createdBy: row.creator.name,
          createdAt: row.announcement.createdAt,
          updatedAt: row.announcement.updatedAt,
          filters: filters.map((f) => ({ type: f.filterType, value: f.filterValue })),
          recipientCount: recipientCount[0]?.count || 0,
        };
      })
    );

    return announcementsWithDetails;
  }

  async getAnnouncementsForScholar(userId: string) {
    // First, get the scholar ID from the user ID
    const scholar = await database
      .select()
      .from(scholars)
      .where(eq(scholars.userId, userId))
      .limit(1);

    if (!scholar || scholar.length === 0) {
      return []; // User is not a scholar, return empty array
    }

    const scholarId = scholar[0].id;

    // Get announcements sent to this scholar
    const result = await database
      .select({
        announcement: announcements,
        creator: users,
      })
      .from(announcements)
      .innerJoin(announcementRecipients, eq(announcements.id, announcementRecipients.announcementId))
      .innerJoin(users, eq(announcements.createdBy, users.id))
      .where(eq(announcementRecipients.scholarId, scholarId))
      .orderBy(desc(announcements.createdAt));

    // Format the announcements
    const announcementsForScholar = result.map((row) => ({
      id: row.announcement.id,
      title: row.announcement.title,
      content: row.announcement.content,
      createdBy: row.creator.name,
      createdAt: row.announcement.createdAt,
      updatedAt: row.announcement.updatedAt,
    }));

    return announcementsForScholar;
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

  private async createRecipientRecords(
    announcementId: string,
    filters: Array<{ filterType: string; filterValue: string }>
  ) {
    // Build where conditions based on filters
    const whereConditions = [];

    for (const filter of filters) {
      switch (filter.filterType) {
        case 'year':
          whereConditions.push(eq(scholars.year, filter.filterValue));
          break;
        case 'program':
          whereConditions.push(eq(scholars.program, filter.filterValue));
          break;
        case 'university':
          whereConditions.push(eq(scholars.university, filter.filterValue));
          break;
        case 'status':
          if (
            filter.filterValue === 'active' ||
            filter.filterValue === 'inactive' ||
            filter.filterValue === 'on_hold'
          ) {
            whereConditions.push(
              eq(scholars.status, filter.filterValue as 'active' | 'inactive' | 'on_hold')
            );
          }
          break;
        case 'location':
          whereConditions.push(eq(scholars.location, filter.filterValue));
          break;
      }
    }

    // If no filters, get all scholars
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get scholars that match the filters
    const matchingScholars = await database
      .select({ id: scholars.id })
      .from(scholars)
      .where(whereClause);

    // Create recipient records for each matching scholar
    if (matchingScholars.length > 0) {
      await database.insert(announcementRecipients).values(
        matchingScholars.map((scholar) => ({
          announcementId,
          scholarId: scholar.id,
        }))
      );
    }
  }
}
