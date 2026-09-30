import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const annualReviewCopy = pgTable('annual_review_copy', {
  id: integer('id').primaryKey().default(1),
  version: integer('version').notNull().default(1),
  strings: jsonb('strings').$type<Record<string, string>>().notNull(),
  updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
