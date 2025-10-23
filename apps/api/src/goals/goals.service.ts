import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { goals, goalComments } from '../db/schema/goals';
import { scholars } from '../db/schema/scholars';
import { users } from '../db/schema/users';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

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

  // Comment methods
  async getComments(goalId: string) {
    // Get all comments for this goal with user info
    const comments = await this.db
      .select({
        id: goalComments.id,
        goalId: goalComments.goalId,
        userId: goalComments.userId,
        comment: goalComments.comment,
        createdAt: goalComments.createdAt,
        updatedAt: goalComments.updatedAt,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
        userType: users.userType,
      })
      .from(goalComments)
      .leftJoin(users, eq(goalComments.userId, users.id))
      .where(eq(goalComments.goalId, goalId))
      .orderBy(goalComments.createdAt);

    return comments;
  }

  async createComment(userId: string, goalId: string, createCommentDto: CreateCommentDto) {
    // Verify the goal exists
    const [goal] = await this.db.select().from(goals).where(eq(goals.id, goalId));

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Create the comment
    const [comment] = await this.db
      .insert(goalComments)
      .values({
        goalId,
        userId,
        comment: createCommentDto.comment,
      })
      .returning();

    // Get comment with user info
    const [commentWithUser] = await this.db
      .select({
        id: goalComments.id,
        goalId: goalComments.goalId,
        userId: goalComments.userId,
        comment: goalComments.comment,
        createdAt: goalComments.createdAt,
        updatedAt: goalComments.updatedAt,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
        userType: users.userType,
      })
      .from(goalComments)
      .leftJoin(users, eq(goalComments.userId, users.id))
      .where(eq(goalComments.id, comment.id));

    return commentWithUser;
  }

  async updateComment(userId: string, commentId: string, updateCommentDto: UpdateCommentDto) {
    // Check if the comment exists and belongs to this user
    const [existingComment] = await this.db
      .select()
      .from(goalComments)
      .where(eq(goalComments.id, commentId));

    if (!existingComment) {
      throw new NotFoundException('Comment not found');
    }

    if (existingComment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // Update the comment
    const [updatedComment] = await this.db
      .update(goalComments)
      .set({
        comment: updateCommentDto.comment,
        updatedAt: new Date(),
      })
      .where(eq(goalComments.id, commentId))
      .returning();

    // Get comment with user info
    const [commentWithUser] = await this.db
      .select({
        id: goalComments.id,
        goalId: goalComments.goalId,
        userId: goalComments.userId,
        comment: goalComments.comment,
        createdAt: goalComments.createdAt,
        updatedAt: goalComments.updatedAt,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
        userType: users.userType,
      })
      .from(goalComments)
      .leftJoin(users, eq(goalComments.userId, users.id))
      .where(eq(goalComments.id, updatedComment.id));

    return commentWithUser;
  }

  async deleteComment(userId: string, commentId: string) {
    // Check if the comment exists and belongs to this user
    const [existingComment] = await this.db
      .select()
      .from(goalComments)
      .where(eq(goalComments.id, commentId));

    if (!existingComment) {
      throw new NotFoundException('Comment not found');
    }

    if (existingComment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Delete the comment
    await this.db.delete(goalComments).where(eq(goalComments.id, commentId));

    return { message: 'Comment deleted successfully' };
  }
}
