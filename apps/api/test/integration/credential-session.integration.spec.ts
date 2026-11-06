/**
 * Credential session lifecycle through Better Auth.
 * Staff and scholar both use these routes. Microsoft sign-in needs the Azure app;
 * this checks that a Microsoft account row can store the 1.6 token fields while
 * account.expires_at is still present for the previous API image.
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { accounts, invitations, verification } from '../../src/db/schema';
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
const CHANGED_PASSWORD = 'password456';
const RESET_PASSWORD = 'password789';

describe('Credential session (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;
  let staffActor: SeededStaff;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
    auth = built.auth;
    const tdb = getTestPool();
    pool = tdb.pool;
    db = tdb.db;
    staffActor = await seedStaffUser(db, { name: 'Credential Session Tester' });
    auth.setUser({ id: staffActor.userId, email: staffActor.email, userType: 'staff' });
  }, 30000);

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await db.delete(verification).where(inArray(verification.value, createdUserIds));
    }
    await cleanupSeeded(db, { userIds: [staffActor.userId, ...createdUserIds] });
    await pool.end();
    await app.close();
  }, 15000);

  async function signUp(userType: 'staff' | 'scholar') {
    const email = randomEmail(`session-${userType}`);
    const createRes = await request(app.getHttpServer())
      .post('/api/invitations')
      .send({ email, userType })
      .expect(201);
    const [invite] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, createRes.body.id));
    if (!invite) throw new Error(`Invitation missing for ${email}`);

    const res = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({
        email,
        password: PASSWORD,
        name: `${userType} session`,
        invitationToken: invite.token,
      })
      .expect(200);

    const userId = res.body.user?.id as string;
    createdUserIds.push(userId);
    return { email, userId };
  }

  async function exercise(userType: 'staff' | 'scholar') {
    const { email, userId } = await signUp(userType);
    const agent = request.agent(app.getHttpServer());

    await agent.post('/api/auth/sign-in/email').send({ email, password: PASSWORD }).expect(200);

    const firstSession = await agent.get('/api/auth/get-session').expect(200);
    expect(firstSession.body.user?.id).toBe(userId);

    const refreshed = await agent.get('/api/auth/get-session').expect(200);
    expect(refreshed.body.user?.id).toBe(userId);
    expect(refreshed.body.session?.token).toEqual(expect.any(String));

    await agent
      .post('/api/auth/change-password')
      .send({ currentPassword: PASSWORD, newPassword: CHANGED_PASSWORD })
      .expect(200);

    const afterChange = await agent.get('/api/auth/get-session').expect(200);
    expect(afterChange.body.user?.id).toBe(userId);

    await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({ email, password: PASSWORD })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({ email, password: CHANGED_PASSWORD })
      .expect(200);

    await agent.post('/api/auth/sign-out').expect(200);
    const signedOut = await agent.get('/api/auth/get-session').expect(200);
    expect(signedOut.body?.user ?? null).toBeNull();

    await agent.post('/api/auth/request-password-reset').send({ email }).expect(200);
    const resets = await db.select().from(verification).where(eq(verification.value, userId));
    const reset = resets.find((row) => row.identifier.startsWith('reset-password:'));
    const token = reset ? reset.identifier.slice('reset-password:'.length) : '';
    expect(token).not.toBe('');

    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token, newPassword: RESET_PASSWORD })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({ email, password: RESET_PASSWORD })
      .expect(200);

    await deleteInvitationByEmail(db, email);
    return userId;
  }

  it('signs in, refreshes the session, changes password, signs out, and resets password for staff', async () => {
    await exercise('staff');
  });

  it('signs in, refreshes the session, changes password, signs out, and resets password for a scholar', async () => {
    await exercise('scholar');
  });

  it('stores Microsoft token expiry and scope beside the legacy expires_at column', async () => {
    const { userId } = await signUp('scholar');
    const expiresAt = new Date('2026-12-01T00:00:00.000Z');
    const [credential] = await db.select().from(accounts).where(eq(accounts.userId, userId));
    if (!credential) throw new Error('Signup did not create a credential account');

    await pool.query('UPDATE account SET expires_at = $1 WHERE id = $2', [
      expiresAt,
      credential.id,
    ]);
    const legacy = await pool.query<{ expires_at: Date }>(
      'SELECT expires_at FROM account WHERE id = $1',
      [credential.id]
    );
    expect(legacy.rows[0]?.expires_at).toBeInstanceOf(Date);

    const microsoftId = `microsoft-${userId}`;
    await db.insert(accounts).values({
      id: microsoftId,
      userId,
      accountId: `oid-${userId}`,
      providerId: 'microsoft',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessTokenExpiresAt: expiresAt,
      refreshTokenExpiresAt: expiresAt,
      scope: 'openid profile email User.Read',
    });

    const [stored] = await db.select().from(accounts).where(eq(accounts.id, microsoftId));
    expect(stored?.providerId).toBe('microsoft');
    expect(stored?.accessTokenExpiresAt).toBeInstanceOf(Date);
    expect(stored?.refreshTokenExpiresAt).toBeInstanceOf(Date);
    expect(stored?.scope).toBe('openid profile email User.Read');
  });
});
