import { Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { database } from '../db/connection';
import { goals, scholars, tasks, users } from '../db/schema';
import {
  GetScholarsQueryDto,
  GetScholarsResponseDto,
  PaginationMetaDto,
  ScholarGoalsStatsDto,
  ScholarResponseDto,
  ScholarTasksStatsDto,
} from './dto/get-scholars.dto';

@Injectable()
export class ScholarsService {
  async getScholars(query: GetScholarsQueryDto): Promise<GetScholarsResponseDto> {
    const {
      page = 1,
      limit = 20,
      search,
      program,
      year,
      university,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const offset = (page - 1) * limit;

    const whereConditions = [];

    if (search) {
      whereConditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(scholars.program, `%${search}%`),
          ilike(scholars.university, `%${search}%`)
        )
      );
    }

    if (program) {
      whereConditions.push(eq(scholars.program, program));
    }

    if (year) {
      whereConditions.push(eq(scholars.year, year));
    }

    if (university) {
      whereConditions.push(eq(scholars.university, university));
    }

    if (status) {
      whereConditions.push(eq(scholars.status, status));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const orderByColumn =
      {
        name: users.name,
        lastActivity: scholars.lastActivity,
        createdAt: scholars.createdAt,
      }[sortBy] || scholars.createdAt;

    const orderByClause = sortOrder === 'desc' ? desc(orderByColumn) : sql`${orderByColumn} ASC`;

    const scholarsWithUsers = await database
      .select({
        scholar: scholars,
        user: users,
      })
      .from(scholars)
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const totalCountResult = await database
      .select({ count: count() })
      .from(scholars)
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(whereClause);

    const totalItems = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    const scholarIds = scholarsWithUsers.map((row) => row.scholar.id);

    const goalsStats = await this.getGoalsStats(scholarIds);
    const tasksStats = await this.getTasksStats(scholarIds);

    const data: ScholarResponseDto[] = scholarsWithUsers.map((row) => ({
      id: row.scholar.id,
      userId: row.scholar.userId,
      name: row.user.name,
      email: row.user.email,
      image: row.user.image,
      phone: row.scholar.phone,
      program: row.scholar.program,
      year: row.scholar.year,
      university: row.scholar.university,
      location: row.scholar.location,
      bio: row.scholar.bio,
      status: row.scholar.status as 'active' | 'inactive' | 'on_hold',
      startDate: row.scholar.startDate,
      lastActivity: row.scholar.lastActivity,
      goals: goalsStats[row.scholar.id] || { total: 0, completed: 0, inProgress: 0, pending: 0 },
      tasks: tasksStats[row.scholar.id] || { total: 0, completed: 0, overdue: 0 },
      createdAt: row.scholar.createdAt,
      updatedAt: row.scholar.updatedAt,
    }));

    const pagination: PaginationMetaDto = {
      page,
      limit,
      totalItems,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return {
      data,
      pagination,
    };
  }

  async getScholar(id: string): Promise<ScholarResponseDto> {
    const result = await database
      .select({
        scholar: scholars,
        user: users,
      })
      .from(scholars)
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(eq(scholars.id, id))
      .limit(1);

    if (!result[0]) {
      throw new NotFoundException(`Scholar with ID ${id} not found`);
    }

    const row = result[0];
    const goalsStats = await this.getGoalsStats([row.scholar.id]);
    const tasksStats = await this.getTasksStats([row.scholar.id]);

    return {
      id: row.scholar.id,
      userId: row.scholar.userId,
      name: row.user.name,
      email: row.user.email,
      image: row.user.image,
      phone: row.scholar.phone,
      program: row.scholar.program,
      year: row.scholar.year,
      university: row.scholar.university,
      location: row.scholar.location,
      bio: row.scholar.bio,
      status: row.scholar.status as 'active' | 'inactive' | 'on_hold',
      startDate: row.scholar.startDate,
      lastActivity: row.scholar.lastActivity,
      goals: goalsStats[row.scholar.id] || { total: 0, completed: 0, inProgress: 0, pending: 0 },
      tasks: tasksStats[row.scholar.id] || { total: 0, completed: 0, overdue: 0 },
      createdAt: row.scholar.createdAt,
      updatedAt: row.scholar.updatedAt,
    };
  }

  private async getGoalsStats(scholarIds: string[]): Promise<Record<string, ScholarGoalsStatsDto>> {
    if (scholarIds.length === 0) return {};

    const goalsData = await database
      .select({
        scholarId: goals.scholarId,
        status: goals.status,
        count: count(),
      })
      .from(goals)
      .where(inArray(goals.scholarId, scholarIds))
      .groupBy(goals.scholarId, goals.status);

    const stats: Record<string, ScholarGoalsStatsDto> = {};

    for (const scholarId of scholarIds) {
      stats[scholarId] = {
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
      };
    }

    for (const row of goalsData) {
      const scholarId = row.scholarId;
      if (!stats[scholarId]) {
        stats[scholarId] = {
          total: 0,
          completed: 0,
          inProgress: 0,
          pending: 0,
        };
      }

      stats[scholarId].total += row.count;

      switch (row.status) {
        case 'completed':
          stats[scholarId].completed = row.count;
          break;
        case 'in_progress':
          stats[scholarId].inProgress = row.count;
          break;
        case 'pending':
          stats[scholarId].pending = row.count;
          break;
      }
    }

    return stats;
  }

  private async getTasksStats(scholarIds: string[]): Promise<Record<string, ScholarTasksStatsDto>> {
    if (scholarIds.length === 0) return {};

    const now = new Date();

    const tasksData = await database
      .select({
        scholarId: tasks.scholarId,
        status: tasks.status,
        dueDate: tasks.dueDate,
        count: count(),
      })
      .from(tasks)
      .where(inArray(tasks.scholarId, scholarIds))
      .groupBy(tasks.scholarId, tasks.status, tasks.dueDate);

    const stats: Record<string, ScholarTasksStatsDto> = {};

    for (const scholarId of scholarIds) {
      stats[scholarId] = {
        total: 0,
        completed: 0,
        overdue: 0,
      };
    }

    for (const row of tasksData) {
      const scholarId = row.scholarId;
      if (!stats[scholarId]) {
        stats[scholarId] = {
          total: 0,
          completed: 0,
          overdue: 0,
        };
      }

      stats[scholarId].total += row.count;

      if (row.status === 'completed') {
        stats[scholarId].completed += row.count;
      } else if (row.dueDate && row.dueDate < now) {
        stats[scholarId].overdue += row.count;
      }
    }

    return stats;
  }

  async getFilterOptions(): Promise<{
    programs: string[];
    years: string[];
    universities: string[];
  }> {
    // Get unique programs
    const programsResult = await database
      .selectDistinct({ value: scholars.program })
      .from(scholars)
      .orderBy(scholars.program);

    // Get unique years
    const yearsResult = await database
      .selectDistinct({ value: scholars.year })
      .from(scholars)
      .orderBy(scholars.year);

    // Get unique universities
    const universitiesResult = await database
      .selectDistinct({ value: scholars.university })
      .from(scholars)
      .orderBy(scholars.university);

    return {
      programs: programsResult.map((r) => r.value).filter(Boolean),
      years: yearsResult.map((r) => r.value).filter(Boolean),
      universities: universitiesResult.map((r) => r.value).filter(Boolean),
    };
  }
}
