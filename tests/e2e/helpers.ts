import { Page, expect } from '@playwright/test';

/**
 * Test credentials for the OPORA platform.
 */
export const TEST_USERS = {
  orgAdmin: {
    email: 'test@myopora.ru',
    password: 'test123',
  },
  platformAdmin: {
    email: 'admin@myopora.ru',
    password: 'admin123',
  },
} as const;

/**
 * Logs in through the /auth page and waits for redirect to /visits.
 *
 * @param page  - Playwright page instance
 * @param email - User email
 * @param password - User password
 */
export async function login(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/auth');

  // Wait for the login form to be ready
  await page.getByLabel('Email').waitFor({ state: 'visible' });

  // Fill credentials
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/Пароль/i).fill(password);

  // Submit form
  await page.getByRole('button', { name: /Войти/i }).click();

  // Wait for successful redirect to /visits
  await page.waitForURL('**/visits', { timeout: 15_000 });
}

/**
 * Logs in as the org admin test user.
 */
export async function loginAsOrgAdmin(page: Page): Promise<void> {
  await login(page, TEST_USERS.orgAdmin.email, TEST_USERS.orgAdmin.password);
}

/**
 * Logs in as the platform admin.
 */
export async function loginAsPlatformAdmin(page: Page): Promise<void> {
  await login(
    page,
    TEST_USERS.platformAdmin.email,
    TEST_USERS.platformAdmin.password,
  );
}

/**
 * Logs the current user out by clearing localStorage and navigating to /auth.
 */
export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('token_expires_at');
  });
  await page.goto('/auth');
  await page.waitForURL('**/auth');
}

/**
 * Generates a unique string suffix for test data (avoids collisions between runs).
 */
export function uniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
