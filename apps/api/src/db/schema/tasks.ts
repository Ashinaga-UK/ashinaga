import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { scholars } from './scholars';
import { users } from './users';

export const taskTypeEnum = pgEnum('task_type', [
  'document_upload',
  'form_completion',
  'meeting_attendance',
  'goal_update',
  'feedback_submission',
  'other',
]);

export const taskPriorityEnum = pgEnum('task_priority', ['high', 'medium', 'low']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed']);

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  type: taskTypeEnum('type').notNull(),
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  status: taskStatusEnum('status').notNull().default('pending'),
  scholarId: uuid('scholar_id')
    .notNull()
    .references(() => scholars.id),
  assignedBy: uuid('assigned_by')
    .notNull()
    .references(() => users.id),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
