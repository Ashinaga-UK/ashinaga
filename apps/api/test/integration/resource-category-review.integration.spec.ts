import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { proposalStepResources, resourceCategoryReviews, resources } from '../../src/db/schema';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  getTestPool,
  type SeededScholar,
  type SeededStaff,
  seedScholarUser,
  seedStaffUser,
} from './helpers/seed';

describe('resource category review queue', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;
  let staffActor: SeededStaff;
  let scholar: SeededScholar;
  let resourceId: string;

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
    auth = built.auth;
    const testDatabase = getTestPool();
    pool = testDatabase.pool;
    db = testDatabase.db;

    staffActor = await seedStaffUser(db, { name: 'Resource Category Reviewer' });
    scholar = await seedScholarUser(db, { name: 'Resource Category Scholar' });
    const [resource] = await db
      .insert(resources)
      .values({
        title: 'Pending category resource',
        description: 'Awaiting review',
        type: 'Guide',
        category: 'Other',
        proposalContext: true,
        status: 'live',
        url: 'https://example.com/resource',
        createdBy: staffActor.userId,
        updatedBy: staffActor.userId,
      })
      .returning({ id: resources.id });
    if (!resource) throw new Error('Failed to seed pending resource');
    resourceId = resource.id;

    await db.insert(resourceCategoryReviews).values({
      resourceId,
      resourceTitle: 'Pending category resource',
      legacyCategory: 'Proposal',
    });
    auth.setUser({
      id: staffActor.userId,
      email: staffActor.email,
      userType: 'staff',
    });
  }, 30000);

  afterAll(async () => {
    await db.delete(resources).where(eq(resources.id, resourceId));
    await cleanupSeeded(db, {
      userIds: [staffActor.userId, scholar.userId],
      scholarIds: [scholar.scholarId],
    });
    await pool.end();
    await app.close();
  });

  it('returns pending resources as unassigned and records the staff assignment', async () => {
    const listResponse = await request(app.getHttpServer()).get('/api/resources').expect(200);
    const pending = listResponse.body.find(
      (resource: { id: string }) => resource.id === resourceId
    );
    expect(pending).toEqual(
      expect.objectContaining({
        category: null,
        categoryReviewPending: true,
        legacyCategory: 'Proposal',
        proposalContext: true,
      })
    );

    auth.setUser({
      id: scholar.userId,
      email: scholar.email,
      userType: 'scholar',
    });
    const scholarResponse = await request(app.getHttpServer())
      .get('/api/resources/my-resources')
      .expect(200);
    const scholarPending = scholarResponse.body.find(
      (resource: { id: string }) => resource.id === resourceId
    );
    expect(scholarPending).toEqual(
      expect.objectContaining({
        category: null,
        categoryReviewPending: true,
        proposalContext: true,
      })
    );
    expect(scholarPending).not.toHaveProperty('legacyCategory');

    auth.setUser({
      id: staffActor.userId,
      email: staffActor.email,
      userType: 'staff',
    });
    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/resources/${resourceId}`)
      .send({ category: 'Workbooks' })
      .expect(200);
    expect(updateResponse.body).toEqual(
      expect.objectContaining({
        category: 'Workbooks',
        categoryReviewPending: false,
        legacyCategory: null,
        proposalContext: true,
      })
    );

    const [review] = await db
      .select()
      .from(resourceCategoryReviews)
      .where(eq(resourceCategoryReviews.resourceId, resourceId));
    expect(review).toEqual(
      expect.objectContaining({
        legacyCategory: 'Proposal',
        finalCategory: 'Workbooks',
        reviewedBy: staffActor.userId,
        reviewedAt: expect.any(Date),
      })
    );

    await request(app.getHttpServer())
      .post('/api/proposals/steps/topic/resources')
      .send({ resourceId })
      .expect(201);
    const [proposalResource] = await db
      .select()
      .from(proposalStepResources)
      .where(eq(proposalStepResources.resourceId, resourceId));
    expect(proposalResource).toEqual(expect.objectContaining({ stepKey: 'topic', resourceId }));

    const originalReviewedAt = review?.reviewedAt;
    const unrelatedUpdateResponse = await request(app.getHttpServer())
      .patch(`/api/resources/${resourceId}`)
      .send({
        title: 'Updated pending category resource',
        category: 'Workbooks',
        proposalContext: false,
      })
      .expect(200);
    expect(unrelatedUpdateResponse.body).toEqual(
      expect.objectContaining({
        title: 'Updated pending category resource',
        category: 'Workbooks',
        categoryReviewPending: false,
        legacyCategory: null,
        proposalContext: false,
      })
    );

    const [unchangedReview] = await db
      .select()
      .from(resourceCategoryReviews)
      .where(eq(resourceCategoryReviews.resourceId, resourceId));
    expect(unchangedReview).toEqual(
      expect.objectContaining({
        finalCategory: 'Workbooks',
        reviewedBy: staffActor.userId,
        reviewedAt: originalReviewedAt,
      })
    );
  });
});
