import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
import { assertHttpUrl } from '../common/http-url';
import { getDatabase } from '../db/connection';
import { scholars } from '../db/schema/scholars';
import { taskAttachments, taskResponses } from '../db/schema/task-responses';
import { tasks } from '../db/schema/tasks';
import { staff, users } from '../db/schema/users';
import { EmailService } from '../email/email.service';
import { ObjectStorageService } from '../storage/object-storage';
import { AttachmentDto, CompleteTaskDto } from './dto/complete-task.dto';
import { CreateBulkTasksDto } from './dto/create-bulk-tasks.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTaskCohortQueryDto } from './dto/get-task-cohort-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { buildPrepTaskCohortMatrix } from './prep-task-cohort';
import { isTaskOverdue } from './task-due';
import {
  normalizePhase,
  resolveEvidenceFlags,
  type TaskEvidenceFlags,
  taskRequiresEvidence,
} from './task-evidence';

@Injectable()
export class TasksService {
  constructor(
    private readonly emailService: EmailService,
    private readonly objectStorage: ObjectStorageService
  ) {}

  private get db() {
    return getDatabase();
  }

  private async assertStaffActor(userId: string) {
    const [member] = await this.db
      .select({ isActive: staff.isActive })
      .from(staff)
      .where(eq(staff.userId, userId))
      .limit(1);
    if (!member?.isActive) {
      throw new ForbiddenException('Access restricted to staff members only');
    }
  }

  private async isActiveStaff(userId: string): Promise<boolean> {
    const [member] = await this.db
      .select({ isActive: staff.isActive })
      .from(staff)
      .where(eq(staff.userId, userId))
      .limit(1);
    return Boolean(member?.isActive);
  }

  private assignmentValues(
    dto: {
      title: string;
      description?: string;
      type: CreateTaskDto['type'];
      priority?: 'high' | 'medium' | 'low';
      dueDate: Date;
      phase?: string | null;
    },
    flags: TaskEvidenceFlags,
    assignedBy: string,
    scholarId: string,
    assignmentGroupId: string | null
  ) {
    return {
      title: dto.title,
      description: dto.description,
      type: dto.type,
      priority: dto.priority || 'medium',
      dueDate: dto.dueDate,
      phase: dto.phase ?? null,
      assignmentGroupId,
      requiresResponse: flags.requiresResponse,
      requiresAttachment: flags.requiresAttachment,
      requiresLink: flags.requiresLink,
      scholarId,
      assignedBy,
      status: 'pending' as const,
    };
  }

  private withOverdue<T extends { dueDate: Date; status: string }>(row: T) {
    return { ...row, overdue: isTaskOverdue(row) };
  }

  private async notifyScholarsOfAssignment(
    scholarIds: string[],
    assignedBy: string,
    taskInfo: {
      title: string;
      description: string | null;
      type: string;
      priority: 'high' | 'medium' | 'low';
      dueDate: Date;
    }
  ): Promise<void> {
    if (scholarIds.length === 0) return;

    const recipients = await this.db
      .select({
        scholarId: scholars.id,
        email: users.email,
        name: users.name,
      })
      .from(scholars)
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(inArray(scholars.id, scholarIds));

    const [assigner] = await this.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, assignedBy))
      .limit(1);

    const assignerName = assigner?.name ?? null;

    await Promise.allSettled(
      recipients.map((recipient) =>
        this.emailService
          .sendTaskAssignmentNotification(
            recipient.email,
            recipient.name,
            taskInfo.title,
            taskInfo.description,
            taskInfo.type,
            taskInfo.priority,
            taskInfo.dueDate,
            assignerName
          )
          .catch((error) => {
            console.error(`Failed to send task assignment email to ${recipient.email}:`, error);
          })
      )
    );
  }

  private async assertTaskAttachments(
    scholarId: string,
    attachments: AttachmentDto[] | undefined,
    required: boolean
  ) {
    const list = attachments ?? [];
    if (required && list.length === 0) {
      throw new BadRequestException('At least one attachment is required for this task');
    }

    for (const attachment of list) {
      const fileKey = attachment.fileKey?.trim();
      const fileName = attachment.fileName?.trim();
      if (!fileKey || !fileName) {
        throw new BadRequestException('Each attachment must include fileKey and fileName');
      }
      if (fileKey.includes('..') || !fileKey.startsWith(`${scholarId}/`)) {
        throw new BadRequestException('Attachment file key is invalid');
      }
      const uploaded = await this.objectStorage.headObject(fileKey);
      if (!uploaded) {
        throw new BadRequestException('Uploaded file was not found. Please upload the file again.');
      }
    }
  }

  async createTask(createTaskDto: CreateTaskDto, assignedBy: string) {
    await this.assertStaffActor(assignedBy);
    const flags = resolveEvidenceFlags(createTaskDto.type, createTaskDto);
    const dueDate = new Date(createTaskDto.dueDate);
    const [task] = await this.db
      .insert(tasks)
      .values(
        this.assignmentValues(
          {
            title: createTaskDto.title,
            description: createTaskDto.description,
            type: createTaskDto.type,
            priority: createTaskDto.priority,
            dueDate,
            phase: normalizePhase(createTaskDto.phase),
          },
          flags,
          assignedBy,
          createTaskDto.scholarId,
          null
        )
      )
      .returning();

    void this.notifyScholarsOfAssignment([task.scholarId], assignedBy, {
      title: task.title,
      description: task.description,
      type: task.type,
      priority: task.priority,
      dueDate: task.dueDate,
    });

    return this.withOverdue(task);
  }

  async createBulkTasks(dto: CreateBulkTasksDto, assignedBy: string) {
    await this.assertStaffActor(assignedBy);

    let uniqueScholarIds: string[];
    if (dto.programStage === 'prep_year') {
      if (dto.scholarIds && dto.scholarIds.length > 0) {
        throw new BadRequestException('Do not send scholarIds when assigning to a program stage');
      }
      const cohort = await this.db
        .select({ id: scholars.id })
        .from(scholars)
        .where(and(eq(scholars.programStage, 'prep_year'), eq(scholars.status, 'active')));
      uniqueScholarIds = cohort.map((row) => row.id);
    } else {
      uniqueScholarIds = Array.from(new Set(dto.scholarIds ?? []));
    }

    if (uniqueScholarIds.length === 0) {
      throw new BadRequestException('No scholars to assign this task to');
    }

    const flags = resolveEvidenceFlags(dto.type, dto);
    const dueDate = new Date(dto.dueDate);
    const phase = normalizePhase(dto.phase);
    const assignmentGroupId = randomUUID();
    const rows = uniqueScholarIds.map((scholarId) =>
      this.assignmentValues(
        {
          title: dto.title,
          description: dto.description,
          type: dto.type,
          priority: dto.priority,
          dueDate,
          phase,
        },
        flags,
        assignedBy,
        scholarId,
        assignmentGroupId
      )
    );

    const inserted = await this.db.insert(tasks).values(rows).returning();

    void this.notifyScholarsOfAssignment(uniqueScholarIds, assignedBy, {
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type,
      priority: dto.priority || 'medium',
      dueDate,
    });

    return { created: inserted.length, tasks: inserted.map((task) => this.withOverdue(task)) };
  }

  async getTasksByUser(userId: string) {
    const [scholar] = await this.db.select().from(scholars).where(eq(scholars.userId, userId));

    if (!scholar) {
      return [];
    }

    return this.getTasksByScholar(scholar.id);
  }

  async getTasksByScholar(scholarId: string) {
    const rows = await this.db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        type: tasks.type,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        phase: tasks.phase,
        assignmentGroupId: tasks.assignmentGroupId,
        requiresResponse: tasks.requiresResponse,
        requiresAttachment: tasks.requiresAttachment,
        requiresLink: tasks.requiresLink,
        status: tasks.status,
        assignedBy: tasks.assignedBy,
        assignedByName: users.name,
        createdAt: tasks.createdAt,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedBy, users.id))
      .where(and(eq(tasks.scholarId, scholarId), isNull(tasks.deletedAt)))
      .orderBy(tasks.dueDate);

    return rows.map((row) => this.withOverdue(row));
  }

  async getCohort(query: GetTaskCohortQueryDto) {
    if (query.assignmentGroupId && query.columnKey) {
      throw new BadRequestException('Provide assignmentGroupId or columnKey, not both');
    }

    const prepScholars = await this.db
      .select({
        scholarId: scholars.id,
        name: users.name,
        email: users.email,
        status: scholars.status,
      })
      .from(scholars)
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(eq(scholars.programStage, 'prep_year'))
      .orderBy(asc(users.name));

    const scholarIds = prepScholars.map((row) => row.scholarId);
    const taskRows =
      scholarIds.length === 0
        ? []
        : await this.db
            .select({
              id: tasks.id,
              scholarId: tasks.scholarId,
              title: tasks.title,
              phase: tasks.phase,
              dueDate: tasks.dueDate,
              assignmentGroupId: tasks.assignmentGroupId,
              requiresResponse: tasks.requiresResponse,
              requiresAttachment: tasks.requiresAttachment,
              requiresLink: tasks.requiresLink,
              status: tasks.status,
              completedAt: tasks.completedAt,
              createdAt: tasks.createdAt,
              updatedAt: tasks.updatedAt,
            })
            .from(tasks)
            .where(and(inArray(tasks.scholarId, scholarIds), isNull(tasks.deletedAt)));

    return buildPrepTaskCohortMatrix(prepScholars, taskRows, {
      phase: query.phase,
      scholarId: query.scholarId,
      assignmentGroupId: query.assignmentGroupId,
      columnKey: query.columnKey,
      state: query.state,
    });
  }

  async getTitleSuggestions(query: string, assignedBy: string, limit = 8) {
    await this.assertStaffActor(assignedBy);
    const trimmed = (query || '').trim();
    const baseConditions = [isNull(tasks.deletedAt), eq(tasks.assignedBy, assignedBy)];
    if (trimmed.length > 0) {
      baseConditions.push(ilike(tasks.title, `${trimmed}%`));
    }

    return this.db
      .select({
        title: tasks.title,
        description: sql<string | null>`max(${tasks.description})`.as('description'),
        type: sql<string>`(array_agg(${tasks.type} ORDER BY ${tasks.createdAt} DESC))[1]`.as(
          'type'
        ),
        priority:
          sql<string>`(array_agg(${tasks.priority} ORDER BY ${tasks.createdAt} DESC))[1]`.as(
            'priority'
          ),
        phase: sql<
          string | null
        >`(array_agg(${tasks.phase} ORDER BY ${tasks.createdAt} DESC))[1]`.as('phase'),
        requiresResponse:
          sql<boolean>`(array_agg(${tasks.requiresResponse} ORDER BY ${tasks.createdAt} DESC))[1]`.as(
            'requires_response'
          ),
        requiresAttachment:
          sql<boolean>`(array_agg(${tasks.requiresAttachment} ORDER BY ${tasks.createdAt} DESC))[1]`.as(
            'requires_attachment'
          ),
        requiresLink:
          sql<boolean>`(array_agg(${tasks.requiresLink} ORDER BY ${tasks.createdAt} DESC))[1]`.as(
            'requires_link'
          ),
        lastUsedAt: sql<Date>`max(${tasks.createdAt})`.as('last_used_at'),
        useCount: sql<number>`count(*)::int`.as('use_count'),
      })
      .from(tasks)
      .where(and(...baseConditions))
      .groupBy(tasks.title)
      .orderBy(desc(sql`max(${tasks.createdAt})`))
      .limit(Math.max(1, Math.min(limit, 25)));
  }

  async softDeleteTask(taskId: string, deletedBy: string) {
    await this.assertStaffActor(deletedBy);
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, taskId));
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    if (task.deletedAt) {
      return { id: taskId, alreadyDeleted: true };
    }

    const [deleted] = await this.db
      .update(tasks)
      .set({ deletedAt: new Date(), deletedBy, updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();

    return { id: deleted.id, alreadyDeleted: false };
  }

  async updateTaskStatus(
    taskId: string,
    status: 'pending' | 'in_progress' | 'completed',
    actorId: string
  ) {
    const [existing] = await this.db.select().from(tasks).where(eq(tasks.id, taskId));
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Task not found');
    }

    const staffActor = await this.isActiveStaff(actorId);
    if (!staffActor) {
      const [scholar] = await this.db.select().from(scholars).where(eq(scholars.userId, actorId));
      if (!scholar || scholar.id !== existing.scholarId) {
        throw new ForbiddenException('Unauthorized to update this task');
      }
      if (status === 'completed') {
        throw new BadRequestException(
          'Complete this task with the required evidence via POST /api/tasks/:id/complete'
        );
      }
    }

    if (status === 'completed' && taskRequiresEvidence(existing)) {
      throw new BadRequestException(
        'This task requires evidence. Complete it with the required fields.'
      );
    }

    const updateData: {
      status: 'pending' | 'in_progress' | 'completed';
      updatedAt: Date;
      completedAt: Date | null;
    } = {
      status,
      updatedAt: new Date(),
      completedAt: status === 'completed' ? new Date() : null,
    };

    const task = await this.db.transaction(async (tx) => {
      if (existing.status === 'completed' && status !== 'completed') {
        const [response] = await tx
          .select({ id: taskResponses.id })
          .from(taskResponses)
          .where(eq(taskResponses.taskId, taskId))
          .limit(1);
        if (response) {
          await tx.delete(taskAttachments).where(eq(taskAttachments.taskResponseId, response.id));
          await tx.delete(taskResponses).where(eq(taskResponses.id, response.id));
        }
      }

      const [updated] = await tx
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, taskId))
        .returning();
      return updated;
    });

    return this.withOverdue(task);
  }

  async updateTask(taskId: string, updateTaskDto: UpdateTaskDto, actorId: string) {
    await this.assertStaffActor(actorId);

    const [existing] = await this.db.select().from(tasks).where(eq(tasks.id, taskId));
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Task not found');
    }

    const updateData: Record<string, unknown> = {
      ...updateTaskDto,
      updatedAt: new Date(),
    };

    if (updateTaskDto.dueDate) {
      updateData.dueDate = new Date(updateTaskDto.dueDate);
    }
    if (updateTaskDto.phase !== undefined) {
      updateData.phase = normalizePhase(updateTaskDto.phase);
    }

    const [task] = await this.db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    return this.withOverdue(task);
  }

  async completeTask(taskId: string, completeTaskDto: CompleteTaskDto, userId: string) {
    const [scholar] = await this.db.select().from(scholars).where(eq(scholars.userId, userId));

    if (!scholar) {
      throw new NotFoundException('Scholar not found');
    }

    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, taskId));

    if (!task || task.deletedAt) {
      throw new NotFoundException('Task not found');
    }

    if (task.scholarId !== scholar.id) {
      throw new ForbiddenException('Unauthorized to complete this task');
    }

    if (task.requiresResponse && !completeTaskDto.responseText?.trim()) {
      throw new BadRequestException('A written response is required for this task');
    }

    let linkUrl: string | null = null;
    if (completeTaskDto.linkUrl?.trim()) {
      linkUrl = assertHttpUrl(completeTaskDto.linkUrl);
    }
    if (task.requiresLink && !linkUrl) {
      throw new BadRequestException('A link is required for this task');
    }

    await this.assertTaskAttachments(
      scholar.id,
      completeTaskDto.attachmentIds,
      task.requiresAttachment
    );

    const result = await this.db.transaction(async (tx) => {
      const [updatedTask] = await tx
        .update(tasks)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      const existingResponse = await tx
        .select()
        .from(taskResponses)
        .where(eq(taskResponses.taskId, taskId));

      let responseId: string;

      if (existingResponse.length > 0) {
        const [updated] = await tx
          .update(taskResponses)
          .set({
            responseText: completeTaskDto.responseText,
            linkUrl,
            updatedAt: new Date(),
          })
          .where(eq(taskResponses.taskId, taskId))
          .returning();
        responseId = updated.id;
      } else {
        const [created] = await tx
          .insert(taskResponses)
          .values({
            taskId,
            responseText: completeTaskDto.responseText,
            linkUrl,
          })
          .returning();
        responseId = created.id;
      }

      const attachmentData = completeTaskDto.attachmentIds;

      if (attachmentData && attachmentData.length > 0) {
        await tx.delete(taskAttachments).where(eq(taskAttachments.taskResponseId, responseId));

        const attachments = attachmentData.map((attachment) => ({
          id: attachment.attachmentId || randomUUID(),
          taskResponseId: responseId,
          fileName: attachment.fileName.trim(),
          fileUrl: attachment.fileKey.trim(),
          fileSize: attachment.fileSize || '0',
          mimeType: attachment.mimeType || 'application/octet-stream',
        }));

        await tx.insert(taskAttachments).values(attachments);
      }

      return {
        task: this.withOverdue(updatedTask),
        responseId,
      };
    });

    return result;
  }

  async getTaskResponse(taskId: string) {
    const response = await this.db
      .select()
      .from(taskResponses)
      .where(eq(taskResponses.taskId, taskId));

    if (response.length === 0) {
      return null;
    }

    const attachments = await this.db
      .select()
      .from(taskAttachments)
      .where(eq(taskAttachments.taskResponseId, response[0].id));

    return {
      ...response[0],
      attachments,
    };
  }
}
