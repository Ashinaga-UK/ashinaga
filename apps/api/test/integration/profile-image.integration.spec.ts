/**
 * Integration: profile PATCH rejects legacy data-URL image bodies (ASH-104).
 * Avatars must be uploaded via POST /api/avatars/upload-url + S3, then confirmed with a key.
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  getTestPool,
  type SeededScholar,
  seedScholarUser,
} from './helpers/seed';

describe('Profile image save (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;
  let scholar: SeededScholar;

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
    auth = built.auth;
    const testDb = getTestPool();
    pool = testDb.pool;
    db = testDb.db;
    scholar = await seedScholarUser(db, { name: 'Profile Image Scholar' });
    auth.setUser({ id: scholar.userId, email: scholar.email, userType: 'scholar' });
  }, 30000);

  afterAll(async () => {
    await cleanupSeeded(db, {
      userIds: [scholar.userId],
      scholarIds: [scholar.scholarId],
    });
    await pool.end();
    await app.close();
  }, 15000);

  it('rejects data-URL profile images', async () => {
    const image = `data:image/jpeg;base64,${'A'.repeat(100)}`;

    const res = await request(app.getHttpServer())
      .patch('/api/scholars/my-profile')
      .send({ image })
      .expect(400);

    expect(String(res.body.message || res.body.error || '')).toMatch(/object storage|Invalid/i);
  });
});
