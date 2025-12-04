import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { scholars } from './scholars';
import { users } from './users';

export const goalCategoryEnum = pgEnum('goal_category', [
  'academic_development',
  'personal_development',
  'professional_development',
]);

export const goalStatusEnum = pgEnum('goal_status', ['pending', 'in_progress', 'completed']);

export const goalTermEnum = pgEnum('goal_term', ['term_1', 'term_2', 'term_3']);

export const goals = pgTable('goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  category: goalCategoryEnum('category').notNull(),
  term: goalTermEnum('term'), // Term 1, Term 2, Term 3
  targetDate: timestamp('target_date', { withTimezone: true }).notNull(),
  relatedSkills: text('related_skills'), // LDF skills & qualities
  actionPlan: text('action_plan'), // How skills help achieve goal, habits, routines, activities, milestones
  reviewNotes: text('review_notes'), // Self-reflection: How is it going? On track?
  completionScale: integer('completion_scale').notNull().default(1), // 1-10 scale instead of 0-100%
  progress: integer('progress').notNull().default(0), // Keep for backwards compatibility
  status: goalStatusEnum('status').notNull().default('pending'),
  scholarId: uuid('scholar_id')
    .notNull()
    .references(() => scholars.id),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const milestones = pgTable('milestones', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  goalId: uuid('goal_id')
    .notNull()
    .references(() => goals.id, { onDelete: 'cascade' }),
  completed: text('completed').notNull().default('false'),
  completedDate: timestamp('completed_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const goalComments = pgTable('goal_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  goalId: uuid('goal_id')
    .notNull()
    .references(() => goals.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
