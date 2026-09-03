import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { requiredDocumentFiles, requiredDocumentTypes } from '../../src/db/schema';
import { type AuthContext, createAuthenticatedIntegrationApp } from './helpers/create-app';
import {
  cleanupSeeded,
  getTestPool,
  type SeededScholar,
  type SeededStaff,
  seedScholarUser,
  seedStaffUser,
} from './helpers/seed';

describe('Required documents API (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;
  let staffActor: SeededStaff;
  let prepScholar: SeededScholar;
  let enrolledScholar: SeededScholar;
  let createdFileId: string | undefined;
  let passportTypeId: string;

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

    staffActor = await seedStaffUser(db, { name: 'Documents Staff' });
    prepScholar = await seedScholarUser(db, {
      name: 'Prep Candidate',
      programStage: 'prep_year',
    });
    enrolledScholar = await seedScholarUser(db, {
      name: 'Enrolled Scholar',
      programStage: 'scholar',
    });

    const [passport] = await db
      .select()
      .from(requiredDocumentTypes)
      .where(eq(requiredDocumentTypes.slug, 'passport'))
      .limit(1);
    if (!passport) {
      throw new Error('Expected seeded passport document type');
    }
    passportTypeId = passport.id;
  }, 30000);

  afterAll(async () => {
    if (createdFileId) {
      await db.delete(requiredDocumentFiles).where(eq(requiredDocumentFiles.id, createdFileId));
    }
    await cleanupSeeded(db, {
      userIds: [staffActor.userId, prepScholar.userId, enrolledScholar.userId],
      scholarIds: [prepScholar.scholarId, enrolledScholar.scholarId],
    });
    await pool.end();
    await app.close();
  }, 15000);

  it('lets a prep candidate upload and lets staff see missing vs submitted plus download', async () => {
    auth.setUser({
      id: enrolledScholar.userId,
      email: enrolledScholar.email,
      userType: 'scholar',
    });
    await request(app.getHttpServer())
      .post('/api/documents/upload-url')
      .send({
        typeId: passportTypeId,
        fileName: 'passport.pdf',
        fileType: 'application/pdf',
        fileSize: 2048,
      })
      .expect(403);

    auth.setUser({
      id: prepScholar.userId,
      email: prepScholar.email,
      userType: 'scholar',
    });

    const uploadResponse = await request(app.getHttpServer())
      .post('/api/documents/upload-url')
      .send({
        typeId: passportTypeId,
        fileName: 'passport.pdf',
        fileType: 'application/pdf',
        fileSize: 2048,
      })
      .expect(201);

    expect(uploadResponse.body.fileKey).toMatch(
      new RegExp(`^documents/pending/${prepScholar.scholarId}/`)
    );

    const confirmResponse = await request(app.getHttpServer())
      .post('/api/documents')
      .send({
        typeId: passportTypeId,
        pendingFileKey: uploadResponse.body.fileKey,
        fileName: 'passport.pdf',
        fileMimeType: 'application/pdf',
        fileSizeBytes: 2048,
      })
      .expect(201);

    createdFileId = confirmResponse.body.id;
    expect(objectStorage.copyObject).toHaveBeenCalled();

    const checklist = await request(app.getHttpServer())
      .get('/api/documents/my-checklist')
      .expect(200);
    const passportItem = checklist.body.items.find(
      (item: { type: { slug: string } }) => item.type.slug === 'passport'
    );
    expect(passportItem.status).toBe('submitted');

    auth.setUser({
      id: enrolledScholar.userId,
      email: enrolledScholar.email,
      userType: 'scholar',
    });
    await request(app.getHttpServer()).get(`/api/documents/${createdFileId}/download`).expect(404);

    auth.setUser({
      id: staffActor.userId,
      email: staffActor.email,
      userType: 'staff',
    });

    const cohort = await request(app.getHttpServer()).get('/api/documents/cohort').expect(200);
    const prepRow = cohort.body.scholars.find(
      (row: { scholarId: string }) => row.scholarId === prepScholar.scholarId
    );
    expect(prepRow).toBeDefined();
    const submittedCell = prepRow.items.find(
      (item: { typeId: string }) => item.typeId === passportTypeId
    );
    expect(submittedCell.status).toBe('submitted');

    const missingOnly = await request(app.getHttpServer())
      .get(`/api/documents/cohort?missingTypeId=${passportTypeId}`)
      .expect(200);
    expect(
      missingOnly.body.scholars.some(
        (row: { scholarId: string }) => row.scholarId === prepScholar.scholarId
      )
    ).toBe(false);

    const download = await request(app.getHttpServer())
      .get(`/api/documents/${createdFileId}/download`)
      .expect(200);
    expect(download.body.downloadUrl).toBe('https://s3.example/signed-get');
  });
});
