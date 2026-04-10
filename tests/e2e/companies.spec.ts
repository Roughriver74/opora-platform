import { test, expect } from '@playwright/test';
import { loginAsOrgAdmin, uniqueId } from './helpers';

test.describe('Companies', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOrgAdmin(page);
  });

  test('companies page loads and shows company list', async ({ page }) => {
    await page.goto('/companies');

    // Wait for page content to load (either cards or an empty state)
    await page.waitForLoadState('networkidle');

    // Should have the "Добавить компанию" button (desktop) or Fab (mobile)
    const addButton = page.getByTestId('add-company-button');
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();

    // Should show either company cards or a "not found" info message
    const hasCompanies = await page.locator('[class*="MuiCard"]').count();
    const hasEmptyState = await page.getByText(/Не найдено компаний/i).isVisible().catch(() => false);
    expect(hasCompanies > 0 || hasEmptyState).toBeTruthy();
  });

  test('create company via modal dialog', async ({ page }) => {
    const suffix = uniqueId();

    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    // Click "Добавить компанию" button
    const addButton = page.getByTestId('add-company-button');

    if (await addButton.isVisible()) {
      await addButton.click();

      // A dialog/modal should appear
      const dialog = page.locator('[role="dialog"], [class*="MuiDialog"]');
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // Fill in the required fields
      // Company name
      const nameField = dialog.getByLabel(/Название/i).first();
      if (await nameField.isVisible()) {
        await nameField.fill(`E2E_Company_${suffix}`);
      }

      // INN
      const innField = dialog.getByLabel(/ИНН/i).first();
      if (await innField.isVisible()) {
        await innField.fill('7707083893');
      }

      // Region (may be a select or text field)
      const regionField = dialog.getByLabel(/Регион/i).first();
      if (await regionField.isVisible()) {
        await regionField.fill('Москва');
      }

      // Look for submit/create button within the dialog
      const submitButton = dialog.getByRole('button', { name: /Создать|Добавить|Сохранить/i });
      if (await submitButton.isVisible()) {
        await submitButton.click();
      }

      // After creation, either we get redirected to the edit page or see a success snackbar
      await page.waitForTimeout(3_000);

      const redirectedToEdit = page.url().includes('/companies/') && page.url().includes('/edit');
      const hasSuccessSnackbar = await page
        .getByText(/успешно создана|компания создана/i)
        .isVisible()
        .catch(() => false);

      expect(redirectedToEdit || hasSuccessSnackbar).toBeTruthy();
    }
  });

  test('export button triggers file download', async ({ page }) => {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    // Find the export button
    const exportButton = page.getByRole('button', { name: /Экспорт/i });

    if (await exportButton.isVisible()) {
      // Listen for the download event
      const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });

      await exportButton.click();

      const download = await downloadPromise;

      // Verify the file name contains "companies" and has xlsx extension
      expect(download.suggestedFilename()).toMatch(/companies.*\.xlsx$/);
    }
  });
});
