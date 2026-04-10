import { test, expect } from '@playwright/test';
import { loginAsOrgAdmin } from './helpers';

test.describe('Admin pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOrgAdmin(page);
  });

  test('settings page loads with Bitrix24 integration section', async ({
    page,
  }) => {
    await page.goto('/admin/settings');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // The page should contain a Bitrix24 integration section
    await expect(
      page.getByText(/Интеграция с Bitrix24/i),
    ).toBeVisible({ timeout: 10_000 });

    // There should be a webhook URL field
    await expect(page.getByLabel(/Webhook URL/i)).toBeVisible();

    // There should be a switch for enabling/disabling the integration
    await expect(
      page.getByText(/Включить интеграцию/i),
    ).toBeVisible();
  });

  test('visit form editor page loads with field types', async ({ page }) => {
    await page.goto('/admin/visit-form');

    await page.waitForLoadState('networkidle');

    // The page should render without errors
    await expect(page.locator('body')).toBeVisible();

    // Should have an "add field" button or similar control
    const addFieldButton = page.getByRole('button', { name: /Добавить|Поле|Add/i });
    const pageLoaded =
      (await addFieldButton.isVisible().catch(() => false)) ||
      (await page.getByText(/Текст|Выпадающий|Чекбокс/i).isVisible().catch(() => false));

    expect(pageLoaded).toBeTruthy();
  });

  test('user management page loads and shows heading', async ({ page }) => {
    await page.goto('/admin/user-management');

    await page.waitForLoadState('networkidle');

    // Should show the "Управление пользователями" heading
    await expect(
      page.getByText(/Управление пользователями/i),
    ).toBeVisible({ timeout: 10_000 });

    // Should have a "Создать пользователя" button
    await expect(
      page.getByRole('button', { name: /Создать пользователя/i }),
    ).toBeVisible();
  });

  test('billing page loads and shows plan info', async ({ page }) => {
    await page.goto('/admin/billing');

    await page.waitForLoadState('networkidle');

    // The page header should be "Тарифы и оплата"
    await expect(
      page.getByText(/Тарифы и оплата/i),
    ).toBeVisible({ timeout: 10_000 });

    // The page should show plan information or a loading/error state
    const hasPlanInfo =
      (await page.getByText(/FREE|PRO|Текущий|тариф|Подписка/i).isVisible().catch(() => false)) ||
      (await page.getByText(/Управление подпиской/i).isVisible().catch(() => false));

    expect(hasPlanInfo).toBeTruthy();
  });
});
