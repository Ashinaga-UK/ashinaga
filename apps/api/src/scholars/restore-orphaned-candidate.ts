import { eq, sql } from 'drizzle-orm';
import type { getDatabase } from '../db/connection';
import { scholars, users } from '../db/schema';

type Database = ReturnType<typeof getDatabase>;

export class OrphanedScholarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrphanedScholarError';
  }
}

export interface RestoredCandidate {
  scholarId: string;
  userId: string;
  email: string;
  name: string;
}

/**
 * Recreate a Prep Year profile for a scholar login whose profile was deleted.
 * The login stays, so they keep the password they already set and show up as a candidate.
 */
export async function restoreOrphanedCandidate(
  db: Database,
  email: string
): Promise<RestoredCandidate> {
  const emailLower = email.trim().toLowerCase();
  if (!emailLower) {
    throw new OrphanedScholarError('Email is required');
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      userType: users.userType,
    })
    .from(users)
    .where(sql`lower(trim(${users.email})) = ${emailLower}`)
    .limit(1);

  if (!user) {
    throw new OrphanedScholarError(`No account found for ${emailLower}`);
  }
  if (user.userType !== 'scholar') {
    throw new OrphanedScholarError(`${emailLower} is a ${user.userType} account, not a scholar`);
  }

  const [existing] = await db
    .select({ id: scholars.id, programStage: scholars.programStage })
    .from(scholars)
    .where(eq(scholars.userId, user.id))
    .limit(1);

  if (existing) {
    throw new OrphanedScholarError(
      `${emailLower} still has a profile (${existing.programStage}). Change Program stage on that profile instead of restoring it.`
    );
  }

  const [created] = await db
    .insert(scholars)
    .values({
      userId: user.id,
      status: 'active',
      program: 'TBD',
      year: 'TBD',
      university: 'TBD',
      startDate: new Date(),
      programStage: 'prep_year',
    })
    .returning({ id: scholars.id });

  if (!created) {
    throw new OrphanedScholarError(`Failed to restore a candidate profile for ${emailLower}`);
  }

  return {
    scholarId: created.id,
    userId: user.id,
    email: user.email,
    name: user.name,
  };
}
