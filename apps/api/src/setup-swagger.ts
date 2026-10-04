import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { shouldExposeSwagger } from './swagger-exposure';

export { shouldExposeSwagger } from './swagger-exposure';

/**
 * Nest's FastifyAdapter loads `@fastify/static` via a nested `require()` that
 * fails under Jest + pnpm (ESM transitive deps). Swagger JSON/UI routes still
 * register without serving the swagger-ui asset files here; `nest start` uses
 * the normal adapter path and serves assets in development/test.
 */
function bindFastifyStatic(app: NestFastifyApplication): void {
  const adapter = app.getHttpAdapter() as {
    useStaticAssets: (opts: unknown) => unknown;
  };
  try {
    // Prefer the real plugin when Node can resolve it (dev server / App Runner).
    const fastifyStatic = require('@fastify/static') as unknown;
    const registerable = app.getHttpAdapter() as {
      register: (plugin: unknown, opts?: unknown) => unknown;
      useStaticAssets: (opts: unknown) => unknown;
    };
    registerable.useStaticAssets = (options: unknown) =>
      registerable.register(fastifyStatic, options);
  } catch {
    // Jest cannot load @fastify/static's ESM graph; skip asset hosting only.
    adapter.useStaticAssets = () => undefined;
  }
}

/**
 * Mount Swagger UI at `/api` (and `/api-json`) when allowed.
 * Returns whether docs were mounted.
 */
export function setupSwagger(app: NestFastifyApplication): boolean {
  if (!shouldExposeSwagger()) {
    return false;
  }

  bindFastifyStatic(app);

  const config = new DocumentBuilder()
    .setTitle('Ashinaga API')
    .setDescription('Main API for the Ashinaga platform')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter your Bearer token (Better Auth session token)',
        in: 'header',
      },
      'bearer'
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  return true;
}
