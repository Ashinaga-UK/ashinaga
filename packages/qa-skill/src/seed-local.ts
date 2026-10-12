/**
 * Seed QA fixture accounts into a LOCAL database, using the same raw-SQL +
 * Better Auth password hashing pattern as apps/{staff,scholar}/test/e2e/auth.setup.ts.
 * Refuses any non-localhost database so it can never touch test or prod.
 */
import { randomBytes } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import pg from 'pg';
import { LOCAL_ACCOUNTS } from './target';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export async function seedLocal(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const host = env.DB_HOST || 'localhost';
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`seed-local only seeds a local database (DB_HOST=${host} refused).`);
  }
  const pool = new pg.Pool({
    host,
    port: Number(env.DB_PORT) || 5433,
    user: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD || 'postgres',
    database: env.DB_NAME || 'postgres',
    max: 2,
  });

  try {
    const staffUserId = await upsertUser(pool, 'staff', 'QA Staff', LOCAL_ACCOUNTS.staff);
    const staff = await pool.query('SELECT id FROM staff WHERE user_id = $1', [staffUserId]);
    if (staff.rows[0]) {
      await pool.query(
        `UPDATE staff SET role = 'admin', is_active = true, is_super_admin = true, updated_at = NOW()
         WHERE user_id = $1`,
        [staffUserId]
      );
    } else {
      await pool.query(
        `INSERT INTO staff (user_id, role, is_active, is_super_admin) VALUES ($1, 'admin', true, true)`,
        [staffUserId]
      );
    }

    const prepUserId = await upsertUser(pool, 'scholar', 'QA Prep Candidate', LOCAL_ACCOUNTS.prep);
    const prepScholarId = await upsertScholar(pool, prepUserId, 'prep_year');
    const scholarUserId = await upsertUser(pool, 'scholar', 'QA Scholar', LOCAL_ACCOUNTS.scholar);
    await upsertScholar(pool, scholarUserId, 'scholar');

    // A Prep Year task so the Prep tasks matrix and report have data.
    await pool.query(
      `INSERT INTO tasks (title, description, type, priority, due_date, scholar_id, assigned_by, status)
       SELECT 'QA Prep Year task', 'Seeded by qa-skill', 'other', 'medium', NOW() + interval '14 days', $1, $2, 'pending'
       WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE scholar_id = $1 AND title = 'QA Prep Year task')`,
      [prepScholarId, staffUserId]
    );

    // A pending scholar invitation for student.signup-from-invite.
    const token = randomBytes(24).toString('hex');
    await pool.query(
      `INSERT INTO invitations (email, user_type, invited_by, token, expires_at, status)
       VALUES ('qa-invitee@example.com', 'scholar', $1, $2, NOW() + interval '7 days', 'pending')
       ON CONFLICT (email) DO UPDATE
         SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, status = 'pending', updated_at = NOW()`,
      [staffUserId, token]
    );

    console.log('Seeded local QA fixtures:');
    for (const [persona, account] of Object.entries(LOCAL_ACCOUNTS)) {
      console.log(`- ${persona}: ${account.email}`);
    }
    console.log(`Invite token for student.signup-from-invite: QA_INVITE_TOKEN=${token}`);
  } finally {
    await pool.end();
  }
}

async function upsertUser(
  pool: pg.Pool,
  userType: 'staff' | 'scholar',
  name: string,
  account: { email: string; password: string }
): Promise<string> {
  const user = await pool.query<{ id: string }>(
    `INSERT INTO "user" (id, name, email, email_verified, user_type)
     VALUES ($1, $2, $3, true, $4)
     ON CONFLICT (email) DO UPDATE SET user_type = $4, email_verified = true, updated_at = NOW()
     RETURNING id`,
    [
      `qa-${userType}-${Date.now()}-${randomBytes(3).toString('hex')}`,
      name,
      account.email,
      userType,
    ]
  );
  const userId = user.rows[0]?.id;
  if (!userId) throw new Error(`Failed to upsert ${account.email}`);

  const hashed = await hashPassword(account.password);
  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM account WHERE user_id = $1 AND provider_id = 'credential' LIMIT 1`,
    [userId]
  );
  if (existing.rows[0]) {
    await pool.query(
      `UPDATE account SET password = $1, account_id = $2, updated_at = NOW() WHERE id = $3`,
      [hashed, userId, existing.rows[0].id]
    );
  } else {
    await pool.query(
      `INSERT INTO account (id, user_id, account_id, provider_id, password)
       VALUES ($1, $2, $2, 'credential', $3)`,
      [`qa-account-${userId}`, userId, hashed]
    );
  }
  return userId;
}

async function upsertScholar(
  pool: pg.Pool,
  userId: string,
  stage: 'prep_year' | 'scholar'
): Promise<string> {
  const existing = await pool.query<{ id: string }>(
    'SELECT id FROM scholars WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  if (existing.rows[0]) {
    await pool.query(
      `UPDATE scholars SET program_stage = $2, status = 'active', updated_at = NOW() WHERE id = $1`,
      [existing.rows[0].id, stage]
    );
    return existing.rows[0].id;
  }
  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO scholars (user_id, program, year, university, start_date, status, program_stage)
     VALUES ($1, 'QA Program', 'Year 1', 'QA University', '2025-09-01', 'active', $2)
     RETURNING id`,
    [userId, stage]
  );
  const id = inserted.rows[0]?.id;
  if (!id) throw new Error('Failed to insert scholar');
  return id;
}
