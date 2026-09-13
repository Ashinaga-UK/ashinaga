import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createAuthenticatedIntegrationApp } from './helpers/create-app';

describe('Notification jobs (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  const previousSecret = process.env.CRON_SECRET;

  beforeAll(async () => {
    delete process.env.CRON_SECRET;
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
  });

  afterAll(async () => {
    if (previousSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previousSecret;
    }
    await app.close();
  });

  it('returns 503 when CRON_SECRET is not configured', async () => {
    await request(app.getHttpServer()).post('/api/jobs/notifications').expect(503);
  });
});
