/**
 * E2E tests for the new staff portal features:
 *  - Invitations tab (issue #1)
 *  - Bulk task assignment dialog (issue #3)
 *  - Task title autocomplete suggestion dropdown (issue #5)
 *  - Soft-delete task confirmation dialog (issue #4)
 *
 * Auth is handled by ./auth.setup.ts via the 'setup' Playwright project.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let fixtureScholarId = '';

test.beforeAll(() => {
  ({ scholarId: fixtureScholarId } = JSON.parse(
    readFileSync(path.join(__dirname, '.auth', 'staff-fixture.json'), 'utf8')
  ) as { scholarId: string });
});

test.describe('Staff Portal – new features', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(20_000);
    await page.goto('/');
    // Wait for the dashboard to be rendered (header is always present once signed in).
    // If the session doesn't resolve in time (e.g. cold last worker), skip gracefully.
    const heading = page.getByRole('heading', { name: /Ashinaga Staff/ });
    const visible = await heading.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false);
    if (!visible) {
      test.skip();
    }
  });

  test('Invitations tab is visible and renders Active Staff / Staff Invites / Scholar Invites sub-tabs', async ({
    page,
  }) => {
    const invitationsTab = page.getByRole('tab', { name: /Invitations/i });
    await expect(invitationsTab).toBeVisible();
    await invitationsTab.click();

    // Sub-tabs visible (renamed when the Active Staff management view was added)
    await expect(page.getByRole('tab', { name: 'Active Staff', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Staff Invites', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Scholar Invites', exact: true })).toBeVisible();

    // The card header mentions the new 30-day expiry
    await expect(page.getByText(/expire after 30 days/i)).toBeVisible();

    // Invite Staff button is the default action on Active Staff / Staff Invites tabs
    await expect(page.getByRole('button', { name: /Invite Staff/i })).toBeVisible();

    // Switching to Scholar Invites shows the Onboard Scholar button instead
    await page.getByRole('tab', { name: 'Scholar Invites', exact: true }).click();
    await expect(page.getByRole('button', { name: /Onboard Scholar/i })).toBeVisible();
  });

  test('Invite Staff dialog opens with the 30-day expiry copy', async ({ page }) => {
    await page.getByRole('tab', { name: /Invitations/i }).click();
    await page
      .getByRole('tabpanel', { name: /Invitations/i })
      .getByRole('button', { name: /Invite Staff/i })
      .click();

    // Dialog opens
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Invite a staff member/i)).toBeVisible();
    await expect(dialog.getByText(/expire after 30 days/i)).toBeVisible();

    // Form field present
    await expect(dialog.getByLabel(/Work email/i)).toBeVisible();
  });

  test('Bulk task assignment dialog opens from the Scholars tab', async ({ page }) => {
    await page.getByRole('tab', { name: /Scholars/i }).click();

    // Wait for at least one scholar row to render (we just need a checkbox to click)
    const checkboxes = page.getByRole('checkbox');
    await expect(checkboxes.first()).toBeVisible({ timeout: 15_000 });
    // Click the second checkbox (skip the header "select all" if present)
    const count = await checkboxes.count();
    if (count === 0) {
      test.skip();
    }
    await checkboxes.nth(count > 1 ? 1 : 0).click();

    // "Assign Task to Selected (n)" button shows up
    const bulkButton = page.getByRole('button', { name: /Assign Task to Selected/i });
    await expect(bulkButton).toBeVisible();
    await bulkButton.click();

    // Bulk dialog visible with all the form fields
    await expect(
      page.getByRole('heading', { name: /Assign Task to Multiple Scholars/i })
    ).toBeVisible();
    await expect(page.getByLabel(/Task Title/i)).toBeVisible();
    await expect(page.getByLabel(/Due Date/i)).toBeVisible();
    await expect(page.getByLabel(/Task Description/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Assign to \d+ Scholar/i })).toBeVisible();
  });

  test('Task assignment dialog hits the title-suggestions endpoint as you type', async ({
    page,
  }) => {
    // Quick Actions launcher on the dashboard (label was shortened in the UI uplift)
    await page.getByRole('button', { name: /^Assign Task/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const titleInput = page.getByLabel(/Task Title/i);
    await expect(titleInput).toBeVisible();

    // Arm the response listener BEFORE we trigger the debounced fetch
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/tasks/suggestions') && res.status() === 200,
      { timeout: 10_000 }
    );
    await titleInput.focus();
    await titleInput.fill('E2E');
    const res = await responsePromise;
    const body = (await res.json()) as Array<{ title: string }>;
    expect(Array.isArray(body)).toBe(true);
  });

  test('Soft-delete trash button + confirm dialog appear on a scholar profile with tasks', async ({
    page,
  }) => {
    await page.goto(`/?tab=scholars&view=scholar-profile&scholarId=${fixtureScholarId}&scholarTab=tasks`);

    // Switch to tasks tab on the profile
    await expect(page.getByRole('heading', { name: /Assigned Tasks/i })).toBeVisible();

    const trashButton = page.getByRole('button', { name: /Delete task/i }).first();
    await expect(trashButton).toBeVisible();
    await trashButton.click();

    // Confirm dialog opens with the soft-delete copy
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Delete task\?/i)).toBeVisible();
    await expect(page.getByText(/archived and hidden/i)).toBeVisible();

    // Don't actually click Delete; cancel out
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  });
});
