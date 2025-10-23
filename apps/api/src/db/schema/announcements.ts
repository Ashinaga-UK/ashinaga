import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { scholars } from './scholars';
import { users } from './users';

export const announcements = pgTable('announcements', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  archived: boolean('archived').notNull().default(false),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  archivedBy: text('archived_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const announcementFilters = pgTable('announcement_filters', {
  id: uuid('id').defaultRandom().primaryKey(),
  announcementId: uuid('announcement_id')
    .notNull()
    .references(() => announcements.id, { onDelete: 'cascade' }),
  filterType: text('filter_type').notNull(), // 'program', 'year', 'university', 'location', 'status'
  filterValue: text('filter_value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const announcementRecipients = pgTable('announcement_recipients', {
  id: uuid('id').defaultRandom().primaryKey(),
  announcementId: uuid('announcement_id')
    .notNull()
    .references(() => announcements.id, { onDelete: 'cascade' }),
  scholarId: uuid('scholar_id')
    .notNull()
    .references(() => scholars.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
