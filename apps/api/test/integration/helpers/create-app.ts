import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from '../../../src/app.module';

/**
 * Create a Nest application instance for integration tests.
 * Uses Fastify (same as production) and applies global validation pipe.
 */
export async function createIntegrationApp(): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    logger: ['error', 'warn'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  // `app.init()` sets up the Fastify server but does NOT bind it to a port,
  // so `supertest` requests would hang forever. Start listening on an
  // ephemeral port (0) so the underlying HTTP server accepts connections.
  await app.init();
  await app.listen(0);
  return app;
}
