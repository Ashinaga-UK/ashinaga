import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tasks } from './tasks';

export const taskResponses = pgTable('task_responses', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id)
    .unique(), // One response per task
  responseText: text('response_text'), // Scholar's notes/response
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const taskAttachments = pgTable('task_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskResponseId: uuid('task_response_id')
    .notNull()
    .references(() => taskResponses.id),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: text('file_size').notNull(),
  mimeType: text('mime_type').notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
});
