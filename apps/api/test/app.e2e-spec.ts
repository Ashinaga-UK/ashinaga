import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // The API runs on Fastify; without an adapter Nest falls back to the
    // (uninstalled) Express platform and exits.
    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET) returns the API landing page', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .then((res) => {
        expect(res.text).toContain('Ashinaga API');
        expect(res.text).toContain('The API is running and ready to serve requests.');
      });
  });
});
