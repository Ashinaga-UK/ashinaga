import { date, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { scholars } from './scholars';
import { users } from './users';

export const coordinatorNotes = pgTable(
  'coordinator_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scholarId: uuid('scholar_id')
      .notNull()
      .references(() => scholars.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('coordinator_notes_scholar_id_created_at_idx').on(table.scholarId, table.createdAt),
  ]
);

export const coordinatorMeetingUpdates = pgTable(
  'coordinator_meeting_updates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scholarId: uuid('scholar_id')
      .notNull()
      .references(() => scholars.id, { onDelete: 'cascade' }),
    meetingDate: date('meeting_date', { mode: 'string' }).notNull(),
    notes: text('notes'),
    concern: text('concern'),
    furtherAction: text('further_action'),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('coordinator_meeting_updates_scholar_id_meeting_date_idx').on(
      table.scholarId,
      table.meetingDate
    ),
  ]
);
