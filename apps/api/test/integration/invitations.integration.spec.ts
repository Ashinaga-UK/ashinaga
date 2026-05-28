/**
 * Integration tests for Invitations API.
 * Covers the staff invitations flow: 30-day expiry, list, resend, cancel.
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { invitations } from '../../src/db/schema';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  deleteInvitationByEmail,
  getTestPool,
  randomEmail,
  type SeededStaff,
  seedStaffUser,
} from './helpers/seed';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

describe('Invitations API (integration)', () => {
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
    staffActor = await seedStaffUser(db, { name: 'Invite Tester' });
    auth.setUser({ id: staffActor.userId, email: staffActor.email, userType: 'staff' });
  }, 30000);

  afterAll(async () => {
    await cleanupSeeded(db, { userIds: [staffActor.userId] });
    await pool.end();
    await app.close();
  }, 15000);

  describe('POST /api/invitations', () => {
    it('creates a pending invitation with a ~30 day expiry', async () => {
      const email = randomEmail('invite-create');
      const before = Date.now();

      const res = await request(app.getHttpServer())
        .post('/api/invitations')
        .send({ email, userType: 'staff' })
        .expect(201);

      expect(res.body).toMatchObject({
        email: email.toLowerCase(),
        userType: 'staff',
        status: 'pending',
      });
      const expiresAt = new Date(res.body.expiresAt).getTime();
      const expectedMin = before + THIRTY_DAYS_MS - 60_000;
      const expectedMax = before + THIRTY_DAYS_MS + 60_000;
      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);

      await deleteInvitationByEmail(db, email.toLowerCase());
    });

    it('returns 409 when a pending invitation already exists for the email', async () => {
      const email = randomEmail('invite-dup');
      await request(app.getHttpServer())
        .post('/api/invitations')
        .send({ email, userType: 'staff' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/invitations')
        .send({ email, userType: 'staff' })
        .expect(409);

      await deleteInvitationByEmail(db, email.toLowerCase());
    });
  });

  describe('GET /api/invitations', () => {
    it('lists invitations and supports the pending/cancelled filter', async () => {
      const pendingEmail = randomEmail('invite-list-pending');
      const toCancelEmail = randomEmail('invite-list-cancel');

      const pendingRes = await request(app.getHttpServer())
        .post('/api/invitations')
        .send({ email: pendingEmail, userType: 'staff' })
        .expect(201);
      const toCancelRes = await request(app.getHttpServer())
        .post('/api/invitations')
        .send({ email: toCancelEmail, userType: 'staff' })
        .expect(201);

      const pendingId = pendingRes.body.id;
      const cancelId = toCancelRes.body.id;

      await request(app.getHttpServer()).delete(`/api/invitations/${cancelId}`).expect(200);

      const pendingList = await request(app.getHttpServer())
        .get('/api/invitations?status=pending')
        .expect(200);
      expect(pendingList.body.find((r: { id: string }) => r.id === pendingId)).toBeDefined();
      expect(pendingList.body.find((r: { id: string }) => r.id === cancelId)).toBeUndefined();

      const cancelledList = await request(app.getHttpServer())
        .get('/api/invitations?status=cancelled')
        .expect(200);
      expect(cancelledList.body.find((r: { id: string }) => r.id === cancelId)).toBeDefined();
      expect(cancelledList.body.find((r: { id: string }) => r.id === pendingId)).toBeUndefined();

      const allList = await request(app.getHttpServer()).get('/api/invitations').expect(200);
      const ids = allList.body.map((r: { id: string }) => r.id);
      expect(ids).toContain(pendingId);
      expect(ids).toContain(cancelId);

      await deleteInvitationByEmail(db, pendingEmail.toLowerCase());
      await deleteInvitationByEmail(db, toCancelEmail.toLowerCase());
    });
  });

  describe('POST /api/invitations/resend', () => {
    it('increments resentCount and stamps lastResentAt', async () => {
      const email = randomEmail('invite-resend');
      const createRes = await request(app.getHttpServer())
        .post('/api/invitations')
        .send({ email, userType: 'staff' })
        .expect(201);
      const id = createRes.body.id;

      const resendRes = await request(app.getHttpServer())
        .post('/api/invitations/resend')
        .send({ invitationId: id })
        .expect(200);

      expect(resendRes.body).toMatchObject({
        message: expect.stringContaining('resent'),
        resentCount: 1,
      });

      const [row] = await db.select().from(invitations).where(eq(invitations.id, id));
      expect(row.resentCount).toBe('1');
      expect(row.lastResentAt).not.toBeNull();

      await deleteInvitationByEmail(db, email.toLowerCase());
    });

    it('returns 400 when resending a cancelled invitation', async () => {
      const email = randomEmail('invite-resend-cancelled');
      const createRes = await request(app.getHttpServer())
        .post('/api/invitations')
        .send({ email, userType: 'staff' })
        .expect(201);
      const id = createRes.body.id;
      await request(app.getHttpServer()).delete(`/api/invitations/${id}`).expect(200);

      await request(app.getHttpServer())
        .post('/api/invitations/resend')
        .send({ invitationId: id })
        .expect(400);

      await deleteInvitationByEmail(db, email.toLowerCase());
    });
  });

  describe('DELETE /api/invitations/:id', () => {
    it('marks a pending invitation as cancelled', async () => {
      const email = randomEmail('invite-cancel');
      const createRes = await request(app.getHttpServer())
        .post('/api/invitations')
        .send({ email, userType: 'staff' })
        .expect(201);
      const id = createRes.body.id;

      await request(app.getHttpServer()).delete(`/api/invitations/${id}`).expect(200);

      const [row] = await db.select().from(invitations).where(eq(invitations.id, id));
      expect(row.status).toBe('cancelled');

      await deleteInvitationByEmail(db, email.toLowerCase());
    });
  });

  describe('GET /api/invitations/validate/:token', () => {
    it('validates a freshly created token (no auth required)', async () => {
      const email = randomEmail('invite-validate');
      const createRes = await request(app.getHttpServer())
        .post('/api/invitations')
        .send({ email, userType: 'staff' })
        .expect(201);

      const [row] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.id, createRes.body.id));

      // Drop the test user; this endpoint is unauthenticated
      auth.setUser(null);
      const validateRes = await request(app.getHttpServer())
        .get(`/api/invitations/validate/${row.token}`)
        .expect(200);
      expect(validateRes.body.email).toBe(email.toLowerCase());
      expect(validateRes.body.userType).toBe('staff');

      // Restore staff user for remaining tests
      auth.setUser({ id: staffActor.userId, email: staffActor.email, userType: 'staff' });
      await deleteInvitationByEmail(db, email.toLowerCase());
    });
  });
});
