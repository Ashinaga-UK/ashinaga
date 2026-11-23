import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { eq, sql } from 'drizzle-orm';
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

describe('GET /api/submissions/report (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;
  let superAdmin: SeededStaff;
  let regularStaff: SeededStaff;
  let active: SeededScholar;
  let variant: SeededScholar;
  let inactive: SeededScholar;
  const program = `Submissions IT ${Date.now()}`;

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
    auth = built.auth;
    const testDatabase = getTestPool();
    pool = testDatabase.pool;
    db = testDatabase.db;

    superAdmin = await seedStaffUser(db, { isSuperAdmin: true, name: 'Report Super Admin' });
    regularStaff = await seedStaffUser(db, { name: 'Report Staff' });
    active = await seedScholarUser(db, { name: 'Active Scholar', program, year: '2026' });
    // Same cohort once trimmed and case-folded.
    variant = await seedScholarUser(db, {
      name: 'Variant Scholar',
      program: `  ${program.toUpperCase()} `,
      year: ' 2026',
    });
    inactive = await seedScholarUser(db, { name: 'Inactive Scholar', program, year: '2025' });
    await db
      .update(scholars)
      .set({ status: 'inactive' })
      .where(eq(scholars.id, inactive.scholarId));

    await db.insert(requests).values([
      {
        scholarId: active.scholarId,
        type: 'others',
        description: 'Last minute of January UTC',
        submittedDate: new Date('2025-01-31T23:30:00.000Z'),
      },
      {
        scholarId: active.scholarId,
        type: 'others',
        description: 'First minutes of February UTC',
        submittedDate: new Date('2025-02-01T00:30:00.000Z'),
      },
      {
        scholarId: variant.scholarId,
        type: 'extenuating_circumstances',
        description: 'Archived request',
        submittedDate: new Date('2025-02-15T12:00:00.000Z'),
        archived: true,
        archivedAt: new Date('2025-03-01T12:00:00.000Z'),
      },
      {
        scholarId: inactive.scholarId,
        type: 'summer_funding_request',
        description: 'Inactive scholar request',
        submittedDate: new Date('2025-02-20T12:00:00.000Z'),
      },
    ]);
  }, 30000);

  afterAll(async () => {
    await cleanupSeeded(db, {
      userIds: [
        superAdmin.userId,
        regularStaff.userId,
        active.userId,
        variant.userId,
        inactive.userId,
      ],
      scholarIds: [active.scholarId, variant.scholarId, inactive.scholarId],
    });
    await pool.end();
    await app.close();
  }, 15000);

  function asSuperAdmin() {
    auth.setUser({ id: superAdmin.userId, email: superAdmin.email, userType: 'staff' });
  }

  async function rawCount(where: ReturnType<typeof sql>) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(requests)
      .innerJoin(scholars, eq(requests.scholarId, scholars.id))
      .where(where);
    return Number(row?.count);
  }

  const programMatch = sql`lower(btrim(${scholars.program})) = ${program.toLowerCase()}`;

  it('totals match a raw count and bucket by UTC month, type and folded cohort', async () => {
    asSuperAdmin();
    const res = await request(app.getHttpServer())
      .get('/api/submissions/report')
      .query({ program })
      .expect(200);

    expect(res.body.summary.total).toBe(await rawCount(programMatch));
    expect(res.body.summary).toEqual({
      total: 4,
      byType: { others: 2, extenuating_circumstances: 1, summer_funding_request: 1 },
    });
    expect(res.body.months).toEqual([
      { month: '2025-01', total: 1, byType: { others: 1 } },
      {
        month: '2025-02',
        total: 3,
        byType: { others: 1, extenuating_circumstances: 1, summer_funding_request: 1 },
      },
    ]);
    expect(res.body.cohorts).toEqual([
      { program, year: '2025', total: 1, byType: { summer_funding_request: 1 } },
      expect.objectContaining({ year: '2026', total: 3 }),
    ]);
    expect(res.body.cohorts[1].program.toLowerCase()).toBe(program.toLowerCase());
  });

  it('includes archived requests and requests from inactive scholars', async () => {
    asSuperAdmin();
    const archived = await request(app.getHttpServer())
      .get('/api/submissions/report')
      .query({ program, type: 'extenuating_circumstances' })
      .expect(200);
    expect(archived.body.summary.total).toBe(1);

    const inactiveCohort = await request(app.getHttpServer())
      .get('/api/submissions/report')
      .query({ program, year: '2025' })
      .expect(200);
    expect(inactiveCohort.body.summary).toEqual({
      total: 1,
      byType: { summer_funding_request: 1 },
    });
  });

  it('applies type, year, program and date filters', async () => {
    asSuperAdmin();
    const byType = await request(app.getHttpServer())
      .get('/api/submissions/report')
      .query({ program, type: 'others' })
      .expect(200);
    expect(byType.body.summary.total).toBe(
      await rawCount(sql`${programMatch} and ${requests.type} = 'others'`)
    );
    expect(byType.body.summary.total).toBe(2);

    const byYear = await request(app.getHttpServer())
      .get('/api/submissions/report')
      .query({ program: ` ${program.toUpperCase()}`, year: '2026 ' })
      .expect(200);
    expect(byYear.body.summary.total).toBe(3);

    const ranged = await request(app.getHttpServer())
      .get('/api/submissions/report')
      .query({ program, from: '2025-02-01', to: '2025-02-15' })
      .expect(200);
    expect(ranged.body.summary.total).toBe(2);
    expect(ranged.body.months.map((row: { month: string }) => row.month)).toEqual(['2025-02']);

    await request(app.getHttpServer())
      .get('/api/submissions/report')
      .query({ from: '2025-02-02', to: '2025-02-01' })
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/submissions/report')
      .query({ type: 'not_a_type' })
      .expect(400);
  });

  it('exports GET /api/submissions/report/csv with one line per aggregate row', async () => {
    asSuperAdmin();
    const json = await request(app.getHttpServer())
      .get('/api/submissions/report')
      .query({ program })
      .expect(200);
    const csv = await request(app.getHttpServer())
      .get('/api/submissions/report/csv')
      .query({ program })
      .expect(200);

    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.headers['content-disposition']).toContain('submissions-report.csv');
    const lines = csv.text.split('\n');
    expect(lines[0]).toBe('"Month","Request type","Program","Year","Submissions"');
    expect(lines).toHaveLength(json.body.rows.length + 1);
    expect(csv.text).toContain(`"2025-01","others","${program}","2026","1"`);
    expect(csv.text).toContain('"extenuating_circumstances"');
    const csvTotal = lines
      .slice(1)
      .reduce((sum, line) => sum + Number(line.split(',').at(-1)?.replace(/"/g, '')), 0);
    expect(csvTotal).toBe(json.body.summary.total);
  });

  it('rejects staff who are not super admins, scholars and unauthenticated callers', async () => {
    auth.setUser({ id: regularStaff.userId, email: regularStaff.email, userType: 'staff' });
    await request(app.getHttpServer()).get('/api/submissions/report').expect(403);
    await request(app.getHttpServer()).get('/api/submissions/report/csv').expect(403);

    auth.setUser({ id: active.userId, email: active.email, userType: 'scholar' });
    await request(app.getHttpServer()).get('/api/submissions/report').expect(403);
    await request(app.getHttpServer()).get('/api/submissions/report/csv').expect(403);

    auth.setUser(null);
    await request(app.getHttpServer()).get('/api/submissions/report').expect(401);
    await request(app.getHttpServer()).get('/api/submissions/report/csv').expect(401);
  });
});
