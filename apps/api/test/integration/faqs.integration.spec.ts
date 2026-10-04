/**
 * Integration tests for the FAQs API (ASH-121).
 *
 * Staff manage FAQs through /api/faqs; students read their own stage's FAQs
 * through /api/faqs/my-faqs. These tests cover the full staff CRUD path, the
 * stage scoping on the student read, and that scholars cannot write.
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { faqs } from '../../src/db/schema';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  getTestPool,
  type SeededScholar,
  type SeededStaff,
  seedScholarUser,
  seedStaffUser,
} from './helpers/seed';

describe('FAQs API (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;

  let staffUser: SeededStaff;
  let prepScholar: SeededScholar;
  let enrolledScholar: SeededScholar;

  const createdFaqIds: string[] = [];
  const tag = `itest-faq-${Date.now()}`;

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
    auth = built.auth;
    const tdb = getTestPool();
    pool = tdb.pool;
    db = tdb.db;

    staffUser = await seedStaffUser(db, { name: 'FAQ Staff' });
    prepScholar = await seedScholarUser(db, { name: 'FAQ Prep', programStage: 'prep_year' });
    enrolledScholar = await seedScholarUser(db, { name: 'FAQ Enrolled', programStage: 'scholar' });
  }, 30000);

  afterAll(async () => {
    if (createdFaqIds.length > 0) {
      await db.delete(faqs).where(inArray(faqs.id, createdFaqIds));
    }
    await cleanupSeeded(db, {
      userIds: [staffUser.userId, prepScholar.userId, enrolledScholar.userId],
      scholarIds: [prepScholar.scholarId, enrolledScholar.scholarId],
    });
    await pool.end();
    await app.close();
  }, 15000);

  function asStaff() {
    auth.setUser({ id: staffUser.userId, email: staffUser.email, userType: 'staff' });
  }

  function asScholar(scholar: SeededScholar) {
    auth.setUser({ id: scholar.userId, email: scholar.email, userType: 'scholar' });
  }

  async function createFaqAsStaff(audience: 'prep_year' | 'scholar', question: string) {
    asStaff();
    const res = await request(app.getHttpServer())
      .post('/api/faqs')
      .send({ audience, category: 'Funding', question, answer: `Answer to ${question}` })
      .expect(201);
    createdFaqIds.push(res.body.id);
    return res.body as { id: string; question: string; audience: string };
  }

  it('lets staff create, list, update and delete an FAQ', async () => {
    const created = await createFaqAsStaff('prep_year', `${tag} crud question`);
    expect(created.audience).toBe('prep_year');

    const list = await request(app.getHttpServer())
      .get('/api/faqs')
      .query({ audience: 'prep_year' })
      .expect(200);
    expect((list.body as { id: string }[]).map((f) => f.id)).toContain(created.id);

    const updated = await request(app.getHttpServer())
      .patch(`/api/faqs/${created.id}`)
      .send({ answer: 'Updated answer' })
      .expect(200);
    expect(updated.body.answer).toBe('Updated answer');

    await request(app.getHttpServer()).delete(`/api/faqs/${created.id}`).expect(200);
    await request(app.getHttpServer()).delete(`/api/faqs/${created.id}`).expect(404);
  });

  it("returns only the caller's own stage from /api/faqs/my-faqs", async () => {
    const prepFaq = await createFaqAsStaff('prep_year', `${tag} prep-only question`);
    const enrolledFaq = await createFaqAsStaff('scholar', `${tag} enrolled-only question`);

    asScholar(prepScholar);
    const prepRes = await request(app.getHttpServer()).get('/api/faqs/my-faqs').expect(200);
    const prepIds = (prepRes.body as { id: string }[]).map((f) => f.id);
    expect(prepIds).toContain(prepFaq.id);
    expect(prepIds).not.toContain(enrolledFaq.id);

    asScholar(enrolledScholar);
    const enrolledRes = await request(app.getHttpServer()).get('/api/faqs/my-faqs').expect(200);
    const enrolledIds = (enrolledRes.body as { id: string }[]).map((f) => f.id);
    expect(enrolledIds).toContain(enrolledFaq.id);
    expect(enrolledIds).not.toContain(prepFaq.id);
  });

  it('refuses scholars on every staff route', async () => {
    const faq = await createFaqAsStaff('scholar', `${tag} protected question`);

    asScholar(enrolledScholar);
    const server = app.getHttpServer();
    await request(server).get('/api/faqs').expect(403);
    await request(server)
      .post('/api/faqs')
      .send({ audience: 'scholar', question: 'Nope', answer: 'Nope' })
      .expect(403);
    await request(server).patch(`/api/faqs/${faq.id}`).send({ answer: 'Hijacked' }).expect(403);
    await request(server).delete(`/api/faqs/${faq.id}`).expect(403);
  });

  it('refuses an unauthenticated caller', async () => {
    auth.setUser(null);
    const server = app.getHttpServer();
    await request(server).get('/api/faqs').expect(401);
    await request(server).get('/api/faqs/my-faqs').expect(401);
  });
});
