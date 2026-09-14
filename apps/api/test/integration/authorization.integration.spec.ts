/**
 * Integration tests for API-level authorization.
 *
 * The manual QA pack exercises every flow through the UI as the correct role,
 * so an endpoint that is only staff-gated in the frontend still passes it.
 * These tests call the API directly with the wrong caller (no session, or a
 * scholar session) and assert the request is refused.
 *
 * The control cases (staff doing the same thing) exist so a harness fault shows
 * up as everything failing rather than as a false clean bill of health.
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { announcements, requestAttachments, requests } from '../../src/db/schema';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  getTestPool,
  type SeededScholar,
  type SeededStaff,
  seedScholarUser,
  seedStaffUser,
} from './helpers/seed';

const REQUEST_DESCRIPTION =
  'Detailed description of an extenuating circumstance that warrants review by staff.';

describe('API authorization (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;

  let scholarA: SeededScholar;
  let scholarB: SeededScholar;
  let staffUser: SeededStaff;

  const createdRequestIds: string[] = [];
  const createdAnnouncementIds: string[] = [];
  const seededStaffIds: string[] = [];

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
    auth = built.auth;
    const tdb = getTestPool();
    pool = tdb.pool;
    db = tdb.db;

    scholarA = await seedScholarUser(db, { name: 'Authz Scholar A' });
    scholarB = await seedScholarUser(db, { name: 'Authz Scholar B' });
    staffUser = await seedStaffUser(db, { name: 'Authz Staff' });
  }, 30000);

  afterAll(async () => {
    for (const id of createdAnnouncementIds) {
      await db
        .delete(announcements)
        .where(eq(announcements.id, id))
        .catch(() => undefined);
    }
    await cleanupSeeded(db, {
      userIds: [scholarA.userId, scholarB.userId, staffUser.userId, ...seededStaffIds],
      scholarIds: [scholarA.scholarId, scholarB.scholarId],
      requestIds: createdRequestIds,
    });
    await pool.end();
    await app.close();
  }, 15000);

  function asScholar(scholar: SeededScholar) {
    auth.setUser({ id: scholar.userId, email: scholar.email, userType: 'scholar' });
  }

  function asStaff() {
    auth.setUser({ id: staffUser.userId, email: staffUser.email, userType: 'staff' });
  }

  function asNobody() {
    auth.setUser(null);
  }

  async function createRequestAs(scholar: SeededScholar): Promise<string> {
    asScholar(scholar);
    const res = await request(app.getHttpServer())
      .post('/api/requests')
      .send({
        type: 'extenuating_circumstances',
        description: REQUEST_DESCRIPTION,
        priority: 'high',
        assigneeIds: [staffUser.userId],
      });
    expect(res.status).toBe(201);
    createdRequestIds.push(res.body.id);
    return res.body.id;
  }

  /**
   * POST /api/requests/:id/status is how staff approve, reject or comment on a
   * request, so it decides funding outcomes. It must be staff-only, and the
   * recorded reviewer must come from the session rather than the request body.
   */
  describe('POST /api/requests/:id/status — staff only', () => {
    it('rejects an unauthenticated caller', async () => {
      const requestId = await createRequestAs(scholarA);
      asNobody();

      const res = await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/status`)
        .send({ status: 'approved', comment: 'Approved by nobody', reviewedBy: staffUser.userId });

      expect(res.status).toBe(401);
    });

    it('rejects a scholar approving their own request', async () => {
      const requestId = await createRequestAs(scholarA);
      asScholar(scholarA);

      const res = await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/status`)
        .send({ status: 'approved', comment: 'Self approved', reviewedBy: staffUser.userId });

      expect(res.status).toBe(403);
    });

    it('leaves the request pending after a refused approval', async () => {
      const requestId = await createRequestAs(scholarA);
      asScholar(scholarA);

      await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/status`)
        .send({ status: 'approved', comment: 'Self approved', reviewedBy: staffUser.userId });

      const [row] = await db.select().from(requests).where(eq(requests.id, requestId));
      expect(row?.status).toBe('pending');
    });

    it('allows staff to approve (control)', async () => {
      const requestId = await createRequestAs(scholarA);
      asStaff();

      const res = await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/status`)
        .send({ status: 'approved', comment: 'Looks fine', reviewedBy: staffUser.userId });

      expect(res.status).toBeLessThan(400);
    });

    it('records the reviewer from the session, not the body', async () => {
      const requestId = await createRequestAs(scholarA);
      const otherStaff = await seedStaffUser(db, { name: 'Impersonated Staff' });
      seededStaffIds.push(otherStaff.userId);
      asStaff();

      await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/status`)
        .send({ status: 'approved', comment: 'Looks fine', reviewedBy: otherStaff.userId });

      const [row] = await db.select().from(requests).where(eq(requests.id, requestId));
      expect(row?.reviewedBy).toBe(staffUser.userId);
    });
  });

  /**
   * Every announcement route is staff-only except my-announcements, which is how
   * a scholar reads their own. A blanket class-level AuthGuard is not enough here:
   * it authenticates without saying anything about role.
   */
  describe('Announcements — staff only', () => {
    it('refuses a scholar creating an announcement', async () => {
      asScholar(scholarA);

      const res = await request(app.getHttpServer())
        .post('/api/announcements')
        .send({ title: 'Written by a scholar', content: 'This should never be created.' });

      if (res.status < 400 && res.body?.id) {
        createdAnnouncementIds.push(res.body.id);
      }
      expect(res.status).toBe(403);
    });

    it('refuses a scholar enumerating every scholar via the filter endpoint', async () => {
      asScholar(scholarA);

      const res = await request(app.getHttpServer()).get('/api/announcements/scholars');

      expect(res.status).toBe(403);
    });

    it('refuses a scholar archiving an announcement', async () => {
      asStaff();
      const created = await request(app.getHttpServer())
        .post('/api/announcements')
        .send({ title: 'Staff announcement', content: 'Only staff may archive this.' });
      expect(created.status).toBeLessThan(400);
      createdAnnouncementIds.push(created.body.id);

      asScholar(scholarA);
      const res = await request(app.getHttpServer()).delete(
        `/api/announcements/${created.body.id}`
      );

      expect(res.status).toBe(403);
    });

    it('allows staff to create an announcement (control)', async () => {
      asStaff();

      const res = await request(app.getHttpServer())
        .post('/api/announcements')
        .send({ title: 'Staff announcement', content: 'Created by staff.' });

      expect(res.status).toBeLessThan(400);
      createdAnnouncementIds.push(res.body.id);
    });
  });

  /**
   * respondToCommentedRequest re-points caller-supplied attachmentIds at the
   * caller's own request. The request is ownership-checked; the attachments are not.
   */
  describe('POST /api/requests/:id/respond — attachment ownership', () => {
    it("does not let a scholar attach another scholar's file to their own request", async () => {
      const victimRequestId = await createRequestAs(scholarB);
      const attackerRequestId = await createRequestAs(scholarA);

      const [victimAttachment] = await db
        .insert(requestAttachments)
        .values({
          requestId: victimRequestId,
          name: 'victim-bank-details.pdf',
          size: '1024',
          url: 'requests/victim/bank-details.pdf',
          mimeType: 'application/pdf',
        })
        .returning({ id: requestAttachments.id });

      // Responding is only allowed on a request staff have commented on.
      await db
        .update(requests)
        .set({ status: 'commented' })
        .where(eq(requests.id, attackerRequestId));

      asScholar(scholarA);
      await request(app.getHttpServer())
        .post(`/api/requests/${attackerRequestId}/respond`)
        .send({
          comment: 'Here is the additional information you asked for.',
          attachmentIds: [victimAttachment.id],
        });

      const [row] = await db
        .select()
        .from(requestAttachments)
        .where(eq(requestAttachments.id, victimAttachment.id));

      expect(row?.requestId).toBe(victimRequestId);
    });
  });
});
