/**
 * Deactivated staff are rejected when the session is created, through the real Better Auth
 * handler, and leftover sessions are blocked by the real AuthGuard and StaffGuard (no guard
 * overrides).
 */
import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { invitations, sessions, staff, users } from '../../src/db/schema';
import { createIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  deleteInvitationByEmail,
  getTestPool,
  randomEmail,
  type SeededStaff,
  seedStaffUser,
} from './helpers/seed';

const PASSWORD = 'password123';

describe('Deactivated staff sign-in (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let pool: Pool;
  let db: NodePgDatabase;
  let inviter: SeededStaff;
  const emails: string[] = [];

  beforeAll(async () => {
    app = await createIntegrationApp();
    const tdb = getTestPool();
    pool = tdb.pool;
    db = tdb.db;
    inviter = await seedStaffUser(db, { name: 'Deactivation Inviter' });
  }, 30000);

  afterAll(async () => {
    for (const email of emails) {
      await deleteInvitationByEmail(db, email);
      const rows = await db
        .select()
        .from(users)
        .where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
      for (const row of rows) {
        await db.delete(sessions).where(eq(sessions.userId, row.id));
        await db.delete(staff).where(eq(staff.userId, row.id));
        await db.delete(users).where(eq(users.id, row.id));
      }
    }
    await cleanupSeeded(db, { userIds: [inviter.userId] });
    await pool.end();
    await app.close();
  }, 15000);

  /** Invite + sign up through the real flow so the account has a password. */
  async function signUpStaff() {
    const email = randomEmail('deactivated-signin');
    emails.push(email);
    const token = randomBytes(32).toString('base64url');
    await db.insert(invitations).values({
      email,
      userType: 'staff',
      invitedBy: inviter.userId,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const res = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({ email, password: PASSWORD, name: 'Deactivation Subject', invitationToken: token })
      .expect(200);

    const userId = res.body.user?.id as string;
    const [profile] = await db.select().from(staff).where(eq(staff.userId, userId));
    expect(profile?.isActive).toBe(true);
    return { email, userId };
  }

  function signIn(email: string, password: string) {
    return request(app.getHttpServer()).post('/api/auth/sign-in/email').send({ email, password });
  }

  function cookieFrom(res: request.Response): string {
    const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
    return (setCookie ?? []).map((c) => c.split(';')[0]).join('; ');
  }

  it('allows invitation signup (session created before the staff row exists) and active sign-in', async () => {
    const { email } = await signUpStaff();

    const res = await signIn(email, PASSWORD).expect(200);
    expect(res.body.user?.email).toBe(email);
  });

  it('rejects a deactivated staff member with ACCOUNT_DEACTIVATED and creates no session', async () => {
    const { email, userId } = await signUpStaff();
    await db.update(staff).set({ isActive: false }).where(eq(staff.userId, userId));
    await db.delete(sessions).where(eq(sessions.userId, userId));

    const res = await signIn(email, PASSWORD);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_DEACTIVATED');
    expect(res.body.message).toMatch(/deactivated/i);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(await db.select().from(sessions).where(eq(sessions.userId, userId))).toHaveLength(0);
  });

  it('keeps wrong-password errors generic for deactivated and active accounts', async () => {
    const active = await signUpStaff();
    const inactive = await signUpStaff();
    await db.update(staff).set({ isActive: false }).where(eq(staff.userId, inactive.userId));

    const activeRes = await signIn(active.email, 'wrong-password-1');
    const inactiveRes = await signIn(inactive.email, 'wrong-password-1');
    const unknownRes = await signIn(randomEmail('no-such-user'), 'wrong-password-1');

    for (const res of [activeRes, inactiveRes, unknownRes]) {
      expect(res.status).toBe(401);
      expect(res.body.code).not.toBe('ACCOUNT_DEACTIVATED');
      expect(JSON.stringify(res.body)).not.toMatch(/deactivated/i);
    }
    expect(inactiveRes.body).toEqual(activeRes.body);
  });

  it('StaffGuard still blocks a session that predates deactivation', async () => {
    const { email, userId } = await signUpStaff();
    const res = await signIn(email, PASSWORD).expect(200);
    const cookie = cookieFrom(res);
    expect(cookie).not.toBe('');

    await request(app.getHttpServer())
      .get('/api/users/staff/manage')
      .set('Cookie', cookie)
      .expect(200);

    await db.update(staff).set({ isActive: false }).where(eq(staff.userId, userId));

    await request(app.getHttpServer())
      .get('/api/users/staff/manage')
      .set('Cookie', cookie)
      .expect(403);
  });

  it('AuthGuard blocks a session that predates deactivation with ACCOUNT_DEACTIVATED', async () => {
    const { email, userId } = await signUpStaff();
    const res = await signIn(email, PASSWORD).expect(200);
    const cookie = cookieFrom(res);
    expect(cookie).not.toBe('');

    await request(app.getHttpServer())
      .get('/api/documents/types')
      .set('Cookie', cookie)
      .expect(200);

    await db.update(staff).set({ isActive: false }).where(eq(staff.userId, userId));

    const blocked = await request(app.getHttpServer())
      .get('/api/documents/types')
      .set('Cookie', cookie)
      .expect(403);
    expect(blocked.body.code).toBe('ACCOUNT_DEACTIVATED');
    expect(blocked.body.message).toMatch(/deactivated/i);
  });
});
