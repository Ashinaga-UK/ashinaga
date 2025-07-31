import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { scholars } from './scholars';

export const goalCategoryEnum = pgEnum('goal_category', [
  'academic',
  'career',
  'leadership',
  'personal',
  'community',
]);

export const goalStatusEnum = pgEnum('goal_status', ['pending', 'in_progress', 'completed']);

export const goals = pgTable('goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  category: goalCategoryEnum('category').notNull(),
  targetDate: timestamp('target_date', { withTimezone: true }).notNull(),
  progress: integer('progress').notNull().default(0),
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
