import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { scholars } from '../db/schema/scholars';
import { taskAttachments, taskResponses } from '../db/schema/task-responses';
import { tasks } from '../db/schema/tasks';
import { users } from '../db/schema/users';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  private db = getDatabase();

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

    return task;
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
      .where(eq(tasks.scholarId, scholarId))
      .orderBy(tasks.dueDate);

    return results;
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
      let attachmentIds = completeTaskDto.attachmentIds;

      // Handle case where attachmentIds might be sent as an object
      if (attachmentIds && typeof attachmentIds === 'object' && !Array.isArray(attachmentIds)) {
        attachmentIds = Object.values(attachmentIds);
      }

      if (attachmentIds && attachmentIds.length > 0) {
        // Delete existing attachments for this response
        await tx.delete(taskAttachments).where(eq(taskAttachments.taskResponseId, responseId));

        // For task attachments, we store the file IDs and S3 keys
        // The files were already uploaded to S3 during the upload process
        const attachments = attachmentIds.map((fileId: string) => ({
          taskResponseId: responseId,
          fileName: `attachment-${fileId}`, // Filename will be updated by frontend if needed
          fileUrl: fileId, // Store the file ID, we can get the S3 key later if needed
          fileSize: '0', // Size already tracked in S3
          mimeType: 'application/octet-stream', // Type already tracked in S3
        }));

        await tx.insert(taskAttachments).values(attachments);
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
