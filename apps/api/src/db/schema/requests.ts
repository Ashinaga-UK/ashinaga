import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { scholars } from './scholars';
import { users } from './users';

export const requestTypeEnum = pgEnum('request_type', [
  'extenuating_circumstances',
  'summer_funding_request',
  'summer_funding_report',
  'requirement_submission',
]);

export const requestStatusEnum = pgEnum('request_status', [
  'pending',
  'approved',
  'rejected',
  'reviewed',
  'commented',
]);

export const requestPriorityEnum = pgEnum('request_priority', ['high', 'medium', 'low']);

export const requests = pgTable('requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  scholarId: uuid('scholar_id')
    .notNull()
    .references(() => scholars.id),
  type: requestTypeEnum('type').notNull(),
  description: text('description').notNull(),
  formData: text('form_data'), // JSON string for type-specific form fields
  priority: requestPriorityEnum('priority').notNull().default('medium'),
  status: requestStatusEnum('status').notNull().default('pending'),
  submittedDate: timestamp('submitted_date', { withTimezone: true }).defaultNow().notNull(),
  assignedTo: text('assigned_to').references(() => users.id), // Staff member assigned to handle request
  reviewedBy: text('reviewed_by').references(() => users.id),
  reviewComment: text('review_comment'),
  reviewDate: timestamp('review_date', { withTimezone: true }),
  archived: boolean('archived').notNull().default(false),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  archivedBy: text('archived_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const requestAttachments = pgTable('request_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  requestId: uuid('request_id')
    .notNull()
    .references(() => requests.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  size: text('size').notNull(),
  url: text('url').notNull(),
  mimeType: text('mime_type').notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
});

export const requestAuditLogs = pgTable('request_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  requestId: uuid('request_id')
    .notNull()
    .references(() => requests.id, { onDelete: 'cascade' }),
  action: text('action').notNull(), // 'created', 'status_changed', 'comment_added', 'attachment_added'
  performedBy: text('performed_by')
    .notNull()
    .references(() => users.id),
  previousStatus: requestStatusEnum('previous_status'),
  newStatus: requestStatusEnum('new_status'),
  comment: text('comment'),
  metadata: text('metadata'), // Additional data as needed
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
