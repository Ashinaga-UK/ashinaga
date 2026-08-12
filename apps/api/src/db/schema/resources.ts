import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const resourceStatusEnum = pgEnum('resource_status', ['draft', 'live']);
export const resourceTypeEnum = pgEnum('resource_type', ['Guide', 'Handbook', 'Template']);
export const resourceCategoryEnum = pgEnum('resource_category', [
  'LDF',
  'Handbook',
  'Proposal',
  'Support',
]);

export const resources = pgTable('resources', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  type: resourceTypeEnum('type').notNull(),
  category: resourceCategoryEnum('category').notNull(),
  url: text('url').notNull(),
  status: resourceStatusEnum('status').notNull().default('draft'),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  updatedBy: text('updated_by').references(() => users.id),
  archived: boolean('archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const resourceFilters = pgTable(
  'resource_filters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    filterType: text('filter_type').notNull(),
    filterValue: text('filter_value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('resource_filters_resource_id_idx').on(table.resourceId)]
);
