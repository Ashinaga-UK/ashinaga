import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { goals, goalComments } from '../db/schema/goals';
import { scholars } from '../db/schema/scholars';
import { users } from '../db/schema/users';
import { EmailService } from '../email/email.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  private db = getDatabase();

  constructor(private readonly emailService: EmailService) {}

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
    // Verify the goal exists and get goal with scholar info
    const [goalWithScholar] = await this.db
      .select({
        goal: goals,
        scholarUserId: scholars.userId,
        scholarName: users.name,
        scholarEmail: users.email,
      })
      .from(goals)
      .leftJoin(scholars, eq(goals.scholarId, scholars.id))
      .leftJoin(users, eq(scholars.userId, users.id))
      .where(eq(goals.id, goalId));

    if (!goalWithScholar) {
      throw new NotFoundException('Goal not found');
    }

    // Get commenter's info
    const [commenter] = await this.db.select().from(users).where(eq(users.id, userId));

    if (!commenter) {
      throw new NotFoundException('User not found');
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

    // Send email notifications
    await this.sendCommentNotifications(
      goalWithScholar.goal,
      goalWithScholar.scholarUserId,
      goalWithScholar.scholarName,
      goalWithScholar.scholarEmail,
      commenter,
      createCommentDto.comment
    );

    return commentWithUser;
  }

  private async sendCommentNotifications(
    goal: typeof goals.$inferSelect,
    scholarUserId: string,
    scholarName: string,
    scholarEmail: string,
    commenter: typeof users.$inferSelect,
    commentText: string
  ) {
    try {
      // If commenter is staff, notify the scholar
      if (commenter.userType === 'staff') {
        await this.emailService.sendGoalCommentEmail(
          scholarEmail,
          scholarName,
          commenter.name,
          'staff',
          goal.title,
          commentText,
          goal.id
        );
        console.log(`Goal comment notification sent to scholar: ${scholarEmail}`);
      }
      // If commenter is the scholar, notify staff members who have previously commented
      else if (commenter.id === scholarUserId) {
        // Get all staff members who have commented on this goal (excluding the scholar)
        const staffCommenters = await this.db
          .select({
            userId: goalComments.userId,
            userName: users.name,
            userEmail: users.email,
          })
          .from(goalComments)
          .leftJoin(users, eq(goalComments.userId, users.id))
          .where(eq(goalComments.goalId, goal.id))
          .groupBy(goalComments.userId, users.name, users.email);

        // Filter to only staff members (excluding the current commenter)
        const staffToNotify = await Promise.all(
          staffCommenters
            .filter((sc) => sc.userId !== commenter.id)
            .map(async (sc) => {
              const [user] = await this.db.select().from(users).where(eq(users.id, sc.userId));
              return user?.userType === 'staff' ? sc : null;
            })
        );

        // Send emails to all staff members
        const emailPromises = staffToNotify
          .filter((staff) => staff !== null)
          .map(async (staff) => {
            try {
              await this.emailService.sendGoalCommentEmail(
                staff.userEmail,
                staff.userName,
                commenter.name,
                'scholar',
                goal.title,
                commentText,
                goal.id
              );
              console.log(`Goal comment notification sent to staff: ${staff.userEmail}`);
            } catch (error) {
              console.error(
                `Failed to send goal comment notification to ${staff.userEmail}:`,
                error
              );
            }
          });

        await Promise.allSettled(emailPromises);
      }
    } catch (error) {
      console.error('Error sending comment notifications:', error);
      // Don't throw - comment was created successfully, email failure shouldn't break the flow
    }
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
