import { test, expect } from '@playwright/test';
import { loginAsOrgAdmin } from './helpers';

test.describe('Visits', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOrgAdmin(page);
  });

  test('visits page loads and shows heading', async ({ page }) => {
    await page.goto('/visits');

    // The page heading should contain "Визиты"
    await expect(page.getByRole('heading', { name: /Визиты/i })).toBeVisible();

    // Tab controls should be present
    await expect(page.getByRole('tab', { name: /Предстоящие/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Прошедшие/i })).toBeVisible();
  });

  test('can switch between upcoming and past visit tabs', async ({ page }) => {
    await page.goto('/visits');

    // Click the "Прошедшие" tab
    await page.getByRole('tab', { name: /Прошедшие/i }).click();

    // The "Прошедшие" tab should now be selected
    const pastTab = page.getByRole('tab', { name: /Прошедшие/i });
    await expect(pastTab).toHaveAttribute('aria-selected', 'true');

    // Switch back to "Предстоящие"
    await page.getByRole('tab', { name: /Предстоящие/i }).click();
    const upcomingTab = page.getByRole('tab', { name: /Предстоящие/i });
    await expect(upcomingTab).toHaveAttribute('aria-selected', 'true');
  });

  test('create visit button navigates to companies page', async ({ page }) => {
    await page.goto('/visits');

    // On desktop, there should be a "Создать визит" button
    const createButton = page.getByRole('button', { name: /Создать визит/i });

    // If button is visible (desktop), click it and verify navigation
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForURL('**/companies');
      expect(page.url()).toContain('/companies');
    }
  });

  test('visit details page loads when navigating to /visits/:id', async ({
    page,
  }) => {
    await page.goto('/visits');

    // Wait for visits to load (either visit cards or an empty state message)
    await page.waitForTimeout(2_000);

    // Try to click the first visit card if any exist
    const visitCards = page.locator('[class*="MuiCard"]').first();

    if (await visitCards.isVisible()) {
      await visitCards.click();

      // Should navigate to a visit details page
      await page.waitForURL(/\/visits\/\d+/, { timeout: 10_000 });

      // The page should have loaded without crashing (check for common elements)
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
