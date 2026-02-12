/**
 * Global setup for integration tests.
 * Runs once before all test files.
 * - Ensures required env vars are set for CI
 * - Runs database migrations so the test DB has the correct schema
 */
import path from 'node:path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

export default async function globalSetup(): Promise<void> {
  // Defaults for CI (GitHub Actions postgres service)
  if (process.env.CI === 'true') {
    process.env.NODE_ENV = process.env.NODE_ENV || 'test';
    process.env.DB_HOST = process.env.DB_HOST || 'localhost';
    process.env.DB_PORT = process.env.DB_PORT || '5432';
    process.env.DB_USER = process.env.DB_USER || 'postgres';
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
    process.env.DB_NAME = process.env.DB_NAME || 'ashinaga_integration';
    process.env.DB_SSL = process.env.DB_SSL || 'false';
    process.env.BETTER_AUTH_SECRET =
      process.env.BETTER_AUTH_SECRET ||
      'integration-test-secret-key-minimum-32-characters-long';
    process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:4000';
  }

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5433,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'postgres',
    max: 2,
    connectionTimeoutMillis: 10000,
  });

  const db = drizzle(pool);
  // Run from apps/api so cwd is the API root
  const migrationsFolder = path.join(process.cwd(), 'src/db/migrations');

  await migrate(db, { migrationsFolder });
  await pool.end();
}
