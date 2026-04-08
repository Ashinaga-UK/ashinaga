import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

async function resetDatabase() {
  // Safety check - prevent running in production
  const env = process.env.NODE_ENV || 'development';
  const dbHost = process.env.DB_HOST || 'localhost';

  if (env === 'production') {
    console.error('❌ ERROR: Database reset is not allowed in production!');
    process.exit(1);
  }

  if (!['localhost', '127.0.0.1', 'postgres'].includes(dbHost)) {
    console.error('❌ ERROR: Database reset is only allowed on localhost!');
    console.error(`Current DB_HOST: ${dbHost}`);
    process.exit(1);
  }

  console.log('⚠️  WARNING: This will drop ALL tables in the database!');
  console.log(`Environment: ${env}`);
  console.log(`Database Host: ${dbHost}`);
  console.log('');

  // Give user 3 seconds to cancel
  console.log('Starting in 3 seconds... Press Ctrl+C to cancel');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const pool = new Pool({
    host: dbHost,
    port: Number(process.env.DB_PORT) || 5433,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  const db = drizzle(pool);

  try {
    console.log('🗑️  Dropping all tables, enums, and schemas...');

    // Drop ALL tables in the public schema dynamically (no hardcoded list to maintain)
    await db.execute(sql`
      DO $$ DECLARE r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS "' || r.tablename || '" CASCADE';
        END LOOP;
      END $$
    `);

    // Drop ALL custom enum types in the public schema dynamically
    await db.execute(sql`
      DO $$ DECLARE r RECORD;
      BEGIN
        FOR r IN (SELECT t.typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
          EXECUTE 'DROP TYPE IF EXISTS "' || r.typname || '" CASCADE';
        END LOOP;
      END $$
    `);

    // Drop Drizzle migration schema
    await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);

    console.log('✅ All tables dropped successfully!');
    console.log('');
    console.log('Now run the following commands to recreate the schema:');
    console.log('  pnpm db:generate');
    console.log('  pnpm db:migrate');
    console.log('  pnpm db:populate-dev');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Only run if called directly
if (require.main === module) {
  resetDatabase().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { resetDatabase };
