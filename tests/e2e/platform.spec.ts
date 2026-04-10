import { test, expect } from '@playwright/test';
import { loginAsPlatformAdmin } from './helpers';

test.describe('Platform admin', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlatformAdmin(page);
  });

  test('platform admin sees "Платформа" in sidebar navigation', async ({
    page,
  }) => {
    await page.goto('/visits');

    // The sidebar should contain the "Платформа" navigation item
    await expect(page.getByText('Платформа')).toBeVisible({ timeout: 10_000 });
  });

  test('platform organizations page loads with organization list', async ({
    page,
  }) => {
    await page.goto('/platform/organizations');

    await page.waitForLoadState('networkidle');

    // Should show the "Организации" heading
    await expect(
      page.getByText(/Организации/i),
    ).toBeVisible({ timeout: 10_000 });

    // Should show stats cards or table with organizations
    const hasStats =
      (await page.getByText(/организаци|пользовател|визит/i).isVisible().catch(() => false));
    const hasTable =
      (await page.locator('table, [class*="MuiTable"]').isVisible().catch(() => false));
    const hasContent = hasStats || hasTable;

    expect(hasContent).toBeTruthy();
  });

  test('platform organizations page shows stat cards', async ({ page }) => {
    await page.goto('/platform/organizations');

    await page.waitForLoadState('networkidle');

    // The page should display statistic cards (total_organizations, total_users, total_visits)
    // These are rendered as MUI Card components with icon + number
    const cards = page.locator('[class*="MuiCard"]');
    const cardCount = await cards.count();

    // Expect at least the stats cards to be rendered
    expect(cardCount).toBeGreaterThanOrEqual(1);
  });
});
