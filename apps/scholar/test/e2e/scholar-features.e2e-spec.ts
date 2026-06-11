/**
 * E2E tests for the new scholar portal feature:
 *  - New request dialog now supports multi-select of staff assignees (issue #2)
 *
 * Auth is handled by ./auth.setup.ts.
 */
import { expect, test } from '@playwright/test';

test.describe('Scholar Portal – new request multi-assignee', () => {
  test('shows a multi-select checkbox list of staff members on the new request form', async ({
    page,
  }) => {
    await page.goto('/requests');

    // Open new request dialog
    await page.getByRole('button', { name: /New Request/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Old single-select trigger should not exist anymore
    await expect(page.getByText(/Select a staff member$/i)).toHaveCount(0);

    // The new label is "Assign to Staff Members"
    await expect(page.getByText(/Assign to Staff Members/i)).toBeVisible();

    // At least one checkbox should render (we seeded two staff users in auth.setup.ts)
    const checkboxes = page.getByRole('checkbox');
    await expect(checkboxes.first()).toBeVisible({ timeout: 10_000 });
    const count = await checkboxes.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Tick two assignees and verify the "n selected" counter shows up
    await checkboxes.nth(0).check();
    if (count > 1) {
      await checkboxes.nth(1).check();
      await expect(page.getByText(/2 selected/)).toBeVisible();
    } else {
      await expect(page.getByText(/1 selected/)).toBeVisible();
    }
  });

  test('multi-select can be cleared by unchecking', async ({ page }) => {
    await page.goto('/requests');
    await page.getByRole('button', { name: /New Request/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const checkbox = page.getByRole('checkbox').first();
    await expect(checkbox).toBeVisible({ timeout: 10_000 });
    await checkbox.check();
    await expect(page.getByText(/1 selected/)).toBeVisible();
    await checkbox.uncheck();
    await expect(page.getByText(/1 selected/)).toHaveCount(0);
  });
});
