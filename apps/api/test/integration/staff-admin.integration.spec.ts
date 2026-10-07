/**
 * Integration tests for ASH-120: super-admins grant or revoke admin access
 * via PATCH /api/users/staff/:userId.
 *
 * The last-super-admin guard is covered in users.service.spec.ts; the shared
 * integration database always has other seeded super-admins, so it cannot be
 * reached here.
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { staff } from '../../src/db/schema';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  getTestPool,
  type SeededScholar,
  type SeededStaff,
  seedScholarUser,
  seedStaffUser,
} from './helpers/seed';

describe('Staff admin access (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;

  let superAdmin: SeededStaff;
  let viewer: SeededStaff;
  let colleague: SeededStaff;
  let leaver: SeededStaff;
  let scholar: SeededScholar;

  const actAs = (user: SeededStaff) =>
    auth.setUser({ id: user.userId, email: user.email, userType: 'staff' });

  const staffRow = async (userId: string) => {
    const [row] = await db.select().from(staff).where(eq(staff.userId, userId));
    return row;
  };

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
    auth = built.auth;
    const tdb = getTestPool();
    pool = tdb.pool;
    db = tdb.db;

    superAdmin = await seedStaffUser(db, { name: 'Admin Grant Super', isSuperAdmin: true });
    viewer = await seedStaffUser(db, { name: 'Admin Grant Viewer' });
    colleague = await seedStaffUser(db, { name: 'Admin Grant Colleague' });
    leaver = await seedStaffUser(db, { name: 'Admin Grant Leaver' });
    scholar = await seedScholarUser(db, { name: 'Admin Grant Scholar' });

    await db.update(staff).set({ role: 'viewer' }).where(eq(staff.userId, colleague.userId));
  }, 30000);

  afterAll(async () => {
    await cleanupSeeded(db, {
      userIds: [superAdmin.userId, viewer.userId, colleague.userId, leaver.userId, scholar.userId],
      scholarIds: [scholar.scholarId],
    });
    await pool.end();
    await app.close();
  }, 15000);

  it('returns 403 when a non-super-admin tries to grant admin', async () => {
    actAs(viewer);
    await request(app.getHttpServer())
      .patch(`/api/users/staff/${colleague.userId}`)
      .send({ isSuperAdmin: true })
      .expect(403);

    expect((await staffRow(colleague.userId))?.isSuperAdmin).toBe(false);
  });

  it('returns 400 when a super-admin targets themselves', async () => {
    actAs(superAdmin);
    await request(app.getHttpServer())
      .patch(`/api/users/staff/${superAdmin.userId}`)
      .send({ isSuperAdmin: false })
      .expect(400);
  });

  it('returns 400 for a body without a boolean isSuperAdmin', async () => {
    actAs(superAdmin);
    await request(app.getHttpServer())
      .patch(`/api/users/staff/${colleague.userId}`)
      .send({ isSuperAdmin: 'yes' })
      .expect(400);
  });

  it('returns 404 when the target is a scholar', async () => {
    actAs(superAdmin);
    await request(app.getHttpServer())
      .patch(`/api/users/staff/${scholar.userId}`)
      .send({ isSuperAdmin: true })
      .expect(404);
  });

  it('promotes a colleague, who can then manage staff', async () => {
    actAs(superAdmin);
    const res = await request(app.getHttpServer())
      .patch(`/api/users/staff/${colleague.userId}`)
      .send({ isSuperAdmin: true })
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      userId: colleague.userId,
      isSuperAdmin: true,
      role: 'admin',
    });
    const row = await staffRow(colleague.userId);
    expect(row?.isSuperAdmin).toBe(true);
    expect(row?.role).toBe('admin');

    actAs(colleague);
    const view = await request(app.getHttpServer()).get('/api/users/staff/manage').expect(200);
    expect(view.body.canManage).toBe(true);

    await request(app.getHttpServer()).delete(`/api/users/staff/${leaver.userId}`).expect(200);
    expect((await staffRow(leaver.userId))?.isActive).toBe(false);
  });

  it('returns 400 when the target is inactive staff', async () => {
    actAs(superAdmin);
    await request(app.getHttpServer())
      .patch(`/api/users/staff/${leaver.userId}`)
      .send({ isSuperAdmin: true })
      .expect(400);
  });

  it('demotes the colleague back to viewer', async () => {
    actAs(superAdmin);
    await request(app.getHttpServer())
      .patch(`/api/users/staff/${colleague.userId}`)
      .send({ isSuperAdmin: false })
      .expect(200);

    const row = await staffRow(colleague.userId);
    expect(row?.isSuperAdmin).toBe(false);
    expect(row?.role).toBe('viewer');

    actAs(colleague);
    const view = await request(app.getHttpServer()).get('/api/users/staff/manage').expect(200);
    expect(view.body.canManage).toBe(false);
  });
});
