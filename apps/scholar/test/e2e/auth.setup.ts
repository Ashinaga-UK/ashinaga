/**
 * Playwright global setup for the scholar portal: seed a deterministic
 * scholar user via raw SQL (Better Auth credential account), sign in
 * through the API, and persist the session as storageState.
 *
 * Also seeds a couple of staff users so the request multi-select picker
 * has options to render.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as setup } from '@playwright/test';
import { hashPassword } from 'better-auth/crypto';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.API_URL || 'http://localhost:4000';
const SCHOLAR_EMAIL = (process.env.E2E_SCHOLAR_EMAIL || 'e2e-scholar@example.com').toLowerCase();
const SCHOLAR_PASSWORD = process.env.E2E_SCHOLAR_PASSWORD || 'E2eScholarPassw0rd!';
const AUTH_FILE = path.join(__dirname, '.auth', 'scholar.json');

setup('authenticate as scholar', async ({ request }) => {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5433,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'postgres',
    max: 2,
  });

  const hashed = await hashPassword(SCHOLAR_PASSWORD);

  try {
    // 1) Scholar user
    const userRes = await pool.query<{ id: string }>(
      `INSERT INTO "user" (id, name, email, email_verified, user_type)
       VALUES ($1, $2, $3, true, 'scholar')
       ON CONFLICT (email) DO UPDATE
         SET user_type = 'scholar', email_verified = true, updated_at = NOW()
       RETURNING id`,
      [`e2e-scholar-user-${Date.now()}`, 'E2E Scholar', SCHOLAR_EMAIL]
    );
    const userId = userRes.rows[0]?.id;
    if (!userId) throw new Error('Failed to upsert scholar user');

    // 2) Credential account
    const accountExists = await pool.query<{ id: string }>(
      `SELECT id FROM account WHERE user_id = $1 AND provider_id = 'credential' LIMIT 1`,
      [userId]
    );
    if (accountExists.rows[0]) {
      await pool.query(
        `UPDATE account SET password = $1, account_id = $2, updated_at = NOW() WHERE id = $3`,
        [hashed, userId, accountExists.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO account (id, user_id, account_id, provider_id, password)
         VALUES ($1, $2, $3, 'credential', $4)`,
        [`e2e-account-scholar-${userId}`, userId, userId, hashed]
      );
    }

    // 3) Scholar row
    const scholarExists = await pool.query<{ id: string }>(
      `SELECT id FROM scholars WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (!scholarExists.rows[0]) {
      await pool.query(
        `INSERT INTO scholars (user_id, program, year, university, start_date, status)
         VALUES ($1, 'E2E Program', 'Year 1', 'E2E University', '2024-09-01', 'active')`,
        [userId]
      );
    }

    // 4) A couple of staff users so the assignee picker has options
    const ensureStaff = async (email: string, name: string) => {
      const res = await pool.query<{ id: string }>(
        `INSERT INTO "user" (id, name, email, email_verified, user_type)
         VALUES ($1, $2, $3, true, 'staff')
         ON CONFLICT (email) DO UPDATE
           SET user_type = 'staff', email_verified = true, updated_at = NOW()
         RETURNING id`,
        [`e2e-staff-fixture-${email}`, name, email.toLowerCase()]
      );
      const uid = res.rows[0]?.id;
      if (!uid) return;
      const existing = await pool.query<{ id: string }>(
        `SELECT id FROM staff WHERE user_id = $1 LIMIT 1`,
        [uid]
      );
      if (!existing.rows[0]) {
        await pool.query(
          `INSERT INTO staff (user_id, role, is_active) VALUES ($1, 'admin', true)`,
          [uid]
        );
      }
    };
    await ensureStaff('e2e-staff-a@ashinaga.org', 'E2E Staff A');
    await ensureStaff('e2e-staff-b@ashinaga.org', 'E2E Staff B');
  } finally {
    await pool.end();
  }

  // 5) Sign in
  const signInRes = await request.post(`${API_URL}/api/auth/sign-in/email`, {
    data: { email: SCHOLAR_EMAIL, password: SCHOLAR_PASSWORD },
  });
  if (!signInRes.ok()) {
    const body = await signInRes.text();
    throw new Error(`Scholar sign-in failed: ${signInRes.status()} ${body}`);
  }

  await request.storageState({ path: AUTH_FILE });
});
