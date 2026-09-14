import {
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { resources } from './resources';
import { scholars } from './scholars';
import { users } from './users';

export const proposalStatusEnum = pgEnum('proposal_status', [
  'draft',
  'submitted',
  'changes_requested',
  'approved',
]);

export const proposalSubmissions = pgTable(
  'proposal_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scholarId: uuid('scholar_id')
      .notNull()
      .references(() => scholars.id, { onDelete: 'cascade' }),
    stepKey: text('step_key').notNull(),
    status: proposalStatusEnum('status').notNull().default('draft'),
    body: text('body'),
    /** Scholar-entered marker such as 1a, 1b, 1c within the locked approval step. */
    stageLabel: text('stage_label'),
    fileKey: text('file_key'),
    fileName: text('file_name'),
    fileMimeType: text('file_mime_type'),
    fileSizeBytes: integer('file_size_bytes'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('proposal_submissions_scholar_id_step_key_unique').on(
      table.scholarId,
      table.stepKey
    ),
    index('proposal_submissions_status_idx').on(table.status),
  ]
);

export const proposalComments = pgTable(
  'proposal_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => proposalSubmissions.id, { onDelete: 'cascade' }),
    authorId: text('author_id').references(() => users.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('proposal_comments_submission_id_created_at_idx').on(table.submissionId, table.createdAt),
  ]
);

export const proposalStepResources = pgTable(
  'proposal_step_resources',
  {
    stepKey: text('step_key').notNull(),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.stepKey, table.resourceId] })]
);
