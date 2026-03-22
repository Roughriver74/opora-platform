import { test, expect } from '@playwright/test';
import { AuthUtils } from '../utils/auth-utils';

test.describe('Authentication & Authorization', () => {
  const ADMIN_CREDENTIALS = {
    email: 'admin@opora.local',
    password: 'qawsed12345'
  };

  const INVALID_CREDENTIALS = {
    email: 'invalid@example.com',
    password: 'wrongpassword'
  };

  test.beforeEach(async ({ page }) => {
    // Start fresh for each test
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should successfully login with admin credentials', async ({ page }) => {
    console.log('Testing admin login...');
    
    // Navigate to home page
    await page.goto('/');
    
    // Perform login
    await AuthUtils.login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    
    // Verify successful login
    await AuthUtils.verifyAuthenticated(page);
    await AuthUtils.verifyAdminRole(page);
    
    // Check that we have auth token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    
    // Check that we're redirected to admin panel
    const url = page.url();
    expect(url).toMatch(/admin/);
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    console.log('Testing invalid login...');
    
    await page.goto('/');
    
    try {
      await AuthUtils.login(page, INVALID_CREDENTIALS.email, INVALID_CREDENTIALS.password);
      // If login doesn't throw an error, check that we're still on login page
      await page.waitForTimeout(3000); // Wait for any error messages
      await AuthUtils.verifyNotAuthenticated(page);
    } catch (error) {
      // Expected behavior - login should fail
      console.log('Login failed as expected:', error);
    }
    
    // Verify no token is stored
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeFalsy();
  });

  test('should handle token refresh functionality', async ({ page }) => {
    console.log('Testing token refresh...');
    
    // First, login successfully
    await page.goto('/');
    await AuthUtils.login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    
    // Get initial token
    const initialToken = await page.evaluate(() => localStorage.getItem('token'));
    expect(initialToken).toBeTruthy();
    
    // Wait a bit and make an API call to trigger refresh if needed
    await page.waitForTimeout(2000);
    
    // Make an authenticated API call
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/auth/check', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        return { status: res.status, ok: res.ok };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    expect(response.status).toBe(200);
    
    // Verify token is still present (may have been refreshed)
    const currentToken = await page.evaluate(() => localStorage.getItem('token'));
    expect(currentToken).toBeTruthy();
  });

  test('should properly logout user', async ({ page }) => {
    console.log('Testing logout functionality...');
    
    // Login first
    await page.goto('/');
    await AuthUtils.login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    await AuthUtils.verifyAuthenticated(page);
    
    // Perform logout
    await AuthUtils.logout(page);
    
    // Verify logout
    await page.waitForTimeout(2000); // Wait for logout to complete
    await AuthUtils.verifyNotAuthenticated(page);
    
    // Verify tokens are cleared
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('refreshToken'));
    expect(token).toBeFalsy();
    expect(refreshToken).toBeFalsy();
  });

  test('should maintain session across page reloads', async ({ page }) => {
    console.log('Testing session persistence...');
    
    // Login
    await page.goto('/');
    await AuthUtils.login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    await AuthUtils.verifyAuthenticated(page);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify still authenticated
    await AuthUtils.verifyAuthenticated(page);
    
    // Verify admin access still works
    await AuthUtils.verifyAdminRole(page);
  });

  test('should restrict access to admin routes for non-admin users', async ({ page }) => {
    console.log('Testing role-based access control...');
    
    // Try to access admin routes without login
    await page.goto('/admin/users');
    
    // Should be redirected to login or see login form
    await page.waitForLoadState('networkidle');
    
    // Check if we're redirected to login or see access denied
    const url = page.url();
    const hasLoginForm = await page.locator('input[type="email"], input[name="email"]').count() > 0;
    const hasAccessDenied = await page.locator('text=Access Denied, text=Доступ запрещен, text=Unauthorized').count() > 0;
    
    expect(hasLoginForm || hasAccessDenied || !url.includes('/admin/users')).toBe(true);
  });

  test('should handle expired tokens gracefully', async ({ page }) => {
    console.log('Testing expired token handling...');
    
    // Set an invalid/expired token
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'expired.token.here');
      localStorage.setItem('refreshToken', 'expired.refresh.token');
    });
    
    // Try to access protected route
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to login or show login form
    await page.waitForTimeout(3000); // Wait for token validation
    
    // Check that we're back to login state
    const hasLoginElements = await page.locator('input[type="email"], text=Войти, text=Login').count() > 0;
    expect(hasLoginElements).toBe(true);
    
    // Tokens should be cleared
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeFalsy();
  });

  test('should validate JWT token structure and expiration', async ({ page }) => {
    console.log('Testing JWT token validation...');
    
    // Login to get valid token
    await page.goto('/');
    await AuthUtils.login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    
    // Get token and validate structure
    const tokenInfo = await page.evaluate(() => {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      try {
        // Basic JWT structure validation
        const parts = token.split('.');
        if (parts.length !== 3) return { valid: false, error: 'Invalid JWT structure' };
        
        // Decode payload (without verification - just for testing structure)
        const payload = JSON.parse(atob(parts[1]));
        
        return {
          valid: true,
          payload: payload,
          hasUserId: !!payload.userId,
          hasRole: !!payload.role,
          hasExp: !!payload.exp,
          expiresAt: payload.exp ? new Date(payload.exp * 1000) : null
        };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    });
    
    expect(tokenInfo?.valid).toBe(true);
    expect(tokenInfo?.hasUserId).toBe(true);
    expect(tokenInfo?.hasRole).toBe(true);
    expect(tokenInfo?.hasExp).toBe(true);
    
    console.log('Token validation results:', tokenInfo);
  });
});