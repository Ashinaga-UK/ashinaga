import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { resourceFilters, resources } from '../../src/db/schema';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  getTestPool,
  type SeededScholar,
  type SeededStaff,
  seedScholarUser,
  seedStaffUser,
} from './helpers/seed';

describe('Resources API – scholar audience filtering (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;
  let staffActor: SeededStaff;
  let scholar: SeededScholar;

  const resourceIds: string[] = [];
  const visibleResourceIds: string[] = [];

  async function seedResource(
    title: string,
    filters: Array<{ filterType: string; filterValue: string }>
  ) {
    const [resource] = await db
      .insert(resources)
      .values({
        title,
        description: `${title} description`,
        type: 'Guide',
        category: 'Support',
        url: 'https://example.com/resource',
        status: 'live',
        createdBy: staffActor.userId,
        updatedBy: staffActor.userId,
      })
      .returning({ id: resources.id });

    if (!resource) throw new Error('Failed to seed resource');
    resourceIds.push(resource.id);

    if (filters.length > 0) {
      await db.insert(resourceFilters).values(
        filters.map((filter) => ({
          resourceId: resource.id,
          ...filter,
        }))
      );
    }

    return resource.id;
  }

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
    auth = built.auth;
    const testDatabase = getTestPool();
    pool = testDatabase.pool;
    db = testDatabase.db;

    staffActor = await seedStaffUser(db, { name: 'Resource Test Staff' });
    scholar = await seedScholarUser(db, {
      name: 'Resource Test Scholar',
      program: 'Medicine',
      year: 'Year 1',
      university: 'Makerere University',
    });

    visibleResourceIds.push(
      await seedResource('Unrestricted', []),
      await seedResource('Same-type OR', [
        { filterType: 'program', filterValue: 'Nursing' },
        { filterType: 'program', filterValue: 'Medicine' },
      ]),
      await seedResource('Case-insensitive AND', [
        { filterType: 'program', filterValue: 'medicine' },
        { filterType: 'university', filterValue: 'makerere university' },
      ])
    );
    await seedResource('Cross-type mismatch', [
      { filterType: 'program', filterValue: 'Medicine' },
      { filterType: 'year', filterValue: 'Year 2' },
    ]);
    await seedResource('Unknown filter type', [
      { filterType: 'programme', filterValue: 'Medicine' },
    ]);

    auth.setUser({
      id: scholar.userId,
      email: scholar.email,
      userType: 'scholar',
    });
  }, 30000);

  afterAll(async () => {
    if (resourceIds.length > 0) {
      await db.delete(resources).where(inArray(resources.id, resourceIds));
    }
    await cleanupSeeded(db, {
      userIds: [staffActor.userId, scholar.userId],
      scholarIds: [scholar.scholarId],
    });
    await pool.end();
    await app.close();
  }, 15000);

  it('returns only resources whose audience groups match the scholar', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/resources/my-resources')
      .expect(200);
    const returnedSeededIds = response.body
      .map((resource: { id: string }) => resource.id)
      .filter((resourceId: string) => resourceIds.includes(resourceId))
      .sort();

    expect(returnedSeededIds).toEqual([...visibleResourceIds].sort());
  });
});
