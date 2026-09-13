import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { scholars } from '../db/schema';
import { activityTouchHours } from '../notifications/notification-config';

export async function touchScholarLastActivity(userId: string, now = new Date()): Promise<void> {
  const db = getDatabase();
  const [row] = await db
    .select({ id: scholars.id, lastActivity: scholars.lastActivity })
    .from(scholars)
    .where(eq(scholars.userId, userId))
    .limit(1);
  if (!row) return;

  const touchMs = activityTouchHours() * 60 * 60 * 1000;
  if (row.lastActivity && now.getTime() - row.lastActivity.getTime() < touchMs) {
    return;
  }

  await db
    .update(scholars)
    .set({ lastActivity: now, updatedAt: now })
    .where(eq(scholars.id, row.id));
}
