import { APIError } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import * as schema from '../db/schema';

export const ACCOUNT_DEACTIVATED_CODE = 'ACCOUNT_DEACTIVATED';
export const ACCOUNT_DEACTIVATED_MESSAGE =
  'Your account has been deactivated. Please contact an administrator.';

/**
 * Better Auth `databaseHooks.session.create.before` handler.
 *
 * Runs only after credentials were verified (or an OAuth/signup flow completed), so the
 * deactivated message is never shown to someone who does not know the password.
 *
 * A missing staff row is allowed: invitation signup creates the session before the
 * staff profile is inserted. StaffGuard still enforces access on every API request.
 */
export async function assertSessionAllowed(session: { userId: string }): Promise<void> {
  const db = getDatabase();
  const [staffMember] = await db
    .select({ isActive: schema.staff.isActive })
    .from(schema.staff)
    .where(eq(schema.staff.userId, session.userId))
    .limit(1);

  if (staffMember && staffMember.isActive === false) {
    throw new APIError('FORBIDDEN', {
      code: ACCOUNT_DEACTIVATED_CODE,
      message: ACCOUNT_DEACTIVATED_MESSAGE,
    });
  }
}
