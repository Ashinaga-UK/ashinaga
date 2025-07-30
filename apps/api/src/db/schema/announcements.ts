import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';
import { scholars } from './scholars';

export const announcements = pgTable('announcements', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
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
