import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const resourceStatusEnum = pgEnum('resource_status', ['draft', 'live']);
export const resourceTypeEnum = pgEnum('resource_type', ['Guide', 'Handbook', 'Template']);
export const resourceCategories = [
  'Guides and Handbooks',
  'Workbooks',
  'Forms and Templates',
  'How-to Videos',
  'Presentations',
  'Other',
] as const;
export type ResourceCategory = (typeof resourceCategories)[number];
export const resourceSourceTypeEnum = pgEnum('resource_source_type', ['url', 'file']);

export const resources = pgTable(
  'resources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    type: resourceTypeEnum('type').notNull(),
    category: text('category').$type<ResourceCategory>().notNull(),
    proposalContext: boolean('proposal_context').notNull().default(false),
    sourceType: resourceSourceTypeEnum('source_type').notNull().default('url'),
    url: text('url'),
    fileKey: text('file_key'),
    fileName: text('file_name'),
    fileMimeType: text('file_mime_type'),
    fileSizeBytes: integer('file_size_bytes'),
    status: resourceStatusEnum('status').notNull().default('draft'),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),
    updatedBy: text('updated_by').references(() => users.id),
    archived: boolean('archived').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'resources_category_check',
      sql`${table.category} IN ('Guides and Handbooks', 'Workbooks', 'Forms and Templates', 'How-to Videos', 'Presentations', 'Other')`
    ),
    check(
      'resources_source_columns_check',
      sql`(
        (${table.sourceType} = 'url' AND ${table.url} IS NOT NULL AND ${table.fileKey} IS NULL)
        OR
        (${table.sourceType} = 'file' AND ${table.fileKey} IS NOT NULL AND ${table.url} IS NULL)
      )`
    ),
  ]
);

export const resourceCategoryReviews = pgTable(
  'resource_category_reviews',
  {
    resourceId: uuid('resource_id')
      .primaryKey()
      .references(() => resources.id, { onDelete: 'cascade' }),
    resourceTitle: text('resource_title').notNull(),
    legacyCategory: text('legacy_category').notNull(),
    finalCategory: text('final_category').$type<ResourceCategory>(),
    reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'resource_category_reviews_final_category_check',
      sql`${table.finalCategory} IS NULL OR ${table.finalCategory} IN ('Guides and Handbooks', 'Workbooks', 'Forms and Templates', 'How-to Videos', 'Presentations', 'Other')`
    ),
  ]
);

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
