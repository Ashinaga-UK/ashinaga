import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { scholars } from '../db/schema/scholars';
import { taskAttachments, taskResponses } from '../db/schema/task-responses';
import { tasks } from '../db/schema/tasks';
import { users } from '../db/schema/users';
import { EmailService } from '../email/email.service';
import { AttachmentDto, CompleteTaskDto } from './dto/complete-task.dto';
import { CreateBulkTasksDto } from './dto/create-bulk-tasks.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  private db = getDatabase();

  constructor(private readonly emailService: EmailService) {}

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

  async createTask(createTaskDto: CreateTaskDto, assignedBy: string) {
    const [task] = await this.db
      .insert(tasks)
      .values({
        title: createTaskDto.title,
        description: createTaskDto.description,
        type: createTaskDto.type,
        priority: createTaskDto.priority || 'medium',
        dueDate: new Date(createTaskDto.dueDate),
        scholarId: createTaskDto.scholarId,
        assignedBy,
        status: 'pending',
      })
      .returning();

    void this.notifyScholarsOfAssignment([task.scholarId], assignedBy, {
      title: task.title,
      description: task.description,
      type: task.type,
      priority: task.priority,
      dueDate: task.dueDate,
    });

    return task;
  }

  async createBulkTasks(dto: CreateBulkTasksDto, assignedBy: string) {
    const uniqueScholarIds = Array.from(new Set(dto.scholarIds));
    const dueDate = new Date(dto.dueDate);
    const rows = uniqueScholarIds.map((scholarId) => ({
      title: dto.title,
      description: dto.description,
      type: dto.type,
      priority: dto.priority || 'medium',
      dueDate,
      scholarId,
      assignedBy,
      status: 'pending' as const,
    }));

    const inserted = await this.db.insert(tasks).values(rows).returning();

    void this.notifyScholarsOfAssignment(uniqueScholarIds, assignedBy, {
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type,
      priority: dto.priority || 'medium',
      dueDate,
    });

    return { created: inserted.length, tasks: inserted };
  }

  async getTasksByUser(userId: string) {
    // First get the scholar record for this user
    const [scholar] = await this.db.select().from(scholars).where(eq(scholars.userId, userId));

    if (!scholar) {
      return [];
    }

    return this.getTasksByScholar(scholar.id);
  }

  async getTasksByScholar(scholarId: string) {
    const results = await this.db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        type: tasks.type,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
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

    return results;
  }

  async getTitleSuggestions(query: string, assignedBy: string, limit = 8) {
    const trimmed = (query || '').trim();
    const baseConditions = [isNull(tasks.deletedAt), eq(tasks.assignedBy, assignedBy)];
    if (trimmed.length > 0) {
      baseConditions.push(ilike(tasks.title, `${trimmed}%`));
    }

    const rows = await this.db
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
        lastUsedAt: sql<Date>`max(${tasks.createdAt})`.as('last_used_at'),
        useCount: sql<number>`count(*)::int`.as('use_count'),
      })
      .from(tasks)
      .where(and(...baseConditions))
      .groupBy(tasks.title)
      .orderBy(desc(sql`max(${tasks.createdAt})`))
      .limit(Math.max(1, Math.min(limit, 25)));

    return rows;
  }

  async softDeleteTask(taskId: string, deletedBy: string) {
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

  async updateTaskStatus(taskId: string, status: 'pending' | 'in_progress' | 'completed') {
    const updateData: any = { status, updatedAt: new Date() };
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const [task] = await this.db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    return task;
  }

  async updateTask(taskId: string, updateTaskDto: UpdateTaskDto) {
    const updateData: any = {
      ...updateTaskDto,
      updatedAt: new Date(),
    };

    // Convert dueDate string to Date object if provided
    if (updateTaskDto.dueDate) {
      updateData.dueDate = new Date(updateTaskDto.dueDate);
    }

    const [task] = await this.db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    return task;
  }

  async completeTask(taskId: string, completeTaskDto: CompleteTaskDto, userId: string) {
    // First verify the user owns this task
    const [scholar] = await this.db.select().from(scholars).where(eq(scholars.userId, userId));

    if (!scholar) {
      throw new Error('Scholar not found');
    }

    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, taskId));

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.scholarId !== scholar.id) {
      throw new Error('Unauthorized to complete this task');
    }

    // Start a transaction to update task and create response
    const result = await this.db.transaction(async (tx) => {
      // Update task status to completed
      const [updatedTask] = await tx
        .update(tasks)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      // Create or update task response
      const existingResponse = await tx
        .select()
        .from(taskResponses)
        .where(eq(taskResponses.taskId, taskId));

      let responseId: string;

      if (existingResponse.length > 0) {
        // Update existing response
        const [updated] = await tx
          .update(taskResponses)
          .set({
            responseText: completeTaskDto.responseText,
            updatedAt: new Date(),
          })
          .where(eq(taskResponses.taskId, taskId))
          .returning();
        responseId = updated.id;
      } else {
        // Create new response
        const [created] = await tx
          .insert(taskResponses)
          .values({
            taskId,
            responseText: completeTaskDto.responseText,
          })
          .returning();
        responseId = created.id;
      }

      // Handle attachments if provided
      const attachmentData = completeTaskDto.attachmentIds;

      // The frontend sends an array of attachment objects with metadata
      if (attachmentData && attachmentData.length > 0) {
        // Delete existing attachments for this response
        await tx.delete(taskAttachments).where(eq(taskAttachments.taskResponseId, responseId));

        // Import uuid for generating IDs
        const { v4: uuidv4 } = await import('uuid');

        // Create task attachment records with the S3 keys
        const attachments = attachmentData.map((attachment: string | AttachmentDto) => {
          // Handle both string IDs and objects with metadata
          if (typeof attachment === 'string') {
            // Legacy format - just the ID
            return {
              id: uuidv4(), // Generate a unique ID for the attachment
              taskResponseId: responseId,
              fileName: `attachment-${attachment}`,
              fileUrl: attachment, // This should be the S3 key
              fileSize: '0',
              mimeType: 'application/octet-stream',
            };
          } else {
            // New format with metadata
            return {
              id: attachment.attachmentId || uuidv4(), // Use the attachment ID or generate one
              taskResponseId: responseId,
              fileName: attachment.fileName || `attachment-${attachment.attachmentId}`,
              fileUrl: attachment.fileKey || attachment.attachmentId, // Use S3 key if available
              fileSize: attachment.fileSize || '0',
              mimeType: attachment.mimeType || 'application/octet-stream',
            };
          }
        });

        if (attachments.length > 0) {
          await tx.insert(taskAttachments).values(attachments);
        }
      }

      return {
        task: updatedTask,
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
