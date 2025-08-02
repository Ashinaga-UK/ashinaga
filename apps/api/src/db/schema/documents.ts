import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { scholars } from './scholars';
import { users } from './users';

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  scholarId: uuid('scholar_id')
    .notNull()
    .references(() => scholars.id),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'transcript', 'certificate', 'report', etc.
  mimeType: text('mime_type').notNull(),
  size: text('size').notNull(),
  url: text('url').notNull(),
  uploadedBy: text('uploaded_by')
    .notNull()
    .references(() => users.id),
  uploadDate: timestamp('upload_date', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// List of blocked file extensions for security
export const BLOCKED_FILE_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.scr',
  '.vbs',
  '.vbe',
  '.js',
  '.jse',
  '.ws',
  '.wsf',
  '.wsc',
  '.wsh',
  '.ps1',
  '.ps1xml',
  '.ps2',
  '.ps2xml',
  '.psc1',
  '.psc2',
  '.msh',
  '.msh1',
  '.msh2',
  '.mshxml',
  '.msh1xml',
  '.msh2xml',
  '.scf',
  '.lnk',
  '.inf',
  '.reg',
  '.app',
  '.jar',
  '.msi',
  '.msp',
  '.gadget',
  '.hta',
  '.cpl',
  '.msc',
  '.pif',
] as const;

// Allowed mime types for documents
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;
