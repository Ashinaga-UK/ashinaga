import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  invitations,
  requestAssignees,
  requestAttachments,
  requestAuditLogs,
  requests,
  scholars,
  staff,
  tasks,
  users,
} from '../../../src/db/schema';

export interface TestDb {
  db: NodePgDatabase;
  pool: Pool;
  close: () => Promise<void>;
}

export function getTestPool(): TestDb {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5433,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'postgres',
    max: 4,
  });
  const db = drizzle(pool);
  return {
    db,
    pool,
    close: () => pool.end(),
  };
}

export interface SeededStaff {
  userId: string;
  staffId: string;
  email: string;
}

export interface SeededScholar {
  userId: string;
  scholarId: string;
  email: string;
}

let seq = 0;
function nextTag(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}-${Math.floor(Math.random() * 100000)}`;
}

export async function seedStaffUser(
  db: NodePgDatabase,
  opts: { isSuperAdmin?: boolean; name?: string } = {}
): Promise<SeededStaff> {
  const id = nextTag('itest-staff-user');
  const email = `${id}@example.com`;

  const [user] = await db
    .insert(users)
    .values({
      id,
      name: opts.name ?? 'Integration Staff',
      email,
      emailVerified: true,
      userType: 'staff',
    })
    .returning({ id: users.id });

  if (!user) throw new Error('Failed to seed staff user');

  const [row] = await db
    .insert(staff)
    .values({
      userId: user.id,
      role: 'admin',
      isActive: true,
      isSuperAdmin: opts.isSuperAdmin ?? false,
    })
    .returning({ id: staff.id });

  if (!row) throw new Error('Failed to seed staff record');

  return { userId: user.id, staffId: row.id, email };
}

export async function seedScholarUser(
  db: NodePgDatabase,
  opts: { name?: string; program?: string; year?: string; university?: string } = {}
): Promise<SeededScholar> {
  const id = nextTag('itest-scholar-user');
  const email = `${id}@example.com`;

  const [user] = await db
    .insert(users)
    .values({
      id,
      name: opts.name ?? 'Integration Scholar',
      email,
      emailVerified: true,
      userType: 'scholar',
    })
    .returning({ id: users.id });

  if (!user) throw new Error('Failed to seed scholar user');

  const [row] = await db
    .insert(scholars)
    .values({
      userId: user.id,
      program: opts.program ?? 'Integration Program',
      year: opts.year ?? 'Year 1',
      university: opts.university ?? 'Test University',
      startDate: new Date('2024-09-01'),
      status: 'active',
    })
    .returning({ id: scholars.id });

  if (!row) throw new Error('Failed to seed scholar record');

  return { userId: user.id, scholarId: row.id, email };
}

/**
 * Best-effort cleanup of test rows. Wraps everything so a failure on one
 * dependency doesn't leave the rest of the cleanup undone.
 */
export async function cleanupSeeded(
  db: NodePgDatabase,
  ids: { userIds?: string[]; scholarIds?: string[]; requestIds?: string[]; taskIds?: string[] }
): Promise<void> {
  const userIds = ids.userIds ?? [];
  const scholarIds = ids.scholarIds ?? [];
  const requestIds = ids.requestIds ?? [];
  const taskIds = ids.taskIds ?? [];

  if (taskIds.length > 0) {
    await db
      .delete(tasks)
      .where(inArray(tasks.id, taskIds))
      .catch(() => undefined);
  }

  if (requestIds.length > 0) {
    await db
      .delete(requestAssignees)
      .where(inArray(requestAssignees.requestId, requestIds))
      .catch(() => undefined);
    await db
      .delete(requestAttachments)
      .where(inArray(requestAttachments.requestId, requestIds))
      .catch(() => undefined);
    await db
      .delete(requestAuditLogs)
      .where(inArray(requestAuditLogs.requestId, requestIds))
      .catch(() => undefined);
    await db
      .delete(requests)
      .where(inArray(requests.id, requestIds))
      .catch(() => undefined);
  }

  if (scholarIds.length > 0) {
    // Tasks for the scholar
    await db
      .delete(tasks)
      .where(inArray(tasks.scholarId, scholarIds))
      .catch(() => undefined);
    // Requests for the scholar (cascade will catch attachments/auditLogs/assignees on FK delete)
    const reqs = await db
      .select({ id: requests.id })
      .from(requests)
      .where(inArray(requests.scholarId, scholarIds))
      .catch(() => [] as { id: string }[]);
    if (reqs.length > 0) {
      const reqIds = reqs.map((r) => r.id);
      await db
        .delete(requestAssignees)
        .where(inArray(requestAssignees.requestId, reqIds))
        .catch(() => undefined);
      await db
        .delete(requestAttachments)
        .where(inArray(requestAttachments.requestId, reqIds))
        .catch(() => undefined);
      await db
        .delete(requestAuditLogs)
        .where(inArray(requestAuditLogs.requestId, reqIds))
        .catch(() => undefined);
      await db
        .delete(requests)
        .where(inArray(requests.id, reqIds))
        .catch(() => undefined);
    }
    await db
      .delete(scholars)
      .where(inArray(scholars.id, scholarIds))
      .catch(() => undefined);
  }

  if (userIds.length > 0) {
    await db
      .delete(invitations)
      .where(inArray(invitations.invitedBy, userIds))
      .catch(() => undefined);
    await db
      .delete(staff)
      .where(inArray(staff.userId, userIds))
      .catch(() => undefined);
    await db
      .delete(users)
      .where(inArray(users.id, userIds))
      .catch(() => undefined);
  }
}

export async function deleteInvitationByEmail(db: NodePgDatabase, email: string): Promise<void> {
  await db
    .delete(invitations)
    .where(eq(invitations.email, email))
    .catch(() => undefined);
}

export function randomEmail(prefix = 'invitee'): string {
  return `${prefix}-${randomUUID()}@example.com`;
}
