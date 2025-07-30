import { pgTable, text, timestamp, uuid, pgEnum } from 'drizzle-orm/pg-core';

export const scholarStatusEnum = pgEnum('scholar_status', ['active', 'inactive', 'on_hold']);

export const scholars = pgTable('scholars', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  program: text('program').notNull(),
  year: text('year').notNull(),
  university: text('university').notNull(),
  location: text('location'),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  status: scholarStatusEnum('status').notNull().default('active'),
  lastActivity: timestamp('last_activity', { withTimezone: true }),
  bio: text('bio'),
  avatar: text('avatar'),
  password: text('password').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
