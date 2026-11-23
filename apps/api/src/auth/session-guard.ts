import { APIError } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import * as schema from '../db/schema';

export const ACCOUNT_DEACTIVATED_CODE = 'ACCOUNT_DEACTIVATED';
export const ACCOUNT_DEACTIVATED_MESSAGE =
  'Your account has been deactivated. Please contact an administrator.';

/**
 * True only when a staff row exists and is inactive. A missing staff row is not
 * deactivated: invitation signup creates the session before the staff profile is inserted.
 */
export async function isDeactivatedStaff(userId: string): Promise<boolean> {
  const db = getDatabase();
  const [staffMember] = await db
    .select({ isActive: schema.staff.isActive })
    .from(schema.staff)
    .where(eq(schema.staff.userId, userId))
    .limit(1);

  return Boolean(staffMember && staffMember.isActive === false);
}

/**
 * Better Auth `databaseHooks.session.create.before` handler.
 *
 * Runs only after credentials were verified (or an OAuth/signup flow completed), so the
 * deactivated message is never shown to someone who does not know the password.
 *
 * AuthGuard and StaffGuard still enforce access on every API request.
 */
export async function assertSessionAllowed(session: { userId: string }): Promise<void> {
  if (await isDeactivatedStaff(session.userId)) {
    throw new APIError('FORBIDDEN', {
      code: ACCOUNT_DEACTIVATED_CODE,
      message: ACCOUNT_DEACTIVATED_MESSAGE,
    });
  }
}
