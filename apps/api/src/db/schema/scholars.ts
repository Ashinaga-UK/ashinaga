import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const scholarStatusEnum = pgEnum('scholar_status', ['active', 'inactive', 'on_hold']);

export const scholars = pgTable('scholars', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  phone: text('phone'),
  program: text('program').notNull(),
  year: text('year').notNull(),
  university: text('university').notNull(),
  location: text('location'),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  status: scholarStatusEnum('status').notNull().default('active'),
  lastActivity: timestamp('last_activity', { withTimezone: true }),
  bio: text('bio'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
