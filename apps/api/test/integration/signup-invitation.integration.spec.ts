/**
 * Signup must present the invitation token. Email alone is not a credential.
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { eq, inArray, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { invitations, scholars, staff, users } from '../../src/db/schema';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  deleteInvitationByEmail,
  getTestPool,
  randomEmail,
  type SeededStaff,
  seedStaffUser,
} from './helpers/seed';

const PASSWORD = 'password123';

describe('Signup invitation token (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;
  let staffActor: SeededStaff;

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
    auth = built.auth;
    const tdb = getTestPool();
    pool = tdb.pool;
    db = tdb.db;
    staffActor = await seedStaffUser(db, { name: 'Signup Invite Tester' });
    auth.setUser({ id: staffActor.userId, email: staffActor.email, userType: 'staff' });
  }, 30000);

  afterAll(async () => {
    await cleanupSeeded(db, { userIds: [staffActor.userId] });
    await pool.end();
    await app.close();
  }, 15000);

  async function createInvite(email: string, userType: 'staff' | 'scholar') {
    const createRes = await request(app.getHttpServer())
      .post('/api/invitations')
      .send({ email, userType })
      .expect(201);

    const [row] = await db.select().from(invitations).where(eq(invitations.id, createRes.body.id));
    if (!row) throw new Error(`Invitation missing for ${email}`);
    return row;
  }

  async function usersFor(email: string) {
    return db.select().from(users).where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
  }

  async function cleanupSignup(email: string) {
    await deleteInvitationByEmail(db, email.toLowerCase());
    const created = await usersFor(email);
    if (created.length === 0) return;
    await db.delete(users).where(
      inArray(
        users.id,
        created.map((row) => row.id)
      )
    );
  }

  function signUp(body: Record<string, unknown>) {
    return request(app.getHttpServer()).post('/api/auth/sign-up/email').send(body);
  }

  it('rejects a correct email with no token and creates no user', async () => {
    const email = randomEmail('signup-no-token');
    try {
      await createInvite(email, 'staff');

      const res = await signUp({
        email,
        password: PASSWORD,
        name: 'No Token',
      }).expect(400);

      expect(res.body).toEqual({ error: 'Invalid invitation' });
      expect(await usersFor(email)).toHaveLength(0);
    } finally {
      await cleanupSignup(email);
    }
  });

  it('rejects a correct email with the wrong token and creates no user', async () => {
    const email = randomEmail('signup-wrong-token');
    try {
      await createInvite(email, 'staff');

      const res = await signUp({
        email,
        password: PASSWORD,
        name: 'Wrong Token',
        invitationToken: 'not-the-invitation-token',
      }).expect(400);

      expect(res.body).toEqual({ error: 'Invalid invitation' });
      expect(await usersFor(email)).toHaveLength(0);
    } finally {
      await cleanupSignup(email);
    }
  });

  it('rejects a valid token submitted with a different email and creates no user', async () => {
    const email = randomEmail('signup-mismatch');
    const otherEmail = randomEmail('signup-other');
    try {
      const invite = await createInvite(email, 'staff');

      const res = await signUp({
        email: otherEmail,
        password: PASSWORD,
        name: 'Wrong Email',
        invitationToken: invite.token,
      }).expect(400);

      expect(res.body).toEqual({ error: 'Invalid invitation' });
      expect(await usersFor(email)).toHaveLength(0);
      expect(await usersFor(otherEmail)).toHaveLength(0);
    } finally {
      await cleanupSignup(email);
      await cleanupSignup(otherEmail);
    }
  });

  it('returns the invitation to pending when account creation is rejected', async () => {
    const email = randomEmail('signup-rejected');
    try {
      const invite = await createInvite(email, 'staff');

      const res = await signUp({
        email,
        password: 'short',
        name: 'Rejected',
        invitationToken: invite.token,
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(await usersFor(email)).toHaveLength(0);

      const [row] = await db.select().from(invitations).where(eq(invitations.id, invite.id));
      expect(row?.status).toBe('pending');
    } finally {
      await cleanupSignup(email);
    }
  });

  it('accepts a staff invite when the token matches, then rejects reuse', async () => {
    const email = randomEmail('signup-staff');
    try {
      const invite = await createInvite(email, 'staff');
      expect(invite.token).toMatch(/^[A-Za-z0-9_-]{43}$/);

      const res = await signUp({
        email: email.toUpperCase(),
        password: PASSWORD,
        name: 'Staff Invitee',
        invitationToken: invite.token,
      }).expect(200);

      expect(res.body.user?.id).toEqual(expect.any(String));

      const created = await usersFor(email);
      expect(created).toHaveLength(1);
      expect(created[0]?.userType).toBe('staff');

      const [profile] = await db.select().from(staff).where(eq(staff.userId, created[0].id));
      expect(profile?.role).toBe('viewer');

      const [accepted] = await db.select().from(invitations).where(eq(invitations.id, invite.id));
      expect(accepted?.status).toBe('accepted');
      expect(accepted?.userId).toBe(created[0].id);

      const reuse = await signUp({
        email,
        password: PASSWORD,
        name: 'Staff Invitee',
        invitationToken: invite.token,
      }).expect(400);

      expect(reuse.body).toEqual({ error: 'Invalid invitation' });
      expect(await usersFor(email)).toHaveLength(1);
    } finally {
      await cleanupSignup(email);
    }
  });

  it('creates the account when NODE_ENV is not test', async () => {
    const email = randomEmail('signup-prod-env');
    const previousEnv = process.env.NODE_ENV;
    try {
      const invite = await createInvite(email, 'staff');

      process.env.NODE_ENV = 'production';
      const res = await signUp({
        email,
        password: PASSWORD,
        name: 'Production Env',
        invitationToken: invite.token,
      }).expect(200);

      expect(res.body.user?.id).toEqual(expect.any(String));
      const created = await usersFor(email);
      expect(created).toHaveLength(1);
      expect(created[0]?.userType).toBe('staff');

      const [accepted] = await db.select().from(invitations).where(eq(invitations.id, invite.id));
      expect(accepted?.status).toBe('accepted');
      expect(accepted?.userId).toBe(created[0].id);
    } finally {
      process.env.NODE_ENV = previousEnv;
      await cleanupSignup(email);
    }
  });

  it('accepts a scholar invite when the token matches', async () => {
    const email = randomEmail('signup-scholar');
    try {
      const invite = await createInvite(email, 'scholar');

      const res = await signUp({
        email,
        password: PASSWORD,
        name: 'Scholar Invitee',
        invitationToken: invite.token,
      }).expect(200);

      expect(res.body.user?.id).toEqual(expect.any(String));

      const created = await usersFor(email);
      expect(created).toHaveLength(1);
      expect(created[0]?.userType).toBe('scholar');

      const [profile] = await db.select().from(scholars).where(eq(scholars.userId, created[0].id));
      expect(profile?.userId).toBe(created[0].id);

      const [accepted] = await db.select().from(invitations).where(eq(invitations.id, invite.id));
      expect(accepted?.status).toBe('accepted');
      expect(accepted?.userId).toBe(created[0].id);
    } finally {
      await cleanupSignup(email);
    }
  });
});
