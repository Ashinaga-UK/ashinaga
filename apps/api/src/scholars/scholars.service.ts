import { Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { database } from '../db/connection';
import { documents, goals, scholars, tasks, users } from '../db/schema';
import {
  DocumentDto,
  GetScholarsQueryDto,
  GetScholarsResponseDto,
  GoalDto,
  PaginationMetaDto,
  ScholarGoalsStatsDto,
  ScholarProfileDto,
  ScholarResponseDto,
  ScholarTasksStatsDto,
  TaskDto,
} from './dto/get-scholars.dto';
import { UpdateScholarProfileDto } from './dto/update-scholar-profile.dto';

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

  async getScholarProfile(id: string): Promise<ScholarProfileDto> {
    // Get basic scholar data
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

    // Get detailed goals
    const goalsData = await database
      .select()
      .from(goals)
      .where(eq(goals.scholarId, id))
      .orderBy(desc(goals.createdAt));

    // Import task response tables
    const { taskResponses, taskAttachments } = await import('../db/schema/task-responses');

    // Get detailed tasks
    const tasksData = await database
      .select()
      .from(tasks)
      .where(eq(tasks.scholarId, id))
      .orderBy(desc(tasks.createdAt));

    // Get task responses and attachments
    const taskIds = tasksData.map((t) => t.id);
    const responsesData =
      taskIds.length > 0
        ? await database.select().from(taskResponses).where(inArray(taskResponses.taskId, taskIds))
        : [];

    const responseIds = responsesData.map((r) => r.id);
    const attachmentsData =
      responseIds.length > 0
        ? await database
            .select()
            .from(taskAttachments)
            .where(inArray(taskAttachments.taskResponseId, responseIds))
        : [];

    // Get documents
    const documentsData = await database
      .select()
      .from(documents)
      .where(eq(documents.scholarId, id))
      .orderBy(desc(documents.createdAt));

    // Transform goals data
    const goalsList: GoalDto[] = goalsData.map((goal) => ({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      category: goal.category,
      targetDate: goal.targetDate,
      progress: goal.progress,
      status: goal.status,
      completedAt: goal.completedAt,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    }));

    // Create maps for easy lookup
    const responseMap = new Map(responsesData.map((r) => [r.taskId, r]));
    const attachmentMap = new Map<string, any[]>();
    attachmentsData.forEach((a) => {
      const existing = attachmentMap.get(a.taskResponseId) || [];
      attachmentMap.set(a.taskResponseId, [...existing, a]);
    });

    // Transform tasks data with responses and attachments
    const tasksList: TaskDto[] = tasksData.map((task) => {
      const response = responseMap.get(task.id);
      const attachments = response ? attachmentMap.get(response.id) || [] : [];

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        type: task.type,
        priority: task.priority,
        dueDate: task.dueDate,
        status: task.status,
        assignedBy: task.assignedBy,
        completedAt: task.completedAt,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        response: response
          ? {
              responseText: response.responseText,
              submittedAt: response.submittedAt,
              attachments: attachments.map((a) => ({
                id: a.id,
                fileName: a.fileName,
                fileUrl: a.fileUrl,
                fileSize: a.fileSize,
                mimeType: a.mimeType,
              })),
            }
          : undefined,
      };
    });

    // Transform documents data
    const documentsList: DocumentDto[] = documentsData.map((doc) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      mimeType: doc.mimeType,
      size: doc.size,
      url: doc.url,
      uploadedBy: doc.uploadedBy,
      uploadDate: doc.uploadDate,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

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
      goals: goalsList,
      tasks: tasksList,
      documents: documentsList,
      createdAt: row.scholar.createdAt,
      updatedAt: row.scholar.updatedAt,
    };
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

  async getScholarStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    onHold: number;
  }> {
    const statsResult = await database
      .select({
        status: scholars.status,
        count: count(),
      })
      .from(scholars)
      .groupBy(scholars.status);

    const stats = {
      total: 0,
      active: 0,
      inactive: 0,
      onHold: 0,
    };

    for (const row of statsResult) {
      stats.total += row.count;
      switch (row.status) {
        case 'active':
          stats.active = row.count;
          break;
        case 'inactive':
          stats.inactive = row.count;
          break;
        case 'on_hold':
          stats.onHold = row.count;
          break;
      }
    }

    return stats;
  }

  async getScholarProfileByUserId(userId: string): Promise<ScholarProfileDto> {
    const result = await database
      .select({
        scholar: scholars,
        user: users,
      })
      .from(scholars)
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(eq(scholars.userId, userId))
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundException('Scholar profile not found');
    }

    const row = result[0];

    // Get goals for this scholar
    const goalsResult = await database
      .select()
      .from(goals)
      .where(eq(goals.scholarId, row.scholar.id))
      .orderBy(desc(goals.createdAt));

    const goalsList = goalsResult.map(
      (goal): GoalDto => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        category: goal.category as 'academic' | 'career' | 'leadership' | 'personal' | 'community',
        targetDate: goal.targetDate,
        progress: goal.progress,
        status: goal.status as 'pending' | 'in_progress' | 'completed',
        completedAt: goal.completedAt,
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt,
      })
    );

    // Get tasks for this scholar
    const tasksResult = await database
      .select()
      .from(tasks)
      .where(eq(tasks.scholarId, row.scholar.id))
      .orderBy(desc(tasks.createdAt));

    const tasksList = tasksResult.map(
      (task): TaskDto => ({
        id: task.id,
        title: task.title,
        description: task.description,
        type: task.type as 'regular' | 'document_upload' | 'survey' | 'meeting',
        priority: task.priority as 'high' | 'medium' | 'low',
        status: task.status as 'pending' | 'in_progress' | 'completed' | 'overdue',
        dueDate: task.dueDate,
        completedAt: task.completedAt,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      })
    );

    // Get documents for this scholar
    const documentsResult = await database
      .select()
      .from(documents)
      .where(eq(documents.scholarId, row.scholar.id))
      .orderBy(desc(documents.createdAt));

    const documentsList = documentsResult.map(
      (doc): DocumentDto => ({
        id: doc.id,
        type: doc.type as 'passport' | 'visa' | 'transcript' | 'certificate' | 'other',
        name: doc.name,
        url: doc.url,
        uploadedBy: doc.uploadedBy,
        uploadDate: doc.uploadDate,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })
    );

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
      // New fields
      aaiScholarId: row.scholar.aaiScholarId,
      dateOfBirth: row.scholar.dateOfBirth,
      gender: row.scholar.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say' | null,
      nationality: row.scholar.nationality,
      addressHomeCountry: row.scholar.addressHomeCountry,
      passportExpirationDate: row.scholar.passportExpirationDate,
      visaExpirationDate: row.scholar.visaExpirationDate,
      emergencyContactCountryOfStudy: row.scholar.emergencyContactCountryOfStudy,
      emergencyContactHomeCountry: row.scholar.emergencyContactHomeCountry,
      graduationDate: row.scholar.graduationDate,
      universityId: row.scholar.universityId,
      dietaryInformation: row.scholar.dietaryInformation,
      kokorozashi: row.scholar.kokorozashi,
      longTermCareerPlan: row.scholar.longTermCareerPlan,
      postGraduationPlan: row.scholar.postGraduationPlan,
      // Related data
      goals: goalsList,
      tasks: tasksList,
      documents: documentsList,
      createdAt: row.scholar.createdAt,
      updatedAt: row.scholar.updatedAt,
    };
  }

  async updateScholarProfile(
    userId: string,
    updateData: UpdateScholarProfileDto
  ): Promise<ScholarProfileDto> {
    // First check if the scholar exists
    const scholarResult = await database
      .select()
      .from(scholars)
      .where(eq(scholars.userId, userId))
      .limit(1);

    if (scholarResult.length === 0) {
      throw new NotFoundException('Scholar profile not found');
    }

    const scholarId = scholarResult[0].id;

    // Prepare update data - remove fields that shouldn't be updated
    const {
      dateOfBirth,
      gender,
      nationality,
      phone,
      location,
      addressHomeCountry,
      passportExpirationDate,
      visaExpirationDate,
      emergencyContactCountryOfStudy,
      emergencyContactHomeCountry,
      program,
      university,
      year,
      startDate,
      graduationDate,
      universityId,
      dietaryInformation,
      kokorozashi,
      longTermCareerPlan,
      postGraduationPlan,
      bio,
    } = updateData;

    // Update scholar record
    await database
      .update(scholars)
      .set({
        ...(dateOfBirth && { dateOfBirth }),
        ...(gender && { gender }),
        ...(nationality && { nationality }),
        ...(phone && { phone }),
        ...(location && { location }),
        ...(addressHomeCountry && { addressHomeCountry }),
        ...(passportExpirationDate && { passportExpirationDate }),
        ...(visaExpirationDate && { visaExpirationDate }),
        ...(emergencyContactCountryOfStudy && { emergencyContactCountryOfStudy }),
        ...(emergencyContactHomeCountry && { emergencyContactHomeCountry }),
        ...(program && { program }),
        ...(university && { university }),
        ...(year && { year }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(graduationDate && { graduationDate: new Date(graduationDate) }),
        ...(universityId && { universityId }),
        ...(dietaryInformation && { dietaryInformation }),
        ...(kokorozashi && { kokorozashi }),
        ...(longTermCareerPlan && { longTermCareerPlan }),
        ...(postGraduationPlan && { postGraduationPlan }),
        ...(bio && { bio }),
        updatedAt: new Date(),
      })
      .where(eq(scholars.id, scholarId));

    // Return updated profile
    return this.getScholarProfileByUserId(userId);
  }
}
