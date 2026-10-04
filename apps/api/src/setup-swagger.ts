import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { shouldExposeSwagger } from './swagger-exposure';

export { shouldExposeSwagger } from './swagger-exposure';

export interface SetupSwaggerOptions {
  /**
   * Nest's FastifyAdapter loads `@fastify/static` via a nested require that
   * fails under Jest + pnpm (ESM transitive deps). Skip asset hosting in tests;
   * JSON/UI routes still register. Dev/prod keep the normal Nest path.
   */
  skipStaticAssets?: boolean;
}

/**
 * Mount Swagger UI at `/api` (and `/api-json`) when allowed.
 * Returns whether docs were mounted.
 */
export function setupSwagger(
  app: NestFastifyApplication,
  options: SetupSwaggerOptions = {}
): boolean {
  if (!shouldExposeSwagger()) {
    return false;
  }

  if (options.skipStaticAssets) {
    const adapter = app.getHttpAdapter() as unknown as {
      useStaticAssets: (opts: unknown) => unknown;
    };
    adapter.useStaticAssets = () => undefined;
  }

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
