import { boolean, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { scholars } from './scholars';
import { users } from './users';

export const requiredDocumentTypes = pgTable('required_document_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  label: text('label').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const requiredDocumentFiles = pgTable(
  'required_document_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scholarId: uuid('scholar_id')
      .notNull()
      .references(() => scholars.id, { onDelete: 'cascade' }),
    typeId: uuid('type_id')
      .notNull()
      .references(() => requiredDocumentTypes.id),
    fileKey: text('file_key').notNull(),
    fileName: text('file_name').notNull(),
    fileMimeType: text('file_mime_type').notNull(),
    fileSizeBytes: integer('file_size_bytes').notNull(),
    uploadedBy: text('uploaded_by')
      .notNull()
      .references(() => users.id),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('required_document_files_scholar_type_unique').on(table.scholarId, table.typeId),
  ]
);
