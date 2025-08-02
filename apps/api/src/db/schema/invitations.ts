import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users, userTypeEnum } from './users';

export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'expired',
  'cancelled',
]);

export const invitations = pgTable('invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(), // Email to invite
  userType: userTypeEnum('user_type').notNull(), // 'staff' or 'scholar'
  invitedBy: text('invited_by')
    .notNull()
    .references(() => users.id),
  status: invitationStatusEnum('status').notNull().default('pending'),
  token: text('token').notNull().unique(), // Secure random token for invitation link

  // Optional pre-filled data for scholars
  scholarData: text('scholar_data'), // JSON string with pre-filled info like program, year, etc.

  // Invitation metadata
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  userId: text('user_id').references(() => users.id), // Link to user once accepted

  // Email tracking
  sentAt: timestamp('sent_at', { withTimezone: true }),
  lastResentAt: timestamp('last_resent_at', { withTimezone: true }),
  resentCount: text('resent_count').notNull().default('0'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
