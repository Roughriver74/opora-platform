import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for OPORA platform.
 *
 * Requires the application to be running:
 *   - Frontend: http://localhost:4200
 *   - Backend:  http://localhost:4201
 *   - DB:       localhost:4202
 *
 * Run tests:
 *   npx playwright test
 *   npx playwright test --headed          # with browser UI
 *   npx playwright test --ui              # interactive UI mode
 *   npx playwright test tests/e2e/auth.spec.ts  # single file
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'tests/e2e/reports' }],
  ],
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },

  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Do not auto-start the dev server; assume it is already running */
});
