import { request as apiRequest, expect, type Page, test } from '@playwright/test';

test.use({ storageState: './test/e2e/.auth/scholar.json' });

test.describe('Scholar Requests', () => {
  async function createRequestThroughUi(page: Page, description: string) {
    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/requests') &&
        response.request().method() === 'POST' &&
        response.ok()
    );

    await page.getByRole('button', { name: 'New Request' }).click();
    const dialog = page.getByRole('dialog', { name: 'Submit New Request' });
    await expect(dialog).toBeVisible();

    // The dialog renders two Select comboboxes (request type and priority),
    // both pre-populated with defaults. The staff assignee field uses
    // checkboxes, so select the first staff member that way to satisfy the
    // "at least one assignee" requirement.
    await dialog.getByRole('checkbox').first().click();
    await dialog.getByLabel('Description').fill(description);
    await page.getByRole('button', { name: 'Submit Request' }).click();

    const createResponse = await createResponsePromise;
    const createdRequest = (await createResponse.json()) as { id: string };
    return createdRequest.id;
  }

  test('withdraw button opens policy dialog with 7-day messaging', async ({ page }) => {
    const description = `E2E withdraw policy check ${Date.now()} now`;

    await page.goto('/requests');

    await expect(page.getByRole('heading', { name: 'My Requests' })).toBeVisible();

    await createRequestThroughUi(page, description);

    await expect(page.getByText(description)).toBeVisible();

    const requestCard = page.locator('div.rounded-lg.border.bg-card', { hasText: description });
    const withdrawButton = requestCard.getByRole('button', { name: /^Withdraw$/ });
    await expect(withdrawButton).toBeVisible();
    await withdrawButton.click();

    const dialog = page.getByRole('alertdialog', { name: 'Withdraw this request?' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      'This removes the request from the active queue and marks it as withdrawn.'
    );
    await expect(dialog).toContainText(
      'You can restore it within 7 days. After 7 days, restore is blocked and you will need to create a new request if you want to submit again.'
    );

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
  });

  test('withdraw action is hidden after staff responds', async ({ page }) => {
    const description = `E2E completed request ${Date.now()} now`;

    await page.goto('/requests');
    await expect(page.getByRole('heading', { name: 'My Requests' })).toBeVisible();

    const requestId = await createRequestThroughUi(page, description);

    const api = await apiRequest.newContext({
      baseURL: 'http://127.0.0.1:4000',
      storageState: './test/e2e/.auth/scholar.json',
    });

    const staffResponse = await api.get('/api/users/staff');
    expect(staffResponse.ok()).toBeTruthy();
    const staffMembers = (await staffResponse.json()) as Array<{ id: string }>;
    const reviewedBy = staffMembers[0]?.id;
    expect(reviewedBy).toBeTruthy();

    const updateResponse = await api.post(`/api/requests/${requestId}/status`, {
      data: {
        status: 'approved',
        comment: 'Reviewed in e2e',
        reviewedBy,
      },
    });

    expect(updateResponse.ok()).toBeTruthy();
    await api.dispose();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'My Requests' })).toBeVisible();

    const requestCard = page.locator('div.rounded-lg.border.bg-card', { hasText: description });
    await expect(requestCard).toContainText('approved', { timeout: 10_000 });
    await expect(requestCard.getByRole('button', { name: /^Withdraw$/ })).toHaveCount(0);
    await expect(requestCard).toContainText('Withdraw is only available before staff respond.');
  });
});
