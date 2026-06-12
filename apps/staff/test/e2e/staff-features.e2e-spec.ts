/**
 * E2E tests for the new staff portal features:
 *  - Invitations tab (issue #1)
 *  - Bulk task assignment dialog (issue #3)
 *  - Task title autocomplete suggestion dropdown (issue #5)
 *  - Soft-delete task confirmation dialog (issue #4)
 *
 * Auth is handled by ./auth.setup.ts via the 'setup' Playwright project.
 */
import { expect, test } from '@playwright/test';

test.describe('Staff Portal – new features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Overview', exact: true })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('Invitations tab is visible and renders Active Staff / Staff Invites / Scholar Invites sub-tabs', async ({
    page,
  }) => {
    const invitationsTab = page.getByRole('button', { name: 'Invitations', exact: true });
    await expect(invitationsTab).toBeVisible();
    await invitationsTab.click();

    // Sub-tabs visible (renamed when the Active Staff management view was added)
    await expect(page.getByRole('tab', { name: 'Active Staff', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Staff Invites', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Scholar Invites', exact: true })).toBeVisible();

    // The card header mentions on-hold scholars
    await expect(page.getByText(/manage on-hold scholars/i)).toBeVisible();

    // Invite Staff button is the default action on Active Staff / Staff Invites tabs
    await expect(page.getByRole('button', { name: /Invite Staff/i })).toBeVisible();

    // Switching to Scholar Invites shows the Onboard Scholar button instead
    await page.getByRole('tab', { name: 'Scholar Invites', exact: true }).click();
    await expect(page.getByRole('button', { name: /Onboard Scholar/i })).toBeVisible();
  });

  test('Invite Staff dialog opens with the 30-day expiry copy', async ({ page }) => {
    await page.getByRole('button', { name: 'Invitations', exact: true }).click();
    await page
      .getByRole('button', { name: /Invite Staff/i })
      .first()
      .click();

    // Dialog opens
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Invite a staff member/i)).toBeVisible();
    await expect(page.getByText(/expire after 30 days/i)).toBeVisible();

    // Form field present
    await expect(page.getByLabel(/Work email/i)).toBeVisible();
  });

  test('Bulk task assignment dialog opens from the Scholars tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Scholars', exact: true }).click();

    // Wait for at least one scholar row checkbox to render (index 1 skips the header checkbox)
    const scholarCheckbox = page.getByRole('checkbox').nth(1);
    await expect(scholarCheckbox).toBeVisible({ timeout: 15_000 });
    await scholarCheckbox.click();

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
    await page.getByRole('button', { name: 'Scholars', exact: true }).click();

    // Open the first scholar profile via "View" button (or row click)
    const viewButton = page.getByRole('button', { name: /View Profile/i }).first();
    if (await viewButton.isVisible().catch(() => false)) {
      await viewButton.click();
    } else {
      const row = page.getByRole('row').nth(1);
      if (!(await row.isVisible().catch(() => false))) {
        test.skip();
      }
      await row.click();
    }

    // Switch to tasks tab on the profile
    // The Tasks view can be a button (future UI) or a tab trigger (current UI)
    const tasksToggle = page
      .getByRole('button', { name: 'Tasks', exact: true })
      .or(page.getByRole('tab', { name: 'Tasks', exact: true }));
    await expect(tasksToggle).toBeVisible({ timeout: 10_000 });
    await tasksToggle.click();

    // ---------------------------------------------------
    // Create a task via the UI (Assign Task dialog) so it exists for deletion.
    await page.getByRole('button', { name: /^Assign Task/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const titleInput = page.getByLabel(/Task Title/i);
    await expect(titleInput).toBeVisible();
    const taskTitle = 'E2E soft-delete task';
    await titleInput.fill(taskTitle);
    // Submit the task (assume the dialog has an Assign button matching the pattern)
    await page.getByRole('button', { name: /Assign to \d+ Scholar/i }).click();
    // Wait for the newly created task row to appear in the profile's Tasks tab.
    await expect(page.getByRole('row', { name: new RegExp(taskTitle, 'i') })).toBeVisible({ timeout: 10_000 });
    // ---------------------------------------------------

    const trashButton = page.getByRole('button', { name: /Delete task/i }).first();
    await expect(trashButton).toBeVisible({ timeout: 10_000 });
    await trashButton.click();

    // Confirm dialog opens with the soft-delete copy
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Delete task\?/i)).toBeVisible();
    await expect(page.getByText(/archived and hidden/i)).toBeVisible();

    // Don't actually click Delete; cancel out
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  });
});
