import { afterEach, describe, expect, it } from '@jest/globals';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { createIntegrationApp } from './helpers/create-app';

describe('Swagger exposure (integration)', () => {
  let app: NestFastifyApplication | undefined;
  const previousNodeEnv = process.env.NODE_ENV;

  afterEach(async () => {
    process.env.NODE_ENV = previousNodeEnv;
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('returns 404 on /api and /api-json when NODE_ENV=production', async () => {
    process.env.NODE_ENV = 'production';
    app = await createIntegrationApp({ withSwagger: true });

    await request(app.getHttpServer()).get('/api').expect(404);
    await request(app.getHttpServer()).get('/api-json').expect(404);
  });

  it('serves /api and /api-json when NODE_ENV=test', async () => {
    process.env.NODE_ENV = 'test';
    app = await createIntegrationApp({ withSwagger: true });

    const ui = await request(app.getHttpServer()).get('/api').expect(200);
    expect(ui.text.toLowerCase()).toContain('swagger');

    const json = await request(app.getHttpServer()).get('/api-json').expect(200);
    expect(json.body).toEqual(
      expect.objectContaining({
        openapi: expect.any(String),
        info: expect.objectContaining({ title: 'Ashinaga API' }),
      })
    );
  });
});
