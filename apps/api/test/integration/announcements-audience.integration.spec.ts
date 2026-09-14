/**
 * Integration tests for announcement audience filtering.
 *
 * An announcement created with no audience filters is a broadcast: it is
 * delivered to every scholar. The staff-side year/program/university filters
 * are a *view* over the list, so narrowing the view must not drop broadcasts —
 * they were delivered to the scholars being filtered for.
 *
 * The manual QA pack checks that filters filter (S78); it does not check that
 * unfiltered announcements survive being filtered.
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { announcements } from '../../src/db/schema';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  getTestPool,
  type SeededScholar,
  type SeededStaff,
  seedScholarUser,
  seedStaffUser,
} from './helpers/seed';

const TARGET_YEAR = 'Year 1';
const OTHER_YEAR = 'Year 3';

describe('Announcements audience filtering (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;

  let staffUser: SeededStaff;
  let scholarInYear: SeededScholar;

  let broadcastId: string;
  let targetedId: string;
  let otherYearId: string;

  const createdAnnouncementIds: string[] = [];

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
    auth = built.auth;
    const tdb = getTestPool();
    pool = tdb.pool;
    db = tdb.db;

    staffUser = await seedStaffUser(db, { name: 'Audience Staff' });
    scholarInYear = await seedScholarUser(db, {
      name: 'Audience Scholar',
      year: TARGET_YEAR,
    });

    auth.setUser({ id: staffUser.userId, email: staffUser.email, userType: 'staff' });

    broadcastId = await createAnnouncement('Broadcast to everyone', []);
    targetedId = await createAnnouncement('Targeted at the year', [
      { filterType: 'year', filterValue: TARGET_YEAR },
    ]);
    otherYearId = await createAnnouncement('Targeted at another year', [
      { filterType: 'year', filterValue: OTHER_YEAR },
    ]);
  }, 30000);

  afterAll(async () => {
    for (const id of createdAnnouncementIds) {
      await db
        .delete(announcements)
        .where(eq(announcements.id, id))
        .catch(() => undefined);
    }
    await cleanupSeeded(db, {
      userIds: [staffUser.userId, scholarInYear.userId],
      scholarIds: [scholarInYear.scholarId],
    });
    await pool.end();
    await app.close();
  }, 15000);

  async function createAnnouncement(
    title: string,
    filters: Array<{ filterType: string; filterValue: string }>
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/announcements')
      .send({ title, content: `${title} — integration fixture.`, filters });
    expect(res.status).toBeLessThan(400);
    createdAnnouncementIds.push(res.body.id);
    return res.body.id;
  }

  async function listAsStaff(query: string): Promise<string[]> {
    auth.setUser({ id: staffUser.userId, email: staffUser.email, userType: 'staff' });
    const res = await request(app.getHttpServer()).get(`/api/announcements${query}`);
    expect(res.status).toBe(200);
    return res.body.map((a: { id: string }) => a.id);
  }

  it('returns every announcement when no filter is applied', async () => {
    const ids = await listAsStaff('');

    expect(ids).toEqual(expect.arrayContaining([broadcastId, targetedId, otherYearId]));
  });

  it('keeps a broadcast announcement visible when filtering by year', async () => {
    const ids = await listAsStaff(`?year=${encodeURIComponent(TARGET_YEAR)}`);

    expect(ids).toContain(broadcastId);
  });

  it('still returns the announcement targeted at that year', async () => {
    const ids = await listAsStaff(`?year=${encodeURIComponent(TARGET_YEAR)}`);

    expect(ids).toContain(targetedId);
  });

  it('excludes an announcement targeted at a different year', async () => {
    const ids = await listAsStaff(`?year=${encodeURIComponent(TARGET_YEAR)}`);

    expect(ids).not.toContain(otherYearId);
  });
});
