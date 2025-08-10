import { Page, expect } from '@playwright/test';

export class AuthUtils {
  /**
   * Login to the application
   */
  static async login(page: Page, email: string, password: string): Promise<void> {
    console.log(`Attempting login with email: ${email}`);
    
    // Navigate to home page
    await page.goto('/');
    
    // Check if login form is visible or if we need to navigate to login
    try {
      // Try to find login form directly
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      await emailInput.waitFor({ timeout: 5000 });
    } catch {
      // Login form not visible, look for login button or link
      try {
        const loginButton = page.locator('text=Войти, text=Login, button:has-text("Вход")').first();
        await loginButton.click();
      } catch {
        console.log('No explicit login button found, checking current state...');
      }
    }
    
    // Wait for and fill email field
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await emailInput.waitFor({ timeout: 10000 });
    await emailInput.fill(email);
    
    // Wait for and fill password field
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await passwordInput.waitFor({ timeout: 5000 });
    await passwordInput.fill(password);
    
    // Click login button
    const submitButton = page.locator('button[type="submit"], button:has-text("Войти"), button:has-text("Login")').first();
    await submitButton.click();
    
    // Wait for successful login (redirect to admin dashboard or home page)
    await page.waitForLoadState('networkidle');
    
    console.log('Login attempt completed');
  }

  /**
   * Logout from the application
   */
  static async logout(page: Page): Promise<void> {
    // Look for logout button or user menu
    try {
      const userMenuButton = page.locator('[data-testid="user-menu"], .user-menu, button:has-text("admin")').first();
      await userMenuButton.click();
      
      const logoutButton = page.locator('text=Выйти, text=Logout, [data-testid="logout"]').first();
      await logoutButton.click();
    } catch {
      // Try direct logout button
      const logoutButton = page.locator('text=Выйти, text=Logout, button:has-text("Выход")').first();
      await logoutButton.click();
    }
    
    await page.waitForLoadState('networkidle');
  }

  /**
   * Verify that user is authenticated
   */
  static async verifyAuthenticated(page: Page): Promise<void> {
    // Check for admin panel elements or user-specific content
    const authIndicators = [
      page.locator('[data-testid="admin-panel"]'),
      page.locator('.admin-dashboard'),
      page.locator('text=Админ-панель'),
      page.locator('text=Admin Panel'),
      page.locator('[data-testid="user-menu"]'),
    ];

    let foundIndicator = false;
    for (const indicator of authIndicators) {
      try {
        await indicator.waitFor({ timeout: 3000 });
        foundIndicator = true;
        break;
      } catch {
        continue;
      }
    }

    if (!foundIndicator) {
      throw new Error('User does not appear to be authenticated - no admin panel or user menu found');
    }
  }

  /**
   * Verify that user is not authenticated
   */
  static async verifyNotAuthenticated(page: Page): Promise<void> {
    // Check for login form or login button
    const loginIndicators = [
      page.locator('input[type="email"]'),
      page.locator('input[name="email"]'),
      page.locator('text=Войти'),
      page.locator('text=Login'),
      page.locator('button:has-text("Вход")'),
    ];

    let foundIndicator = false;
    for (const indicator of loginIndicators) {
      try {
        await indicator.waitFor({ timeout: 3000 });
        foundIndicator = true;
        break;
      } catch {
        continue;
      }
    }

    if (!foundIndicator) {
      throw new Error('Expected to see login form, but user appears to be authenticated');
    }
  }

  /**
   * Check if current user has admin role
   */
  static async verifyAdminRole(page: Page): Promise<void> {
    // Look for admin-specific elements
    const adminIndicators = [
      page.locator('text=Управление пользователями'),
      page.locator('text=User Management'),
      page.locator('[href*="/admin/users"]'),
      page.locator('[data-testid="admin-users-link"]'),
      page.locator('text=Админ-панель'),
      page.locator('text=Admin Panel'),
    ];

    let foundIndicator = false;
    for (const indicator of adminIndicators) {
      try {
        await indicator.waitFor({ timeout: 3000 });
        foundIndicator = true;
        break;
      } catch {
        continue;
      }
    }

    if (!foundIndicator) {
      throw new Error('User does not appear to have admin privileges');
    }
  }
}