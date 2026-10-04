import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { goals, scholars, tasks } from '../../src/db/schema';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  getTestPool,
  type SeededScholar,
  type SeededStaff,
  seedScholarUser,
  seedStaffUser,
} from './helpers/seed';

describe('GET /api/scholar-activity/report (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;
  let staffActor: SeededStaff;
  let stale: SeededScholar;
  let unknown: SeededScholar;
  let recent: SeededScholar;
  let inactive: SeededScholar;
  const program = `Activity IT ${Date.now()}`;
  const createdTaskIds: string[] = [];
  const createdGoalIds: string[] = [];

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
    auth = built.auth;
    const testDatabase = getTestPool();
    pool = testDatabase.pool;
    db = testDatabase.db;

    staffActor = await seedStaffUser(db, { name: 'Activity Staff' });
    stale = await seedScholarUser(db, { name: 'Stale Scholar', program, year: '2026' });
    unknown = await seedScholarUser(db, { name: 'Unknown Scholar', program, year: '2026' });
    recent = await seedScholarUser(db, { name: 'Recent Scholar', program, year: '2026' });
    inactive = await seedScholarUser(db, { name: 'Inactive Scholar', program, year: '2025' });

    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    await db
      .update(scholars)
      .set({ nationality: 'Uganda', lastActivity: sixtyDaysAgo })
      .where(eq(scholars.id, stale.scholarId));
    await db
      .update(scholars)
      .set({ nationality: 'Kenya', lastActivity: null })
      .where(eq(scholars.id, unknown.scholarId));
    await db
      .update(scholars)
      .set({ nationality: 'Uganda', lastActivity: yesterday })
      .where(eq(scholars.id, recent.scholarId));
    await db
      .update(scholars)
      .set({ nationality: 'Uganda', lastActivity: sixtyDaysAgo, status: 'inactive' })
      .where(eq(scholars.id, inactive.scholarId));

    const taskRows = await db
      .insert(tasks)
      .values([
        {
          title: 'Done essay',
          type: 'other',
          dueDate: new Date('2026-08-01T00:00:00.000Z'),
          scholarId: stale.scholarId,
          assignedBy: staffActor.userId,
          status: 'completed',
          completedAt: tenDaysAgo,
        },
        {
          title: 'Overdue form',
          type: 'other',
          dueDate: new Date('2020-01-01T00:00:00.000Z'),
          scholarId: stale.scholarId,
          assignedBy: staffActor.userId,
          status: 'pending',
        },
        {
          title: 'Deleted task',
          type: 'other',
          dueDate: new Date('2020-01-01T00:00:00.000Z'),
          scholarId: stale.scholarId,
          assignedBy: staffActor.userId,
          status: 'pending',
          deletedAt: new Date(),
        },
        {
          title: 'Future task',
          type: 'other',
          dueDate: new Date('2099-01-01T00:00:00.000Z'),
          scholarId: recent.scholarId,
          assignedBy: staffActor.userId,
          status: 'pending',
        },
      ])
      .returning({ id: tasks.id });
    createdTaskIds.push(...taskRows.map((row) => row.id));

    const goalRows = await db
      .insert(goals)
      .values([
        {
          title: 'Stale goal',
          category: 'academic_development',
          targetDate: new Date('2026-12-01T00:00:00.000Z'),
          scholarId: stale.scholarId,
          status: 'in_progress',
          completionScale: 4,
          updatedAt: tenDaysAgo,
        },
        {
          title: 'Unknown goal',
          category: 'personal_development',
          targetDate: new Date('2026-12-01T00:00:00.000Z'),
          scholarId: unknown.scholarId,
          status: 'completed',
          completionScale: 8,
          updatedAt: tenDaysAgo,
        },
      ])
      .returning({ id: goals.id });
    createdGoalIds.push(...goalRows.map((row) => row.id));
  }, 30000);

  afterAll(async () => {
    if (createdGoalIds.length > 0) {
      await db.delete(goals).where(inArray(goals.id, createdGoalIds));
    }
    await cleanupSeeded(db, {
      userIds: [staffActor.userId, stale.userId, unknown.userId, recent.userId, inactive.userId],
      scholarIds: [stale.scholarId, unknown.scholarId, recent.scholarId, inactive.scholarId],
      taskIds: createdTaskIds,
    });
    await pool.end();
    await app.close();
  }, 15000);

  function staffAuth() {
    auth.setUser({ id: staffActor.userId, email: staffActor.email, userType: 'staff' });
  }

  it('answers stale logins, scholars behind on tasks, and cohort activity', async () => {
    staffAuth();
    const res = await request(app.getHttpServer())
      .get('/api/scholar-activity/report')
      .query({ program })
      .expect(200);

    const ids = res.body.scholars.map((row: { scholarId: string }) => row.scholarId);
    expect(ids).toEqual(
      expect.arrayContaining([stale.scholarId, unknown.scholarId, recent.scholarId])
    );
    expect(ids).not.toContain(inactive.scholarId);

    const staleRow = res.body.scholars.find(
      (row: { scholarId: string }) => row.scholarId === stale.scholarId
    );
    expect(staleRow.isStaleLogin).toBe(true);
    expect(staleRow.lastActivityUnknown).toBe(false);
    expect(staleRow.tasksAssigned).toBe(2);
    expect(staleRow.tasksCompleted).toBe(1);
    expect(staleRow.tasksBehind).toBe(1);
    expect(staleRow.taskCompletionRate).toBe(50);
    expect(staleRow.goalsTotal).toBe(1);
    expect(staleRow.tasksCompletedInRange).toBeNull();
    expect(staleRow.goalsUpdatedInRange).toBeNull();

    const unknownRow = res.body.scholars.find(
      (row: { scholarId: string }) => row.scholarId === unknown.scholarId
    );
    expect(unknownRow.isStaleLogin).toBe(false);
    expect(unknownRow.lastActivityUnknown).toBe(true);
    expect(unknownRow.tasksAssigned).toBe(0);
    expect(unknownRow.taskCompletionRate).toBeNull();

    expect(res.body.summary.staleLoginCount).toBe(1);
    expect(res.body.summary.unknownLoginCount).toBe(1);
    expect(res.body.summary.scholarsBehindOnTasks).toBe(1);
    expect(res.body.summary.avgTaskCompletionRate).toBe(33);

    const cohort = res.body.cohorts.find(
      (row: { program: string; year: string }) => row.program === program && row.year === '2026'
    );
    expect(cohort).toMatchObject({
      scholarCount: 3,
      staleLoginCount: 1,
      unknownLoginCount: 1,
      scholarsBehindOnTasks: 1,
      avgTaskCompletionRate: 33,
    });

    const kenya = await request(app.getHttpServer())
      .get('/api/scholar-activity/report')
      .query({ program, nationality: 'Kenya' })
      .expect(200);
    expect(kenya.body.scholars).toHaveLength(1);
    expect(kenya.body.scholars[0].scholarId).toBe(unknown.scholarId);

    const today = new Date().toISOString().slice(0, 10);
    const ranged = await request(app.getHttpServer())
      .get('/api/scholar-activity/report')
      .query({ program, from: today })
      .expect(200);
    const rangedStale = ranged.body.scholars.find(
      (row: { scholarId: string }) => row.scholarId === stale.scholarId
    );
    expect(rangedStale.tasksCompleted).toBe(1);
    expect(rangedStale.tasksCompletedInRange).toBe(0);
    expect(rangedStale.goalsUpdatedInRange).toBe(0);

    const inactiveRes = await request(app.getHttpServer())
      .get('/api/scholar-activity/report')
      .query({ program, status: 'inactive' })
      .expect(200);
    expect(inactiveRes.body.scholars.map((row: { scholarId: string }) => row.scholarId)).toEqual([
      inactive.scholarId,
    ]);

    const csv = await request(app.getHttpServer())
      .get('/api/scholar-activity/report/csv')
      .query({ program, nationality: 'Kenya' })
      .expect(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toContain('Unknown Scholar');
    expect(csv.text).toContain('Unknown');
    expect(csv.text).not.toContain('Stale Scholar');
    expect(csv.text).toContain('"0","0",,"0","","1","1",,"8"');

    const sameDay = await request(app.getHttpServer())
      .get('/api/scholar-activity/report')
      .query({ program, from: today, to: today })
      .expect(200);
    expect(sameDay.body.summary.scholarCount).toBe(3);

    const paged = await request(app.getHttpServer())
      .get('/api/scholar-activity/report')
      .query({ program, page: 1, limit: 1 })
      .expect(200);
    expect(paged.body.scholars).toHaveLength(1);
    expect(paged.body.summary.scholarCount).toBe(3);
    expect(paged.body.meta).toMatchObject({ page: 1, limit: 1, totalItems: 3, totalPages: 3 });
    expect(paged.body.cohorts[0].scholarCount).toBe(3);

    const fullCsv = await request(app.getHttpServer())
      .get('/api/scholar-activity/report/csv')
      .query({ program, limit: 1 })
      .expect(200);
    expect(fullCsv.text).toContain('Stale Scholar');
    expect(fullCsv.text).toContain('Unknown Scholar');
    expect(fullCsv.text).toContain('Recent Scholar');
    expect(fullCsv.text).toContain('"1",,"1"');
  });

  it('rejects non-staff and invalid filters', async () => {
    auth.setUser({ id: stale.userId, email: stale.email, userType: 'scholar' });
    await request(app.getHttpServer()).get('/api/scholar-activity/report').expect(403);
    await request(app.getHttpServer()).get('/api/scholar-activity/report/csv').expect(403);

    staffAuth();
    await request(app.getHttpServer())
      .get('/api/scholar-activity/report')
      .query({ status: 'graduated' })
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/scholar-activity/report')
      .query({ from: '2026-09-02', to: '2026-09-01' })
      .expect(400);
  });
});
