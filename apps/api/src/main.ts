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

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${process.env.PORT || 3000}`);
}
bootstrap();
