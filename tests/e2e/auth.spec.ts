import { test, expect } from '@playwright/test';
import { login, loginAsOrgAdmin, logout, TEST_USERS, uniqueId } from './helpers';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stale tokens before each test
    await page.goto('/auth');
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('token_expires_at');
    });
  });

  test('login with valid credentials redirects to /visits', async ({ page }) => {
    await page.goto('/auth');

    // Verify we are on the auth page
    await expect(page.getByText('Вход в систему')).toBeVisible();

    // Fill in credentials
    await page.getByLabel('Email').fill(TEST_USERS.orgAdmin.email);
    await page.getByLabel(/Пароль/i).fill(TEST_USERS.orgAdmin.password);

    // Click the login button
    await page.getByRole('button', { name: /Войти/i }).click();

    // Should redirect to visits page
    await page.waitForURL('**/visits', { timeout: 15_000 });
    expect(page.url()).toContain('/visits');
  });

  test('login with wrong password shows error message', async ({ page }) => {
    await page.goto('/auth');

    await page.getByLabel('Email').fill(TEST_USERS.orgAdmin.email);
    await page.getByLabel(/Пароль/i).fill('wrongpassword999');

    await page.getByRole('button', { name: /Войти/i }).click();

    // An error alert should appear
    const errorAlert = page.getByRole('alert');
    await expect(errorAlert).toBeVisible({ timeout: 15_000 });

    // The error message should contain a relevant string
    await expect(errorAlert).toContainText(/неправильный|ошибка|incorrect|пароль/i);
  });

  test('register new organization creates org and redirects to /visits', async ({
    page,
  }) => {
    const suffix = uniqueId();

    await page.goto('/auth');

    // Click the "Зарегистрироваться" link
    await page.getByText('Зарегистрироваться').click();
    await page.waitForURL('**/register');

    // Verify registration form is visible
    await expect(page.getByText('Регистрация')).toBeVisible();

    // Fill registration form
    await page.getByLabel('Название компании').fill(`TestOrg_${suffix}`);
    await page.getByLabel('Имя').fill('Test');
    await page.getByLabel('Фамилия').fill('User');
    await page.getByLabel('Email').fill(`test_${suffix}@e2e.local`);
    await page.getByLabel(/Пароль/i).fill('testpass123');

    // Submit
    await page.getByRole('button', { name: /Создать аккаунт/i }).click();

    // Should redirect to visits page after successful registration
    await page.waitForURL('**/visits', { timeout: 15_000 });
    expect(page.url()).toContain('/visits');
  });

  test('logout clears session and redirects to /auth', async ({ page }) => {
    // First, log in
    await loginAsOrgAdmin(page);

    // Verify we are on visits page
    expect(page.url()).toContain('/visits');

    // Perform logout
    await logout(page);

    // Should be on the auth page
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByText('Вход в систему')).toBeVisible();

    // Navigating to a protected page should redirect back to auth
    await page.goto('/visits');
    // Without a valid token the app should redirect to auth
    await page.waitForURL('**/auth', { timeout: 10_000 });
  });
});
