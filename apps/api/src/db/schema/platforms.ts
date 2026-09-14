import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { scholars } from './scholars';
import { users } from './users';

export const platformSetupStatusEnum = pgEnum('platform_setup_status', ['yes', 'no', 'pending']);

export const platforms = pgTable('platforms', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  /** Candidate-facing signposting URL. Nullable so links can be added later without a rewrite. */
  signpostingUrl: text('signposting_url'),
  sortOrder: integer('sort_order').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const scholarPlatformSetups = pgTable(
  'scholar_platform_setups',
  {
    scholarId: uuid('scholar_id')
      .notNull()
      .references(() => scholars.id, { onDelete: 'cascade' }),
    platformId: uuid('platform_id')
      .notNull()
      .references(() => platforms.id, { onDelete: 'cascade' }),
    status: platformSetupStatusEnum('status').notNull().default('pending'),
    updatedBy: text('updated_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.scholarId, table.platformId] })]
);
