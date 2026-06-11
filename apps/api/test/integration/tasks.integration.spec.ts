/**
 * Integration tests for Tasks API covering issues #3, #4, #5:
 *  - POST /api/tasks/bulk creates the same task for many scholars.
 *  - DELETE /api/tasks/:id soft-deletes (deletedAt set, filtered out of reads).
 *  - GET /api/tasks/suggestions returns recent title-grouped suggestions.
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { tasks } from '../../src/db/schema';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  getTestPool,
  type SeededScholar,
  type SeededStaff,
  seedScholarUser,
  seedStaffUser,
} from './helpers/seed';

describe('Tasks API – bulk/soft-delete/suggestions (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;

  let staffActor: SeededStaff;
  let secondStaff: SeededStaff;
  let scholarA: SeededScholar;
  let scholarB: SeededScholar;
  let scholarC: SeededScholar;

  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
    auth = built.auth;
    const tdb = getTestPool();
    pool = tdb.pool;
    db = tdb.db;

    staffActor = await seedStaffUser(db, { name: 'Task Tester Staff' });
    secondStaff = await seedStaffUser(db, { name: 'Other Staff (suggestions isolation)' });
    scholarA = await seedScholarUser(db, { name: 'Task Scholar A' });
    scholarB = await seedScholarUser(db, { name: 'Task Scholar B' });
    scholarC = await seedScholarUser(db, { name: 'Task Scholar C' });

    auth.setUser({ id: staffActor.userId, email: staffActor.email, userType: 'staff' });
  }, 30000);

  afterAll(async () => {
    await cleanupSeeded(db, {
      userIds: [
        staffActor.userId,
        secondStaff.userId,
        scholarA.userId,
        scholarB.userId,
        scholarC.userId,
      ],
      scholarIds: [scholarA.scholarId, scholarB.scholarId, scholarC.scholarId],
      taskIds: createdTaskIds,
    });
    await pool.end();
    await app.close();
  }, 15000);

  describe('POST /api/tasks/bulk', () => {
    it('creates one task per scholar and returns the count', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tasks/bulk')
        .send({
          title: 'Submit transcript for Q4',
          description: 'Upload your transcript PDF to your scholar portal.',
          type: 'document_upload',
          priority: 'medium',
          dueDate: '2026-12-31',
          scholarIds: [scholarA.scholarId, scholarB.scholarId, scholarC.scholarId],
        })
        .expect(201);

      expect(res.body.created).toBe(3);
      expect(Array.isArray(res.body.tasks)).toBe(true);
      expect(res.body.tasks).toHaveLength(3);
      for (const t of res.body.tasks as { id: string; scholarId: string }[]) {
        createdTaskIds.push(t.id);
      }

      const scholarIds = new Set(res.body.tasks.map((t: { scholarId: string }) => t.scholarId));
      expect(scholarIds).toEqual(
        new Set([scholarA.scholarId, scholarB.scholarId, scholarC.scholarId])
      );
    });

    it('dedupes repeated scholarIds in the request body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tasks/bulk')
        .send({
          title: 'Confirm summer plans',
          description: 'Reply with your confirmed summer activity.',
          type: 'form_completion',
          priority: 'low',
          dueDate: '2026-06-30',
          scholarIds: [scholarA.scholarId, scholarA.scholarId, scholarB.scholarId],
        })
        .expect(201);

      expect(res.body.created).toBe(2);
      for (const t of res.body.tasks as { id: string }[]) {
        createdTaskIds.push(t.id);
      }
    });

    it('rejects empty scholarIds with 400', async () => {
      const res = await request(app.getHttpServer()).post('/api/tasks/bulk').send({
        title: 'No targets',
        type: 'other',
        priority: 'low',
        dueDate: '2026-06-30',
        scholarIds: [],
      });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/tasks/:id (soft delete)', () => {
    it('sets deletedAt and hides the task from list endpoints', async () => {
      // Create a task we will delete
      const create = await request(app.getHttpServer())
        .post('/api/tasks')
        .send({
          title: 'Task slated for soft delete',
          description: 'Will be deleted in the test.',
          type: 'other',
          priority: 'low',
          dueDate: '2026-06-30',
          scholarId: scholarA.scholarId,
        })
        .expect(201);
      const taskId = create.body.id as string;
      createdTaskIds.push(taskId);

      // Verify visible before delete
      const before = await request(app.getHttpServer())
        .get(`/api/tasks/scholar/${scholarA.scholarId}`)
        .expect(200);
      expect(before.body.find((t: { id: string }) => t.id === taskId)).toBeDefined();

      // Soft delete
      const del = await request(app.getHttpServer()).delete(`/api/tasks/${taskId}`).expect(200);
      expect(del.body).toMatchObject({ id: taskId, alreadyDeleted: false });

      // deletedAt is set in DB
      const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId));
      expect(row.deletedAt).not.toBeNull();
      expect(row.deletedBy).toBe(staffActor.userId);

      // No longer visible
      const after = await request(app.getHttpServer())
        .get(`/api/tasks/scholar/${scholarA.scholarId}`)
        .expect(200);
      expect(after.body.find((t: { id: string }) => t.id === taskId)).toBeUndefined();
    });

    it('returns alreadyDeleted: true on a second delete', async () => {
      // Create + delete
      const create = await request(app.getHttpServer())
        .post('/api/tasks')
        .send({
          title: 'Double-delete task',
          type: 'other',
          priority: 'low',
          dueDate: '2026-06-30',
          scholarId: scholarA.scholarId,
        })
        .expect(201);
      const taskId = create.body.id as string;
      createdTaskIds.push(taskId);

      await request(app.getHttpServer()).delete(`/api/tasks/${taskId}`).expect(200);
      const second = await request(app.getHttpServer()).delete(`/api/tasks/${taskId}`).expect(200);
      expect(second.body).toMatchObject({ id: taskId, alreadyDeleted: true });
    });

    it('returns 404 for an unknown task id', async () => {
      await request(app.getHttpServer())
        .delete('/api/tasks/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('GET /api/tasks/suggestions', () => {
    const distinctTitle = `INT TEST UNIQUE TITLE ${Date.now()}`;

    beforeAll(async () => {
      // Seed three tasks with the same unique title under staffActor and one under secondStaff
      const seed = async (assignedBy: string, scholarId: string, when?: Date) => {
        const [row] = await db
          .insert(tasks)
          .values({
            title: distinctTitle,
            description: 'Shared description for suggestion test',
            type: 'meeting_attendance',
            priority: 'high',
            dueDate: new Date('2026-09-01'),
            scholarId,
            assignedBy,
            status: 'pending',
            ...(when ? { createdAt: when } : {}),
          })
          .returning({ id: tasks.id });
        if (row) createdTaskIds.push(row.id);
      };
      await seed(staffActor.userId, scholarA.scholarId, new Date('2025-11-01'));
      await seed(staffActor.userId, scholarB.scholarId, new Date('2025-12-15'));
      await seed(staffActor.userId, scholarC.scholarId, new Date('2026-01-20'));
      await seed(secondStaff.userId, scholarA.scholarId, new Date('2026-01-20'));
    });

    it('returns suggestions matching a prefix, grouped by title, with useCount', async () => {
      const prefix = distinctTitle.slice(0, 12);
      const res = await request(app.getHttpServer())
        .get('/api/tasks/suggestions')
        .query({ q: prefix, limit: 10 })
        .expect(200);

      const match = (res.body as Array<{ title: string }>).find((s) => s.title === distinctTitle);
      expect(match).toBeDefined();
      expect(match).toMatchObject({
        title: distinctTitle,
        type: 'meeting_attendance',
        priority: 'high',
        useCount: 3, // only counts tasks assigned by the current staff user
      });
    });

    it('scopes suggestions to the requesting staff user', async () => {
      auth.setUser({
        id: secondStaff.userId,
        email: secondStaff.email,
        userType: 'staff',
      });
      const res = await request(app.getHttpServer())
        .get('/api/tasks/suggestions')
        .query({ q: distinctTitle.slice(0, 12), limit: 10 })
        .expect(200);

      const match = (res.body as Array<{ title: string; useCount: number }>).find(
        (s) => s.title === distinctTitle
      );
      expect(match).toBeDefined();
      expect(match?.useCount).toBe(1);

      // restore primary actor for any later tests
      auth.setUser({ id: staffActor.userId, email: staffActor.email, userType: 'staff' });
    });

    it('returns an empty list when nothing matches the prefix', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks/suggestions')
        .query({ q: 'zzz-no-such-title-prefix-zzz', limit: 5 })
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(
        (res.body as Array<{ title: string }>).find((s) => s.title === distinctTitle)
      ).toBeUndefined();
    });

    it('excludes soft-deleted tasks from suggestions', async () => {
      // Soft-delete all 3 of staffActor's matching tasks
      const matchingIds = createdTaskIds.filter((id) => id); // we'll filter by DB lookup
      const rows = await db.select().from(tasks).where(eq(tasks.title, distinctTitle));
      for (const row of rows) {
        if (row.assignedBy === staffActor.userId) {
          await db
            .update(tasks)
            .set({ deletedAt: new Date(), deletedBy: staffActor.userId })
            .where(eq(tasks.id, row.id));
        }
      }
      // We didn't use matchingIds but keep a reference so the cleanup arrays grow naturally
      expect(matchingIds.length).toBeGreaterThan(0);

      const res = await request(app.getHttpServer())
        .get('/api/tasks/suggestions')
        .query({ q: distinctTitle.slice(0, 12), limit: 10 })
        .expect(200);

      const match = (res.body as Array<{ title: string }>).find((s) => s.title === distinctTitle);
      expect(match).toBeUndefined();
    });
  });
});
