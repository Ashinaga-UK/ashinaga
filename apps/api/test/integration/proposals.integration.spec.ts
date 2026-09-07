import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  getTestPool,
  type SeededScholar,
  type SeededStaff,
  seedScholarUser,
  seedStaffUser,
} from './helpers/seed';

describe('Proposals API (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;
  let staffActor: SeededStaff;
  let prep: SeededScholar;
  let other: SeededScholar;

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
    auth = built.auth;
    const testDatabase = getTestPool();
    pool = testDatabase.pool;
    db = testDatabase.db;
    staffActor = await seedStaffUser(db, { name: 'Proposal Staff' });
    prep = await seedScholarUser(db, { name: 'Ada Prep', programStage: 'prep_year' });
    other = await seedScholarUser(db, { name: 'Other Scholar', programStage: 'scholar' });
  });

  afterAll(async () => {
    await cleanupSeeded(db, {
      userIds: [staffActor.userId, prep.userId, other.userId],
      scholarIds: [prep.scholarId, other.scholarId],
    });
    await app.close();
    await pool.end();
  });

  it('returns 403 when no user is set', async () => {
    auth.setUser(null);
    await request(app.getHttpServer()).get('/api/proposals/me').expect(403);
  });

  it('locks step 2 until step 1 is approved, and keeps comments on the same thread', async () => {
    auth.setUser({ id: prep.userId, email: prep.email, userType: 'scholar' });

    const mine = await request(app.getHttpServer()).get('/api/proposals/me').expect(200);
    expect(mine.body.currentStepKey).toBe('topic');
    await request(app.getHttpServer())
      .post('/api/proposals/me/steps/topic/comments')
      .send({ body: 'Too early' })
      .expect(403);
    expect(mine.body.steps.find((step: { key: string }) => step.key === 'outline').available).toBe(
      false
    );
    expect(mine.body.steps.find((step: { key: string }) => step.key === 'outline').body).toBeNull();

    await request(app.getHttpServer())
      .post('/api/proposals/me/steps/outline/submit')
      .send({ body: 'Too early' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/proposals/me/steps/topic/submit')
      .send({ body: 'My research question' })
      .expect(200);

    auth.setUser({ id: other.userId, email: other.email, userType: 'scholar' });
    await request(app.getHttpServer()).get(`/api/proposals/scholars/${prep.scholarId}`).expect(403);

    auth.setUser({ id: staffActor.userId, email: staffActor.email, userType: 'staff' });
    const inbox = await request(app.getHttpServer()).get('/api/proposals').expect(200);
    expect(inbox.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scholarId: prep.scholarId,
          stepKey: 'topic',
        }),
      ])
    );
    expect(inbox.body[0]).not.toHaveProperty('body');

    await request(app.getHttpServer())
      .post(`/api/proposals/scholars/${prep.scholarId}/steps/topic/review`)
      .send({ action: 'request_changes' })
      .expect(400);

    const changes = await request(app.getHttpServer())
      .post(`/api/proposals/scholars/${prep.scholarId}/steps/topic/review`)
      .send({ action: 'request_changes', comment: 'Sharpen the question' })
      .expect(200);
    const topicAfterChanges = changes.body.steps.find(
      (step: { key: string }) => step.key === 'topic'
    );
    expect(topicAfterChanges.status).toBe('changes_requested');
    expect(topicAfterChanges.comments).toEqual(
      expect.arrayContaining([expect.objectContaining({ body: 'Sharpen the question' })])
    );
    expect(
      changes.body.steps.find((step: { key: string }) => step.key === 'outline').available
    ).toBe(false);

    auth.setUser({ id: prep.userId, email: prep.email, userType: 'scholar' });
    const resubmitted = await request(app.getHttpServer())
      .post('/api/proposals/me/steps/topic/submit')
      .send({ body: 'Sharper question' })
      .expect(200);
    expect(
      resubmitted.body.steps.find((step: { key: string }) => step.key === 'topic').reviewedAt
    ).toBeNull();

    auth.setUser({ id: staffActor.userId, email: staffActor.email, userType: 'staff' });
    const approved = await request(app.getHttpServer())
      .post(`/api/proposals/scholars/${prep.scholarId}/steps/topic/review`)
      .send({ action: 'approve', comment: 'Approved' })
      .expect(200);
    expect(approved.body.currentStepKey).toBe('outline');
    expect(
      approved.body.steps.find((step: { key: string }) => step.key === 'outline').available
    ).toBe(true);

    auth.setUser({ id: prep.userId, email: prep.email, userType: 'scholar' });
    const unlocked = await request(app.getHttpServer()).get('/api/proposals/me').expect(200);
    expect(unlocked.body.currentStepKey).toBe('outline');
    expect(unlocked.body.steps.find((step: { key: string }) => step.key === 'topic').body).toBe(
      'Sharper question'
    );
    expect(
      unlocked.body.steps.find((step: { key: string }) => step.key === 'draft').body
    ).toBeNull();
  });

  it('keeps proposal bodies off the staff inbox', async () => {
    auth.setUser({ id: staffActor.userId, email: staffActor.email, userType: 'staff' });
    const inbox = await request(app.getHttpServer()).get('/api/proposals').expect(200);
    expect(JSON.stringify(inbox.body)).not.toContain('Sharper question');
    const full = await request(app.getHttpServer())
      .get(`/api/proposals/scholars/${prep.scholarId}`)
      .expect(200);
    expect(JSON.stringify(full.body)).toContain('Sharper question');
  });

  it('returns 404 when staff review a missing scholar', async () => {
    auth.setUser({ id: staffActor.userId, email: staffActor.email, userType: 'staff' });
    await request(app.getHttpServer())
      .get('/api/proposals/scholars/00000000-0000-4000-8000-000000000000')
      .expect(404);
  });
});
