import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, not, or, sql } from 'drizzle-orm';
import { database } from '../db/connection';
import {
  announcementRecipients,
  documents,
  goalComments,
  goals,
  invitations,
  requests,
  scholars,
  taskAttachments,
  taskResponses,
  tasks,
  users,
} from '../db/schema';
import { InvitationsService } from '../invitations/invitations.service';
import { CreateScholarDto } from './dto/create-scholar.dto';
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
  constructor(private readonly invitationsService: InvitationsService) {}

  async createScholar(
    createScholarDto: CreateScholarDto,
    createdBy: string
  ): Promise<{ success: boolean; message: string; scholar?: any }> {
    // Match invitation + auth flows (always lowercase in `invitations`; users may differ by case from signup)
    const emailNormalized = createScholarDto.email.trim().toLowerCase();

    // Check if a user with this email already exists (case-insensitive)
    const existingUser = await database
      .select()
      .from(users)
      .where(sql`lower(trim(${users.email})) = ${emailNormalized}`)
      .limit(1);

    if (existingUser.length > 0) {
      throw new ConflictException('A user with this email already exists');
    }

    // Check if there's an existing pending invitation (emails are stored lowercase)
    const existingInvitation = await database
      .select()
      .from(invitations)
      .where(and(eq(invitations.email, emailNormalized), eq(invitations.status, 'pending')))
      .limit(1);

    if (existingInvitation.length > 0) {
      throw new ConflictException('An invitation has already been sent to this email');
    }

    // Create the invitation with scholar data
    const invitationData = {
      email: emailNormalized,
      userType: 'scholar' as const,
      scholarData: {
        name: createScholarDto.name,
        program: createScholarDto.program,
        year: createScholarDto.year,
        university: createScholarDto.university,
        location: createScholarDto.location,
        phone: createScholarDto.phone,
        bio: createScholarDto.bio,
        aaiScholarId: createScholarDto.aaiScholarId,
        dateOfBirth: createScholarDto.dateOfBirth,
        gender: createScholarDto.gender,
        nationality: createScholarDto.nationality,
        addressHomeCountry: createScholarDto.addressHomeCountry,
        passportExpirationDate: createScholarDto.passportExpirationDate,
        visaExpirationDate: createScholarDto.visaExpirationDate,
        emergencyContactCountryOfStudy: createScholarDto.emergencyContactCountryOfStudy,
        emergencyContactHomeCountry: createScholarDto.emergencyContactHomeCountry,
        universityId: createScholarDto.universityId,
        dietaryInformation: createScholarDto.dietaryInformation,
        kokorozashi: createScholarDto.kokorozashi,
        longTermCareerPlan: createScholarDto.longTermCareerPlan,
        postGraduationPlan: createScholarDto.postGraduationPlan,
        startDate: createScholarDto.startDate,
        graduationDate: createScholarDto.graduationDate,
      },
    };

    // Create invitation and send email
    const invitation = await this.invitationsService.createInvitation(invitationData, createdBy);

    return {
      success: true,
      message: `Scholar invitation sent to ${emailNormalized}`,
      scholar: invitation,
    };
  }

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
    } else {
      // Exclude archived by default so they don't appear in main list
      whereConditions.push(not(eq(scholars.status, 'archived')));
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
      status: row.scholar.status as 'active' | 'inactive' | 'on_hold' | 'archived',
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
      status: row.scholar.status as 'active' | 'inactive' | 'on_hold' | 'archived',
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
      relatedSkills: goal.relatedSkills,
      actionPlan: goal.actionPlan,
      reviewNotes: goal.reviewNotes,
      completionScale: goal.completionScale,
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
      status: row.scholar.status as 'active' | 'inactive' | 'on_hold' | 'archived',
      startDate: row.scholar.startDate,
      lastActivity: row.scholar.lastActivity,
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
      majorCategory: row.scholar.majorCategory ?? undefined,
      fieldOfStudy: row.scholar.fieldOfStudy ?? undefined,
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
    archived: number;
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
      archived: 0,
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
        case 'archived':
          stats.archived = row.count;
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
        category: goal.category,
        targetDate: goal.targetDate,
        relatedSkills: goal.relatedSkills,
        actionPlan: goal.actionPlan,
        reviewNotes: goal.reviewNotes,
        completionScale: goal.completionScale,
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
        assignedBy: task.assignedBy,
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
        mimeType: doc.mimeType,
        size: doc.size,
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
      status: row.scholar.status as 'active' | 'inactive' | 'on_hold' | 'archived',
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
    profileUpdateData: UpdateScholarProfileDto
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
      majorCategory,
      fieldOfStudy,
    } = profileUpdateData;

    // Update scholar record - handle empty strings and date conversions properly
    const dbUpdateData: any = { updatedAt: new Date() };

    // Handle date fields - only set if not empty string
    if (dateOfBirth && dateOfBirth !== '') dbUpdateData.dateOfBirth = dateOfBirth;
    if (dateOfBirth === '') dbUpdateData.dateOfBirth = null;

    if (passportExpirationDate && passportExpirationDate !== '')
      dbUpdateData.passportExpirationDate = passportExpirationDate;
    if (passportExpirationDate === '') dbUpdateData.passportExpirationDate = null;

    if (visaExpirationDate && visaExpirationDate !== '')
      dbUpdateData.visaExpirationDate = visaExpirationDate;
    if (visaExpirationDate === '') dbUpdateData.visaExpirationDate = null;

    if (startDate && startDate !== '') dbUpdateData.startDate = new Date(startDate);
    if (startDate === '') dbUpdateData.startDate = null;

    if (graduationDate && graduationDate !== '')
      dbUpdateData.graduationDate = new Date(graduationDate);
    if (graduationDate === '') dbUpdateData.graduationDate = null;

    // Handle other fields - only update if provided
    if (gender !== undefined) dbUpdateData.gender = gender;
    if (nationality !== undefined) dbUpdateData.nationality = nationality || null;
    if (phone !== undefined) dbUpdateData.phone = phone || null;
    if (location !== undefined) dbUpdateData.location = location || null;
    if (addressHomeCountry !== undefined)
      dbUpdateData.addressHomeCountry = addressHomeCountry || null;
    if (emergencyContactCountryOfStudy !== undefined)
      dbUpdateData.emergencyContactCountryOfStudy = emergencyContactCountryOfStudy || null;
    if (emergencyContactHomeCountry !== undefined)
      dbUpdateData.emergencyContactHomeCountry = emergencyContactHomeCountry || null;
    if (program !== undefined) dbUpdateData.program = program;
    if (university !== undefined) dbUpdateData.university = university;
    if (year !== undefined) dbUpdateData.year = year;
    if (universityId !== undefined) dbUpdateData.universityId = universityId || null;
    if (dietaryInformation !== undefined)
      dbUpdateData.dietaryInformation = dietaryInformation || null;
    if (kokorozashi !== undefined) dbUpdateData.kokorozashi = kokorozashi || null;
    if (longTermCareerPlan !== undefined)
      dbUpdateData.longTermCareerPlan = longTermCareerPlan || null;
    if (postGraduationPlan !== undefined)
      dbUpdateData.postGraduationPlan = postGraduationPlan || null;
    if (bio !== undefined) dbUpdateData.bio = bio || null;
    if (majorCategory !== undefined) dbUpdateData.majorCategory = majorCategory || null;
    if (fieldOfStudy !== undefined) dbUpdateData.fieldOfStudy = fieldOfStudy || null;

    await database.update(scholars).set(dbUpdateData).where(eq(scholars.id, scholarId));

    // Return updated profile
    return this.getScholarProfileByUserId(userId);
  }

  async updateScholarProfileByScholarId(
    scholarId: string,
    profileUpdateData: UpdateScholarProfileDto
  ): Promise<ScholarProfileDto> {
    const [row] = await database
      .select({ userId: scholars.userId })
      .from(scholars)
      .where(eq(scholars.id, scholarId))
      .limit(1);
    if (!row) {
      throw new NotFoundException('Scholar not found');
    }
    return this.updateScholarProfile(row.userId, profileUpdateData);
  }

  async exportScholarLDF(scholarId: string): Promise<string> {
    // Get scholar info
    const [scholar] = await database
      .select({
        name: users.name,
        email: users.email,
      })
      .from(scholars)
      .leftJoin(users, eq(scholars.userId, users.id))
      .where(eq(scholars.id, scholarId));

    if (!scholar) {
      throw new NotFoundException('Scholar not found');
    }

    // Get all goals with comments
    const goalsData = await database
      .select()
      .from(goals)
      .where(eq(goals.scholarId, scholarId))
      .orderBy(desc(goals.createdAt));

    // Get all comments for these goals
    const goalIds = goalsData.map((g) => g.id);
    const commentsData =
      goalIds.length > 0
        ? await database
            .select({
              id: goalComments.id,
              goalId: goalComments.goalId,
              comment: goalComments.comment,
              createdAt: goalComments.createdAt,
              userName: users.name,
              userType: users.userType,
            })
            .from(goalComments)
            .leftJoin(users, eq(goalComments.userId, users.id))
            .where(inArray(goalComments.goalId, goalIds))
            .orderBy(goalComments.createdAt)
        : [];

    // Group comments by goalId
    const commentsByGoal = new Map<string, any[]>();
    for (const comment of commentsData) {
      if (!commentsByGoal.has(comment.goalId)) {
        commentsByGoal.set(comment.goalId, []);
      }
      commentsByGoal.get(comment.goalId)!.push(comment);
    }

    // Build CSV
    const csvRows: string[] = [];

    // Header
    csvRows.push(
      [
        'Scholar Name',
        'Scholar Email',
        'Goal Category',
        'Goal Summary',
        'Target Deadline',
        'Related LDF Skills & Qualities',
        'Action Plan',
        'Goal Review & Self-Reflection',
        'Completion Scale (1-10)',
        'Status',
        'Completed Date',
        'Created Date',
        'Comments Thread',
      ]
        .map((v) => `"${v}"`)
        .join(',')
    );

    // Data rows
    for (const goal of goalsData) {
      const comments = commentsByGoal.get(goal.id) || [];
      const commentsText = comments
        .map(
          (c) =>
            `[${c.userName} (${c.userType}), ${new Date(c.createdAt).toLocaleDateString()}]: ${c.comment}`
        )
        .join(' | ');

      const row = [
        scholar.name,
        scholar.email,
        goal.category,
        goal.title,
        goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : '',
        goal.relatedSkills || '',
        goal.actionPlan || '',
        goal.reviewNotes || '',
        goal.completionScale,
        goal.status,
        goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : '',
        new Date(goal.createdAt).toLocaleDateString(),
        commentsText,
      ];

      // Escape and quote each field
      csvRows.push(row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    }

    return csvRows.join('\n');
  }

  /** Export all scholars' profile data as CSV (Staff only). Includes archived. */
  async exportAllScholarsCSV(): Promise<string> {
    const rows = await database
      .select({
        scholar: scholars,
        userName: users.name,
        userEmail: users.email,
      })
      .from(scholars)
      .innerJoin(users, eq(scholars.userId, users.id))
      .orderBy(users.name);

    const csvEscape = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const fmtDate = (d: Date | string | null | undefined): string =>
      d ? new Date(d).toISOString().split('T')[0]! : '';

    const headers = [
      'ID',
      'Name',
      'Email',
      'Status',
      'AAI Scholar ID',
      'Phone',
      'Program',
      'Year',
      'University',
      'University ID',
      'Location',
      'Address (Home Country)',
      'Date of Birth',
      'Gender',
      'Nationality',
      'Passport Expiration',
      'Visa Expiration',
      'Emergency Contact (Country of Study)',
      'Emergency Contact (Home Country)',
      'Start Date',
      'Graduation Date',
      'Major Category',
      'Field of Study',
      'Dietary Information',
      'Kokorozashi',
      'Long-term Career Plan',
      'Post-graduation Plan',
      'Bio',
      'Created At',
      'Updated At',
    ];
    const csvRows: string[] = [headers.map((h) => csvEscape(h)).join(',')];

    for (const { scholar: s, userName, userEmail } of rows) {
      const row = [
        s.id,
        userName,
        userEmail,
        s.status,
        s.aaiScholarId ?? '',
        s.phone ?? '',
        s.program,
        s.year,
        s.university,
        s.universityId ?? '',
        s.location ?? '',
        s.addressHomeCountry ?? '',
        fmtDate(s.dateOfBirth),
        s.gender ?? '',
        s.nationality ?? '',
        fmtDate(s.passportExpirationDate),
        fmtDate(s.visaExpirationDate),
        s.emergencyContactCountryOfStudy ?? '',
        s.emergencyContactHomeCountry ?? '',
        fmtDate(s.startDate),
        fmtDate(s.graduationDate),
        s.majorCategory ?? '',
        s.fieldOfStudy ?? '',
        s.dietaryInformation ?? '',
        s.kokorozashi ?? '',
        s.longTermCareerPlan ?? '',
        s.postGraduationPlan ?? '',
        (s.bio ?? '').replace(/\r?\n/g, ' '),
        s.createdAt ? new Date(s.createdAt).toISOString() : '',
        s.updatedAt ? new Date(s.updatedAt).toISOString() : '',
      ];
      csvRows.push(row.map(csvEscape).join(','));
    }

    return csvRows.join('\n');
  }

  async archiveScholar(scholarId: string): Promise<ScholarResponseDto> {
    const [row] = await database.select().from(scholars).where(eq(scholars.id, scholarId)).limit(1);
    if (!row) {
      throw new NotFoundException('Scholar not found');
    }
    await database
      .update(scholars)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(scholars.id, scholarId));
    return this.getScholar(scholarId);
  }

  async deleteScholar(scholarId: string): Promise<void> {
    const [row] = await database.select().from(scholars).where(eq(scholars.id, scholarId)).limit(1);
    if (!row) {
      throw new NotFoundException('Scholar not found');
    }
    const goalRows = await database
      .select({ id: goals.id })
      .from(goals)
      .where(eq(goals.scholarId, scholarId));
    const goalIds = goalRows.map((r) => r.id);
    if (goalIds.length > 0) {
      await database.delete(goalComments).where(inArray(goalComments.goalId, goalIds));
    }
    await database.delete(goals).where(eq(goals.scholarId, scholarId));
    const taskRows = await database
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.scholarId, scholarId));
    const taskIds = taskRows.map((r) => r.id);
    if (taskIds.length > 0) {
      const trRows = await database
        .select({ id: taskResponses.id })
        .from(taskResponses)
        .where(inArray(taskResponses.taskId, taskIds));
      const trIds = trRows.map((r) => r.id);
      if (trIds.length > 0) {
        await database
          .delete(taskAttachments)
          .where(inArray(taskAttachments.taskResponseId, trIds));
      }
      await database.delete(taskResponses).where(inArray(taskResponses.taskId, taskIds));
    }
    await database.delete(tasks).where(eq(tasks.scholarId, scholarId));
    await database.delete(documents).where(eq(documents.scholarId, scholarId));
    await database.delete(requests).where(eq(requests.scholarId, scholarId));
    await database
      .delete(announcementRecipients)
      .where(eq(announcementRecipients.scholarId, scholarId));
    await database.delete(scholars).where(eq(scholars.id, scholarId));
  }
}
