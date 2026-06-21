/**
 * Playwright global setup: seed a deterministic staff user via raw SQL
 * (using Better Auth's password hashing), then sign in through the UI and
 * persist the browser storage state for the staff suite.
 *
 * Requires:
 *  - Postgres running with the API schema migrated
 *  - API running on API_URL (default http://127.0.0.1:4000)
 *  - Staff dev server on STAFF_APP_URL (auto-managed by Playwright webServer)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as setup } from '@playwright/test';
import { hashPassword } from 'better-auth/crypto';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STAFF_EMAIL = (process.env.E2E_STAFF_EMAIL || 'e2e-staff@ashinaga.org').toLowerCase();
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD || 'E2eStaffPassw0rd!';
const AUTH_FILE = path.join(__dirname, '.auth', 'staff.json');
const FIXTURE_FILE = path.join(__dirname, '.auth', 'staff-fixture.json');

setup('authenticate as staff', async () => {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5433,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'postgres',
    max: 2,
  });

  const hashed = await hashPassword(STAFF_PASSWORD);

  try {
    // 1) Upsert the user row
    const userRes = await pool.query<{ id: string }>(
      `INSERT INTO "user" (id, name, email, email_verified, user_type)
       VALUES ($1, $2, $3, true, 'staff')
       ON CONFLICT (email) DO UPDATE
         SET user_type = 'staff', email_verified = true, updated_at = NOW()
       RETURNING id`,
      [`e2e-staff-user-${Date.now()}`, 'E2E Staff', STAFF_EMAIL]
    );
    const userId = userRes.rows[0]?.id;
    if (!userId) throw new Error('Failed to upsert staff user');

    // 2) Upsert credential account
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
        [`e2e-account-staff-${userId}`, userId, userId, hashed]
      );
    }

    // 3) Upsert staff record (super admin so it sees all requests)
    const staffExists = await pool.query<{ id: string }>(
      `SELECT id FROM staff WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (staffExists.rows[0]) {
      await pool.query(
        `UPDATE staff SET role = 'admin', is_active = true, is_super_admin = true, updated_at = NOW() WHERE id = $1`,
        [staffExists.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO staff (user_id, role, is_active, is_super_admin)
         VALUES ($1, 'admin', true, true)`,
        [userId]
      );
    }

    // 4) Ensure at least one scholar + one task so list-based UI tests have data
    const scholarUserEmail = 'e2e-fixture-scholar@example.com';
    const scholarUserRes = await pool.query<{ id: string }>(
      `INSERT INTO "user" (id, name, email, email_verified, user_type)
       VALUES ($1, $2, $3, true, 'scholar')
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [`e2e-fixture-scholar-user-${Date.now()}`, 'E2E Fixture Scholar', scholarUserEmail]
    );
    const scholarUserId = scholarUserRes.rows[0]?.id;
    if (scholarUserId) {
      await mkdir(path.dirname(FIXTURE_FILE), { recursive: true });

      const scholarRow = await pool.query<{ id: string }>(
        `SELECT id FROM scholars WHERE user_id = $1 LIMIT 1`,
        [scholarUserId]
      );
      let scholarId = scholarRow.rows[0]?.id;
      if (!scholarId) {
        const ins = await pool.query<{ id: string }>(
          `INSERT INTO scholars (user_id, program, year, university, start_date, status)
           VALUES ($1, 'Fixture Program', 'Year 1', 'Fixture University', '2024-09-01', 'active')
           RETURNING id`,
          [scholarUserId]
        );
        scholarId = ins.rows[0]?.id;
      }

      // Ensure at least one task assigned by the e2e staff user
      if (scholarId) {
        const existingTask = await pool.query<{ id: string }>(
          `SELECT id FROM tasks
           WHERE scholar_id = $1 AND assigned_by = $2 AND title = $3
           LIMIT 1`,
          [scholarId, userId, 'E2E fixture task']
        );
        if (existingTask.rows[0]) {
          await pool.query(
            `UPDATE tasks
             SET archived = false,
                 archived_at = NULL,
                 archived_by = NULL,
                 deleted_at = NULL,
                 deleted_by = NULL,
                 status = 'pending',
                 updated_at = NOW()
             WHERE id = $1`,
            [existingTask.rows[0].id]
          );
        } else {
          await pool.query(
            `INSERT INTO tasks (title, description, type, priority, due_date, scholar_id, assigned_by, status)
             VALUES ($1, $2, 'other', 'medium', NOW() + interval '30 days', $3, $4, 'pending')`,
            ['E2E fixture task', 'Auto-seeded for Playwright tests', scholarId, userId]
          );
        }
      }

      await writeFile(FIXTURE_FILE, JSON.stringify({ scholarId }, null, 2));
    }
  } finally {
    await pool.end();
  }

  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext();
  const page = await context.newPage();
  const baseURL = process.env.STAFF_APP_URL || 'http://127.0.0.1:4001';
  await page.goto(`${baseURL}/login`);
  await page.getByLabel('Email').fill(STAFF_EMAIL);
  await page.getByLabel('Password').fill(STAFF_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('heading', { name: /Ashinaga Staff/ }).waitFor({ timeout: 30_000 });

  await mkdir(path.dirname(AUTH_FILE), { recursive: true });
  await context.storageState({ path: AUTH_FILE });
  await browser.close();
});
