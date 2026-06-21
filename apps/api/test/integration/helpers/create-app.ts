import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { AuthGuard } from '../../../src/auth/auth.guard';
import { StaffGuard } from '../../../src/auth/staff.guard';

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

  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

export interface TestUser {
  id: string;
  email: string;
  userType: 'staff' | 'scholar';
  staffRole?: string;
}

/**
 * Mutable container so tests can swap the authenticated user without rebuilding the app.
 */
export interface AuthContext {
  setUser: (user: TestUser | null) => void;
  getUser: () => TestUser | null;
}

interface AuthenticatedApp {
  app: NestFastifyApplication;
  auth: AuthContext;
}

/**
 * Create a Nest app for integration tests with AuthGuard and StaffGuard overridden so
 * test code can set the "current user" without going through Better Auth.
 */
export async function createAuthenticatedIntegrationApp(): Promise<AuthenticatedApp> {
  let currentUser: TestUser | null = null;
  const auth: AuthContext = {
    setUser: (user) => {
      currentUser = user;
    },
    getUser: () => currentUser,
  };

  const adapter = new FastifyAdapter();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(AuthGuard)
    .useValue({
      canActivate: (context: {
        switchToHttp: () => { getRequest: () => Record<string, unknown> };
      }) => {
        const req = context.switchToHttp().getRequest();
        if (!currentUser) return false;
        req.user = { ...currentUser };
        return true;
      },
    })
    .overrideGuard(StaffGuard)
    .useValue({
      canActivate: (context: {
        switchToHttp: () => { getRequest: () => Record<string, unknown> };
      }) => {
        const req = context.switchToHttp().getRequest();
        if (!currentUser) return false;
        if (currentUser.userType !== 'staff') return false;
        req.user = { ...currentUser };
        return true;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(adapter, {
    logger: ['error', 'warn'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return { app, auth };
}
