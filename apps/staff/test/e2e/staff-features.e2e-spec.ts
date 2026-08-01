import { test, expect } from '@playwright/test';
import { signInAsStaff, ensureApiRunning } from './auth.setup';

// Ensure API is running and DB is ready before anything else
let _ensureApiReady: Promise<void> | null = null;
async function ensureApiReady() {
  if (!_ensureApiReady) {
    _ensureApiReady = ensureApiRunning();
  }
  return _ensureApiReady;
}

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel(/Toggle sidebar/i).first()).toBeVisible();
});

test('Staff portal loads with overview content', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Overview/i })).toBeVisible();
});
