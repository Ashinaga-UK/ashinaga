import { Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { goals } from '../db/schema/goals';
import { scholars } from '../db/schema/scholars';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  private db = getDatabase();

  async getGoalsByUser(userId: string) {
    // First get the scholar record for this user
    const [scholar] = await this.db.select().from(scholars).where(eq(scholars.userId, userId));

    if (!scholar) {
      throw new NotFoundException('Scholar not found for this user');
    }

    // Get all goals for this scholar
    const userGoals = await this.db
      .select()
      .from(goals)
      .where(eq(goals.scholarId, scholar.id))
      .orderBy(desc(goals.createdAt));

    return userGoals;
  }

  async createGoal(userId: string, createGoalDto: CreateGoalDto) {
    // First get the scholar record for this user
    const [scholar] = await this.db.select().from(scholars).where(eq(scholars.userId, userId));

    if (!scholar) {
      throw new NotFoundException('Scholar not found for this user');
    }

    // Create the goal
    const [goal] = await this.db
      .insert(goals)
      .values({
        ...createGoalDto,
        targetDate: new Date(createGoalDto.targetDate),
        scholarId: scholar.id,
        progress: createGoalDto.progress || 0,
        status: createGoalDto.status || 'pending',
      })
      .returning();

    return goal;
  }

  async updateGoal(userId: string, goalId: string, updateGoalDto: UpdateGoalDto) {
    // First get the scholar record for this user
    const [scholar] = await this.db.select().from(scholars).where(eq(scholars.userId, userId));

    if (!scholar) {
      throw new NotFoundException('Scholar not found for this user');
    }

    // Check if the goal exists and belongs to this scholar
    const [existingGoal] = await this.db.select().from(goals).where(eq(goals.id, goalId));

    if (!existingGoal || existingGoal.scholarId !== scholar.id) {
      throw new NotFoundException('Goal not found or does not belong to this scholar');
    }

    // Prepare update data
    const updateData: any = {
      ...updateGoalDto,
      updatedAt: new Date(),
    };

    // Convert targetDate if provided
    if (updateGoalDto.targetDate) {
      updateData.targetDate = new Date(updateGoalDto.targetDate);
    }

    // Set completedAt if status is completed
    if (updateGoalDto.status === 'completed') {
      updateData.completedAt = new Date();
    }

    // Update the goal
    const [updatedGoal] = await this.db
      .update(goals)
      .set(updateData)
      .where(eq(goals.id, goalId))
      .returning();

    return updatedGoal;
  }

  async deleteGoal(userId: string, goalId: string) {
    // First get the scholar record for this user
    const [scholar] = await this.db.select().from(scholars).where(eq(scholars.userId, userId));

    if (!scholar) {
      throw new NotFoundException('Scholar not found for this user');
    }

    // Check if the goal exists and belongs to this scholar
    const [existingGoal] = await this.db.select().from(goals).where(eq(goals.id, goalId));

    if (!existingGoal || existingGoal.scholarId !== scholar.id) {
      throw new NotFoundException('Goal not found or does not belong to this scholar');
    }

    // Delete the goal
    await this.db.delete(goals).where(eq(goals.id, goalId));

    return { message: 'Goal deleted successfully' };
  }

  async getGoalById(userId: string, goalId: string) {
    // First get the scholar record for this user
    const [scholar] = await this.db.select().from(scholars).where(eq(scholars.userId, userId));

    if (!scholar) {
      throw new NotFoundException('Scholar not found for this user');
    }

    // Get the goal
    const [goal] = await this.db.select().from(goals).where(eq(goals.id, goalId));

    if (!goal || goal.scholarId !== scholar.id) {
      throw new NotFoundException('Goal not found or does not belong to this scholar');
    }

    return goal;
  }
}
