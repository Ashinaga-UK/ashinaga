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
  });

  const db = drizzle(pool);

  try {
    console.log('🗑️  Dropping all tables...');

    // Drop all tables in the correct order (respecting foreign keys)
    await db.execute(sql`DROP TABLE IF EXISTS request_audit_logs CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS request_attachments CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS requests CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS documents CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS milestones CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS goals CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS tasks CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS announcement_recipients CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS announcement_filters CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS announcements CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS scholars CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS staff CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS invitations CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS session CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS account CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "user" CASCADE`);

    // Drop enums
    await db.execute(sql`DROP TYPE IF EXISTS user_type CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS user_role CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS scholar_status CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS task_type CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS task_priority CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS task_status CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS goal_category CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS goal_status CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS request_type CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS request_status CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS request_priority CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS invitation_status CASCADE`);

    // Drop Drizzle migration tables
    await db.execute(sql`DROP TABLE IF EXISTS drizzle.__drizzle_migrations CASCADE`);
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
