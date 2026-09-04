import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { scholars, tasks } from '../../src/db/schema';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  getTestPool,
  type SeededScholar,
  type SeededStaff,
  seedScholarUser,
  seedStaffUser,
} from './helpers/seed';

describe('GET /api/tasks/cohort (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;
  let staffActor: SeededStaff;
  let prepA: SeededScholar;
  let prepB: SeededScholar;
  let onHold: SeededScholar;
  let enrolled: SeededScholar;

  const createdTaskIds: string[] = [];
  const groupId = randomUUID();
  const englishDue = new Date('2026-10-01T00:00:00.000Z');
  const overdueDue = new Date('2020-01-01T00:00:00.000Z');

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
    auth = built.auth;
    const testDatabase = getTestPool();
    pool = testDatabase.pool;
    db = testDatabase.db;

    staffActor = await seedStaffUser(db, { name: 'Cohort Staff' });
    prepA = await seedScholarUser(db, { name: 'Ada Prep', programStage: 'prep_year' });
    prepB = await seedScholarUser(db, { name: 'Ben Prep', programStage: 'prep_year' });
    onHold = await seedScholarUser(db, { name: 'Cara OnHold', programStage: 'prep_year' });
    enrolled = await seedScholarUser(db, { name: 'Enrolled Scholar', programStage: 'scholar' });

    await db.update(scholars).set({ status: 'on_hold' }).where(eq(scholars.id, onHold.scholarId));

    const rows = await db
      .insert(tasks)
      .values([
        {
          title: 'Connect signup',
          type: 'other',
          dueDate: overdueDue,
          phase: 'english',
          assignmentGroupId: groupId,
          scholarId: prepA.scholarId,
          assignedBy: staffActor.userId,
          status: 'pending',
        },
        {
          title: 'Connect signup',
          type: 'other',
          dueDate: englishDue,
          phase: 'english',
          assignmentGroupId: groupId,
          scholarId: prepB.scholarId,
          assignedBy: staffActor.userId,
          status: 'in_progress',
        },
        {
          title: 'Connect signup',
          type: 'other',
          dueDate: englishDue,
          phase: 'english',
          assignmentGroupId: groupId,
          scholarId: onHold.scholarId,
          assignedBy: staffActor.userId,
          status: 'completed',
          completedAt: new Date('2026-08-01T00:00:00.000Z'),
        },
        {
          title: 'Personal statement',
          type: 'other',
          dueDate: englishDue,
          phase: 'proposal',
          assignmentGroupId: null,
          scholarId: prepA.scholarId,
          assignedBy: staffActor.userId,
          status: 'pending',
        },
        {
          title: 'Hidden enrolled task',
          type: 'other',
          dueDate: englishDue,
          scholarId: enrolled.scholarId,
          assignedBy: staffActor.userId,
          status: 'pending',
        },
        {
          title: 'Archived prep task',
          type: 'other',
          dueDate: englishDue,
          phase: 'english',
          scholarId: prepB.scholarId,
          assignedBy: staffActor.userId,
          status: 'pending',
          deletedAt: new Date(),
          deletedBy: staffActor.userId,
        },
      ])
      .returning({ id: tasks.id });

    createdTaskIds.push(...rows.map((row) => row.id));
  }, 30000);

  afterAll(async () => {
    await cleanupSeeded(db, {
      userIds: [staffActor.userId, prepA.userId, prepB.userId, onHold.userId, enrolled.userId],
      scholarIds: [prepA.scholarId, prepB.scholarId, onHold.scholarId, enrolled.scholarId],
      taskIds: createdTaskIds,
    });
    await pool.end();
    await app.close();
  }, 15000);

  it('returns the prep_year matrix for staff and omits scholar-stage and deleted tasks', async () => {
    auth.setUser({ id: staffActor.userId, email: staffActor.email, userType: 'staff' });

    const res = await request(app.getHttpServer()).get('/api/tasks/cohort').expect(200);

    const scholarIds = res.body.scholars.map((row: { scholarId: string }) => row.scholarId);
    expect(scholarIds).toEqual(
      expect.arrayContaining([prepA.scholarId, prepB.scholarId, onHold.scholarId])
    );
    expect(scholarIds).not.toContain(enrolled.scholarId);

    const titles = res.body.columns.map((column: { title: string }) => column.title);
    expect(titles).toEqual(expect.arrayContaining(['Connect signup', 'Personal statement']));
    expect(titles).not.toContain('Archived prep task');
    expect(titles).not.toContain('Hidden enrolled task');

    const cara = res.body.scholars.find(
      (row: { scholarId: string; status?: string }) => row.scholarId === onHold.scholarId
    );
    expect(cara.status).toBe('on_hold');

    const ada = res.body.scholars.find(
      (row: { scholarId: string }) => row.scholarId === prepA.scholarId
    );
    const connect = res.body.columns.find(
      (column: { assignmentGroupId: string | null }) => column.assignmentGroupId === groupId
    );
    const connectCell = ada.cells.find(
      (cell: { columnKey: string }) => cell.columnKey === connect.key
    );
    expect(connectCell.status).toBe('pending');
    expect(connectCell.overdue).toBe(true);
  });

  it('filters by phase, scholar, and overdue on the server', async () => {
    auth.setUser({ id: staffActor.userId, email: staffActor.email, userType: 'staff' });

    const phase = await request(app.getHttpServer())
      .get('/api/tasks/cohort')
      .query({ phase: 'English' })
      .expect(200);
    expect(
      phase.body.columns.every((column: { phase: string }) => column.phase === 'english')
    ).toBe(true);

    const one = await request(app.getHttpServer())
      .get('/api/tasks/cohort')
      .query({ scholarId: prepA.scholarId })
      .expect(200);
    expect(one.body.scholars).toHaveLength(1);
    expect(one.body.scholars[0].scholarId).toBe(prepA.scholarId);

    const overdue = await request(app.getHttpServer())
      .get('/api/tasks/cohort')
      .query({ assignmentGroupId: groupId, state: 'overdue' })
      .expect(200);
    expect(overdue.body.columns).toHaveLength(1);
    expect(overdue.body.scholars.map((row: { scholarId: string }) => row.scholarId)).toEqual([
      prepA.scholarId,
    ]);
  });

  it('rejects a scholar session and conflicting column filters', async () => {
    auth.setUser({ id: prepA.userId, email: prepA.email, userType: 'scholar' });
    await request(app.getHttpServer()).get('/api/tasks/cohort').expect(403);

    auth.setUser({ id: staffActor.userId, email: staffActor.email, userType: 'staff' });
    await request(app.getHttpServer())
      .get('/api/tasks/cohort')
      .query({ assignmentGroupId: groupId, columnKey: groupId })
      .expect(400);
  });
});
