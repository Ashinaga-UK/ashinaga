import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import {
  platforms,
  requiredDocumentFiles,
  requiredDocumentTypes,
  scholarPlatformSetups,
  scholars,
  tasks,
} from '../../src/db/schema';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  getTestPool,
  type SeededScholar,
  type SeededStaff,
  seedScholarUser,
  seedStaffUser,
} from './helpers/seed';

describe('GET /api/prep-year/report (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;
  let staffActor: SeededStaff;
  let prepA: SeededScholar;
  let prepB: SeededScholar;
  let enrolled: SeededScholar;
  let createdFileId: string | undefined;
  let ieltsTypeId: string;
  let courseraPlatformId: string;

  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
    auth = built.auth;
    const testDatabase = getTestPool();
    pool = testDatabase.pool;
    db = testDatabase.db;

    staffActor = await seedStaffUser(db, { name: 'Report Staff' });
    prepA = await seedScholarUser(db, { name: 'Ada Prep', programStage: 'prep_year' });
    prepB = await seedScholarUser(db, { name: 'Ben Prep', programStage: 'prep_year' });
    enrolled = await seedScholarUser(db, { name: 'Enrolled Scholar', programStage: 'scholar' });

    await db
      .update(scholars)
      .set({
        intendedUniversity: 'Oxford',
        intendedCourse: 'Law',
        degreePathway: 'Foundation Year',
      })
      .where(eq(scholars.id, prepA.scholarId));

    const [ielts] = await db
      .select()
      .from(requiredDocumentTypes)
      .where(eq(requiredDocumentTypes.slug, 'ielts'))
      .limit(1);
    if (!ielts) throw new Error('Expected seeded ielts document type');
    ieltsTypeId = ielts.id;

    const [coursera] = await db
      .select()
      .from(platforms)
      .where(eq(platforms.slug, 'coursera'))
      .limit(1);
    if (!coursera) throw new Error('Expected seeded coursera platform');
    courseraPlatformId = coursera.id;

    const [file] = await db
      .insert(requiredDocumentFiles)
      .values({
        scholarId: prepA.scholarId,
        typeId: ieltsTypeId,
        fileKey: `documents/${prepA.scholarId}/${randomUUID()}/ielts.pdf`,
        fileName: 'ielts.pdf',
        fileMimeType: 'application/pdf',
        fileSizeBytes: 2048,
        uploadedBy: prepA.userId,
      })
      .returning({ id: requiredDocumentFiles.id });
    createdFileId = file?.id;

    await db.insert(scholarPlatformSetups).values({
      scholarId: prepA.scholarId,
      platformId: courseraPlatformId,
      status: 'yes',
      updatedBy: staffActor.userId,
    });

    const rows = await db
      .insert(tasks)
      .values([
        {
          title: 'Connect signup',
          type: 'other',
          dueDate: new Date('2026-10-01T00:00:00.000Z'),
          phase: 'english',
          scholarId: prepA.scholarId,
          assignedBy: staffActor.userId,
          status: 'completed',
          completedAt: new Date('2026-08-01T00:00:00.000Z'),
        },
        {
          title: 'Essay',
          type: 'other',
          dueDate: new Date('2020-01-01T00:00:00.000Z'),
          phase: 'proposal',
          scholarId: prepA.scholarId,
          assignedBy: staffActor.userId,
          status: 'pending',
        },
        {
          title: 'Connect signup',
          type: 'other',
          dueDate: new Date('2026-10-01T00:00:00.000Z'),
          phase: 'english',
          scholarId: prepB.scholarId,
          assignedBy: staffActor.userId,
          status: 'pending',
        },
        {
          title: 'Hidden enrolled task',
          type: 'other',
          dueDate: new Date('2026-10-01T00:00:00.000Z'),
          scholarId: enrolled.scholarId,
          assignedBy: staffActor.userId,
          status: 'completed',
        },
        {
          title: 'Deleted overdue essay',
          type: 'other',
          dueDate: new Date('2020-01-01T00:00:00.000Z'),
          phase: 'English',
          scholarId: prepA.scholarId,
          assignedBy: staffActor.userId,
          status: 'pending',
          deletedAt: new Date('2026-08-01T00:00:00.000Z'),
        },
      ])
      .returning({ id: tasks.id });
    createdTaskIds.push(...rows.map((row) => row.id));
  }, 30000);

  afterAll(async () => {
    if (createdFileId) {
      await db.delete(requiredDocumentFiles).where(eq(requiredDocumentFiles.id, createdFileId));
    }
    await db
      .delete(scholarPlatformSetups)
      .where(eq(scholarPlatformSetups.scholarId, prepA.scholarId));
    await cleanupSeeded(db, {
      userIds: [staffActor.userId, prepA.userId, prepB.userId, enrolled.userId],
      scholarIds: [prepA.scholarId, prepB.scholarId, enrolled.scholarId],
      taskIds: createdTaskIds,
    });
    await pool.end();
    await app.close();
  }, 15000);

  it('returns the joined prep_year overview and CSV for staff', async () => {
    auth.setUser({ id: staffActor.userId, email: staffActor.email, userType: 'staff' });

    const res = await request(app.getHttpServer()).get('/api/prep-year/report').expect(200);
    const ids = res.body.scholars.map((row: { scholarId: string }) => row.scholarId);
    expect(ids).toEqual(expect.arrayContaining([prepA.scholarId, prepB.scholarId]));
    expect(ids).not.toContain(enrolled.scholarId);

    const ada = res.body.scholars.find(
      (row: { scholarId: string }) => row.scholarId === prepA.scholarId
    );
    expect(ada.intendedUniversity).toBe('Oxford');
    expect(ada.assignedCount).toBe(2);
    expect(ada.completedCount).toBe(1);
    expect(ada.overdueCount).toBe(1);
    expect(ada.completionRate).toBe(50);
    expect(ada.documents[ieltsTypeId]).toBe('submitted');
    expect(ada.platforms[courseraPlatformId]).toBe('yes');
    expect(res.body.filterOptions.phases).toEqual(['english', 'proposal']);

    const ben = res.body.scholars.find(
      (row: { scholarId: string }) => row.scholarId === prepB.scholarId
    );
    expect(ben.assignedCount).toBe(1);
    expect(ben.completedCount).toBe(0);
    expect(ben.completionRate).toBe(0);
    expect(ben.documents[ieltsTypeId]).toBe('missing');
    expect(ben.platforms[courseraPlatformId]).toBe('pending');

    const phaseRes = await request(app.getHttpServer())
      .get('/api/prep-year/report')
      .query({ phase: 'english' })
      .expect(200);
    expect(phaseRes.body.scholars).toHaveLength(res.body.scholars.length);
    const adaEnglish = phaseRes.body.scholars.find(
      (row: { scholarId: string }) => row.scholarId === prepA.scholarId
    );
    expect(adaEnglish.assignedCount).toBe(1);
    expect(adaEnglish.completedCount).toBe(1);
    expect(adaEnglish.overdueCount).toBe(0);
    expect(adaEnglish.completionRate).toBe(100);

    const one = await request(app.getHttpServer())
      .get('/api/prep-year/report')
      .query({ scholarId: prepB.scholarId })
      .expect(200);
    expect(one.body.scholars).toHaveLength(1);
    expect(one.body.scholars[0].scholarId).toBe(prepB.scholarId);

    const csv = await request(app.getHttpServer())
      .get('/api/prep-year/report/csv')
      .query({ scholarId: prepA.scholarId })
      .expect(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toContain('Ada Prep');
    expect(csv.text).toContain('Oxford');
    expect(csv.text).toContain('IELTS results');
    expect(csv.text).toContain('submitted');
    expect(csv.text).not.toContain('Ben Prep');
    expect(csv.text).not.toContain('Volunteer');
    expect(csv.text).not.toContain('Application');
  });

  it('rejects non-staff and invalid scholarId', async () => {
    auth.setUser({ id: prepA.userId, email: prepA.email, userType: 'scholar' });
    await request(app.getHttpServer()).get('/api/prep-year/report').expect(403);
    await request(app.getHttpServer()).get('/api/prep-year/report/csv').expect(403);

    auth.setUser({ id: staffActor.userId, email: staffActor.email, userType: 'staff' });
    await request(app.getHttpServer())
      .get('/api/prep-year/report')
      .query({ scholarId: 'not-a-uuid' })
      .expect(400);
  });
});
