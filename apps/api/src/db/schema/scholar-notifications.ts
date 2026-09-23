import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const scholarNotifications = pgTable(
  'scholar_notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recipientUserId: text('recipient_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    href: text('href').notNull(),
    dedupeSuffix: text('dedupe_suffix').notNull().default(''),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('scholar_notifications_recipient_created_idx').on(
      table.recipientUserId,
      table.createdAt
    ),
    index('scholar_notifications_recipient_unread_idx')
      .on(table.recipientUserId)
      .where(sql`${table.readAt} IS NULL`),
    uniqueIndex('scholar_notifications_recipient_kind_entity_dedupe_unique').on(
      table.recipientUserId,
      table.kind,
      table.entityId,
      table.dedupeSuffix
    ),
  ]
);
