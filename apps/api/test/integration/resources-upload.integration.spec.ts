import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { resources } from '../../src/db/schema';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  getTestPool,
  type SeededScholar,
  type SeededStaff,
  seedScholarUser,
  seedStaffUser,
} from './helpers/seed';

describe('Resources API – file uploads (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;
  let staffActor: SeededStaff;
  let scholar: SeededScholar;
  let outsider: SeededScholar;
  let createdResourceId: string | undefined;

  const objectStorage = {
    createUploadUrl: jest.fn(async (input: { key: string }) => ({
      url: 'https://s3.example/post',
      fields: { key: input.key, Policy: 'policy' },
    })),
    createDownloadUrl: jest.fn(async () => 'https://s3.example/signed-get'),
    headObject: jest.fn(async () => ({
      contentType: 'application/pdf',
      contentLength: 2048,
    })),
    copyObject: jest.fn(async () => undefined),
    deleteObject: jest.fn(async () => undefined),
  };

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp({ objectStorage });
    app = built.app;
    auth = built.auth;
    const testDatabase = getTestPool();
    pool = testDatabase.pool;
    db = testDatabase.db;

    staffActor = await seedStaffUser(db, { name: 'Resource Upload Staff' });
    scholar = await seedScholarUser(db, {
      name: 'Resource Upload Scholar',
      program: 'Medicine',
      year: 'Year 1',
      university: 'Makerere University',
    });
    outsider = await seedScholarUser(db, {
      name: 'Resource Upload Outsider',
      program: 'Nursing',
      year: 'Year 2',
      university: 'Other University',
    });
  }, 30000);

  afterAll(async () => {
    if (createdResourceId) {
      await db.delete(resources).where(eq(resources.id, createdResourceId));
    }
    await cleanupSeeded(db, {
      userIds: [staffActor.userId, scholar.userId, outsider.userId],
      scholarIds: [scholar.scholarId, outsider.scholarId],
    });
    await pool.end();
    await app.close();
  }, 15000);

  it('walks upload-url, create, copy, and gated download', async () => {
    auth.setUser({
      id: staffActor.userId,
      email: staffActor.email,
      userType: 'staff',
    });

    const uploadResponse = await request(app.getHttpServer())
      .post('/api/resources/upload-url')
      .send({
        fileName: 'handbook.pdf',
        fileType: 'application/pdf',
        fileSize: 2048,
      })
      .expect(201);

    expect(uploadResponse.body.uploadUrl).toBe('https://s3.example/post');
    expect(uploadResponse.body.fileKey).toMatch(/^resources\/pending\//);
    expect(objectStorage.createUploadUrl).toHaveBeenCalled();

    const createResponse = await request(app.getHttpServer())
      .post('/api/resources')
      .send({
        title: 'Uploaded Handbook',
        description: 'File resource',
        type: 'Handbook',
        category: 'Handbook',
        sourceType: 'file',
        status: 'live',
        pendingFileKey: uploadResponse.body.fileKey,
        fileName: 'handbook.pdf',
        fileMimeType: 'application/pdf',
        fileSizeBytes: 2048,
        filters: [{ filterType: 'program', filterValue: 'Medicine' }],
      })
      .expect(201);

    createdResourceId = createResponse.body.id;
    expect(createResponse.body.sourceType).toBe('file');
    expect(createResponse.body.fileName).toBe('handbook.pdf');
    expect(objectStorage.headObject).toHaveBeenCalledWith(uploadResponse.body.fileKey);
    expect(objectStorage.copyObject).toHaveBeenCalled();

    auth.setUser({
      id: scholar.userId,
      email: scholar.email,
      userType: 'scholar',
    });

    const listResponse = await request(app.getHttpServer())
      .get('/api/resources/my-resources')
      .expect(200);
    expect(
      listResponse.body.some((resource: { id: string }) => resource.id === createdResourceId)
    ).toBe(true);

    const downloadResponse = await request(app.getHttpServer())
      .get(`/api/resources/${createdResourceId}/download`)
      .expect(200);
    expect(downloadResponse.body.downloadUrl).toBe('https://s3.example/signed-get');
    expect(objectStorage.createDownloadUrl).toHaveBeenLastCalledWith(
      expect.objectContaining({
        contentDisposition: expect.stringMatching(/^attachment;/),
      })
    );

    const viewResponse = await request(app.getHttpServer())
      .get(`/api/resources/${createdResourceId}/download?disposition=inline`)
      .expect(200);
    expect(viewResponse.body.downloadUrl).toBe('https://s3.example/signed-get');
    expect(objectStorage.createDownloadUrl).toHaveBeenLastCalledWith(
      expect.objectContaining({
        contentDisposition: expect.stringMatching(/^inline;/),
      })
    );

    auth.setUser({
      id: outsider.userId,
      email: outsider.email,
      userType: 'scholar',
    });

    await request(app.getHttpServer())
      .get(`/api/resources/${createdResourceId}/download`)
      .expect(404);

    auth.setUser({
      id: staffActor.userId,
      email: staffActor.email,
      userType: 'staff',
    });

    await request(app.getHttpServer())
      .patch(`/api/resources/${createdResourceId}`)
      .send({
        sourceType: 'url',
        url: 'https://example.com/handbook',
      })
      .expect(400);
  });
});
