/**
 * Integration: profile picture save with a data URL larger than Fastify's default 1MB bodyLimit.
 * Proves bodyLimit (5MB), validateProfileImage, and persistence work together.
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { users } from '../../src/db/schema';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  getTestPool,
  type SeededScholar,
  seedScholarUser,
} from './helpers/seed';

const OVER_ONE_MB = Math.ceil(1.2 * 1024 * 1024);

function jpegDataUrlLargerThan1Mb(): string {
  return `data:image/jpeg;base64,${'A'.repeat(OVER_ONE_MB)}`;
}

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

  it('saves a profile image larger than 1MB', async () => {
    const image = jpegDataUrlLargerThan1Mb();
    expect(image.length).toBeGreaterThan(1024 * 1024);

    const res = await request(app.getHttpServer())
      .patch('/api/scholars/my-profile')
      .send({ image })
      .expect(200);

    expect(res.body.image).toBe(image);

    const [row] = await db
      .select({ image: users.image })
      .from(users)
      .where(eq(users.id, scholar.userId))
      .limit(1);

    expect(row?.image).toBe(image);
  });
});
