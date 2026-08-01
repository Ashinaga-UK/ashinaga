import { test, expect } from '@playwright/test';
import { signInAsStaff } from './auth.setup';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Overview/i })).toBeVisible();
});

test('Staff portal loads with sidebar and overview content', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Overview/i })).toBeVisible();
});
