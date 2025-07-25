import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Example table - can be modified or removed as needed
export const examples = pgTable('examples', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Export types
export type Example = typeof examples.$inferSelect;
export type NewExample = typeof examples.$inferInsert;
