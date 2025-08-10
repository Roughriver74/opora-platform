import { test as setup } from '@playwright/test';
import { AuthUtils } from './utils/auth-utils';

const ADMIN_CREDENTIALS = {
	email: 'crm@betonexpress.pro',
	password: 'qawsed12345',
}

setup('authenticate as admin', async ({ page }) => {
  // Navigate to login page
  await page.goto('/');
  
  // Check if we're already logged in
  try {
    await page.waitForURL(/admin/, { timeout: 5000 });
    console.log('Already authenticated, skipping login');
    return;
  } catch {
    // Not logged in, proceed with login
  }

  // Perform login
  await AuthUtils.login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
  
  // Verify successful login by checking for admin dashboard
  await page.waitForURL(/admin/, { timeout: 10000 });
  
  // Save authenticated state
  await page.context().storageState({ path: 'tests/fixtures/auth-state.json' });
});