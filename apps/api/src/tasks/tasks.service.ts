import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { scholars } from '../db/schema/scholars';
import { tasks } from '../db/schema/tasks';
import { users } from '../db/schema/users';
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
}
