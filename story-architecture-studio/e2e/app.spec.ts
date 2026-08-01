import { test, expect } from '@playwright/test';

async function createWalkProject(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create The Walk seed project' }).click();
  await expect(page.getByText('The Walk').first()).toBeVisible({ timeout: 30000 });
  // Wait for full seed including 32 issues
  await expect(page.locator('.app-footer')).toContainText('32 issues', { timeout: 60000 });
}

test.describe('Story Architecture Studio', () => {
  test('dashboard loads and shows create project options', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create The Walk seed project' })).toBeVisible();
  });

  test('creates Walk project and navigates to explorer', async ({ page }) => {
    await createWalkProject(page);
    await page.getByRole('link', { name: 'Explorer' }).click();
    await expect(page.getByRole('heading', { name: 'Explorer' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Character Aerin/ })).toBeVisible();
  });

  test('issue board shows 32 issues after Walk seed', async ({ page }) => {
    await createWalkProject(page);
    await page.getByRole('link', { name: 'Issue Board' }).click();
    await expect(page.getByRole('heading', { name: 'Issue Board' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /#1 Issue 1/ })).toBeVisible({ timeout: 10000 });
    await page.getByRole('heading', { name: /#32 Issue 32/ }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: /#32 Issue 32/ })).toBeVisible();
  });
});
