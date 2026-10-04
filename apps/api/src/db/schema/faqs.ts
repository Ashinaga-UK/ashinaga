import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { programStageEnum } from './scholars';
import { users } from './users';

export const faqs = pgTable('faqs', {
  id: uuid('id').defaultRandom().primaryKey(),
  audience: programStageEnum('audience').notNull(),
  category: text('category'),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  updatedBy: text('updated_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
