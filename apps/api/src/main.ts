import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Log startup information
  logger.log(`Starting API in ${process.env.NODE_ENV || 'development'} mode`);
  logger.log(`Port: ${process.env.PORT || 3000}`);

  const fastifyAdapter = new FastifyAdapter({
    logger: true, // Enable Fastify's built-in logger
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Enable CORS
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3001', 'http://localhost:3002'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow all localhost origins regardless of port
      if (!origin || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else if (corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Ashinaga API')
    .setDescription('Main API for the Ashinaga platform')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`Application is running on: http://0.0.0.0:${port}`);
  logger.log(`Swagger documentation available at: http://0.0.0.0:${port}/api`);
  logger.log(`Health check endpoint: http://0.0.0.0:${port}/health`);

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    logger.warn('SIGTERM signal received: closing HTTP server');
    await app.close();
    logger.warn('HTTP server closed');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.warn('SIGINT signal received: closing HTTP server');
    await app.close();
    logger.warn('HTTP server closed');
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
