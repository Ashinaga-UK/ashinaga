import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { requests, scholars } from '../../src/db/schema';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  getTestPool,
  type SeededScholar,
  type SeededStaff,
  seedScholarUser,
  seedStaffUser,
} from './helpers/seed';

describe('GET /api/overview (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;
  let staffActor: SeededStaff;
  let onHold: SeededScholar;
  let active: SeededScholar;
  let archived: SeededScholar;
  let counted: SeededScholar | undefined;
  let onHoldRequestId: string;
  let activeRequestId: string;

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
    auth = built.auth;
    const testDatabase = getTestPool();
    pool = testDatabase.pool;
    db = testDatabase.db;

    staffActor = await seedStaffUser(db, { name: 'Overview Staff', isSuperAdmin: true });
    auth.setUser({ id: staffActor.userId, email: staffActor.email, userType: 'staff' });
  }, 30000);

  afterAll(async () => {
    await cleanupSeeded(db, {
      userIds: [
        staffActor?.userId,
        onHold?.userId,
        active?.userId,
        archived?.userId,
        counted?.userId,
      ].filter((id): id is string => Boolean(id)),
      scholarIds: [
        onHold?.scholarId,
        active?.scholarId,
        archived?.scholarId,
        counted?.scholarId,
      ].filter((id): id is string => Boolean(id)),
      requestIds: [onHoldRequestId, activeRequestId].filter((id): id is string => Boolean(id)),
    });
    await pool?.end();
    await app?.close();
  }, 15000);

  async function overview() {
    const res = await request(app.getHttpServer()).get('/api/overview').expect(200);
    return res.body as {
      cohort: { total: number; prepYear: number };
      attention: {
        items: Array<{ id: string }>;
        counts: { action: number };
      };
    };
  }

  async function pendingCount() {
    const res = await request(app.getHttpServer()).get('/api/requests/stats').expect(200);
    return res.body.pending as number;
  }

  it('leaves an on-hold pending request in request stats and out of Needs you', async () => {
    const beforeOverview = await overview();
    const beforePending = await pendingCount();

    onHold = await seedScholarUser(db, { name: 'On Hold Scholar', programStage: 'scholar' });
    await db.update(scholars).set({ status: 'on_hold' }).where(eq(scholars.id, onHold.scholarId));
    const [onHoldRequest] = await db
      .insert(requests)
      .values({
        scholarId: onHold.scholarId,
        type: 'others',
        description: 'Pending while on hold',
        status: 'pending',
      })
      .returning({ id: requests.id });
    if (!onHoldRequest) throw new Error('Failed to seed on-hold request');
    onHoldRequestId = onHoldRequest.id;

    active = await seedScholarUser(db, { name: 'Active Scholar', programStage: 'scholar' });
    const [activeRequest] = await db
      .insert(requests)
      .values({
        scholarId: active.scholarId,
        type: 'others',
        description: 'Pending for an active scholar',
        status: 'pending',
      })
      .returning({ id: requests.id });
    if (!activeRequest) throw new Error('Failed to seed active request');
    activeRequestId = activeRequest.id;

    const after = await overview();

    expect(await pendingCount()).toBe(beforePending + 2);
    expect(after.attention.counts.action).toBe(beforeOverview.attention.counts.action + 1);
    expect(after.attention.items.map((item) => item.id)).not.toContain(
      `pending_request:${onHoldRequestId}`
    );
    expect(after.cohort).not.toHaveProperty('active');
  });

  it('counts non-archived scholars and leaves archived scholars out of the Scholars card', async () => {
    const before = (await overview()).cohort.total;

    archived = await seedScholarUser(db, { name: 'Archived Scholar', programStage: 'scholar' });
    await db
      .update(scholars)
      .set({ status: 'archived' })
      .where(eq(scholars.id, archived.scholarId));

    expect((await overview()).cohort.total).toBe(before);

    counted = await seedScholarUser(db, { name: 'Counted Scholar', programStage: 'scholar' });
    try {
      await db
        .update(scholars)
        .set({ status: 'on_hold' })
        .where(eq(scholars.id, counted.scholarId));

      expect((await overview()).cohort.total).toBe(before + 1);
    } finally {
      await cleanupSeeded(db, {
        userIds: [counted.userId],
        scholarIds: [counted.scholarId],
      });
    }
  });
});
