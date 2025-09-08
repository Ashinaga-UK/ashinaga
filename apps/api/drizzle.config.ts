import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5433,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'postgres',
    ssl:
      process.env.DB_SSL === 'true' ||
      process.env.NODE_ENV === 'production' ||
      process.env.NODE_ENV === 'test'
        ? { rejectUnauthorized: false }
        : false,
  },
});
