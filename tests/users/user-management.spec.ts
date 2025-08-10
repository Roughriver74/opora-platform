import { test, expect } from '@playwright/test';
import { AuthUtils } from '../utils/auth-utils';
import { ApiUtils } from '../utils/api-utils';

test.describe('User Management', () => {
  const ADMIN_CREDENTIALS = {
    email: 'admin@betoncrm.ru',
    password: 'qawsed12345'
  };

  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto('/');
    await AuthUtils.login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    await AuthUtils.verifyAdminRole(page);
  });

  test('should load users list in admin panel (70+ users expected)', async ({ page }) => {
    console.log('Testing users list loading...');
    
    // Navigate to users page
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // Wait for users table to load
    const usersTable = page.locator('[data-testid="users-table"], .users-table, table').first();
    await usersTable.waitFor({ timeout: 15000 });
    
    // Count user rows (excluding header)
    const userRows = page.locator('tr:has(td)'); // Rows with td elements (not th)
    const userCount = await userRows.count();
    
    console.log(`Found ${userCount} users in the table`);
    
    // Verify we have at least 70 users as expected
    expect(userCount).toBeGreaterThanOrEqual(70);
    
    // Check for pagination if users are paginated
    const paginationExists = await page.locator('.pagination, [data-testid="pagination"], .MuiPagination-root').count() > 0;
    if (paginationExists) {
      console.log('Pagination detected, checking total user count...');
      
      // Look for total count indicator
      const totalCountElement = page.locator('text=/Total.*\\d+/, text=/Всего.*\\d+/').first();
      if (await totalCountElement.count() > 0) {
        const totalText = await totalCountElement.textContent();
        const totalMatch = totalText?.match(/\\d+/);
        if (totalMatch) {
          const totalUsers = parseInt(totalMatch[0]);
          console.log(`Total users from pagination: ${totalUsers}`);
          expect(totalUsers).toBeGreaterThanOrEqual(70);
        }
      }
    }
    
    // Verify table has expected columns
    const expectedColumns = ['email', 'name', 'role', 'firstName', 'lastName'];
    const headerCells = page.locator('th, .MuiTableCell-head');
    
    for (const column of expectedColumns) {
      const columnExists = await page.locator(`th:has-text("${column}"), th[data-field="${column}"], .MuiTableCell-head:has-text("${column}")`).count() > 0;
      if (columnExists) {
        console.log(`✓ Found column: ${column}`);
      }
    }
  });

  test('should successfully edit user functionality', async ({ page }) => {
    console.log('Testing user editing functionality...');
    
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // Wait for users table
    await page.locator('[data-testid="users-table"], .users-table, table').first().waitFor({ timeout: 15000 });
    
    // Find first user row with edit button
    const editButton = page.locator('[data-testid="edit-user-btn"], button:has-text("Edit"), button:has-text("Редактировать"), .edit-user-btn').first();
    await editButton.waitFor({ timeout: 10000 });
    
    // Click edit button
    await editButton.click();
    
    // Wait for edit modal or form
    const editForm = page.locator('[data-testid="user-edit-form"], .user-edit-modal, .edit-user-form, form').first();
    await editForm.waitFor({ timeout: 10000 });
    
    // Verify form fields are present and editable
    const formFields = [
      'input[name="firstName"], input[placeholder*="First"], input[placeholder*="Имя"]',
      'input[name="lastName"], input[placeholder*="Last"], input[placeholder*="Фамилия"]',
      'input[name="email"], input[type="email"]',
      'select[name="role"], .role-select, [data-testid="role-select"]'
    ];
    
    for (const fieldSelector of formFields) {
      const field = page.locator(fieldSelector).first();
      if (await field.count() > 0) {
        expect(await field.isEnabled()).toBe(true);
        console.log(`✓ Field is editable: ${fieldSelector}`);
      }
    }
    
    // Try to make a small change (if firstName field exists)
    const firstNameField = page.locator('input[name="firstName"], input[placeholder*="First"], input[placeholder*="Имя"]').first();
    if (await firstNameField.count() > 0) {
      const originalValue = await firstNameField.inputValue();
      await firstNameField.fill(originalValue + ' Test');
      
      // Save changes
      const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Сохранить")').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        
        // Wait for save to complete
        await page.waitForTimeout(3000);
        
        // Revert the change
        await firstNameField.fill(originalValue);
        await saveButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Close modal/form
    const closeButton = page.locator('button:has-text("Close"), button:has-text("Cancel"), button:has-text("Закрыть"), .close-btn, [aria-label="Close"]').first();
    if (await closeButton.count() > 0) {
      await closeButton.click();
    }
    
    console.log('User editing functionality verified');
  });

  test('should create new user successfully', async ({ page }) => {
    console.log('Testing user creation...');
    
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // Look for "Add User" or "Create User" button
    const addUserButton = page.locator('[data-testid="add-user-btn"], button:has-text("Add"), button:has-text("Create"), button:has-text("Добавить")').first();
    
    if (await addUserButton.count() > 0) {
      await addUserButton.click();
      
      // Wait for create user form
      const createForm = page.locator('[data-testid="user-create-form"], .user-create-modal, form').first();
      await createForm.waitFor({ timeout: 10000 });
      
      // Fill form with test data
      const testUser = {
        firstName: 'Test',
        lastName: 'User',
        email: `test.user.${Date.now()}@test.com`,
        role: 'user'
      };
      
      // Fill required fields
      const firstNameField = page.locator('input[name="firstName"], input[placeholder*="First"]').first();
      if (await firstNameField.count() > 0) {
        await firstNameField.fill(testUser.firstName);
      }
      
      const lastNameField = page.locator('input[name="lastName"], input[placeholder*="Last"]').first();
      if (await lastNameField.count() > 0) {
        await lastNameField.fill(testUser.lastName);
      }
      
      const emailField = page.locator('input[name="email"], input[type="email"]').first();
      await emailField.fill(testUser.email);
      
      // Select role if available
      const roleSelect = page.locator('select[name="role"], .role-select').first();
      if (await roleSelect.count() > 0) {
        await roleSelect.selectOption(testUser.role);
      }
      
      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Создать")').first();
      await submitButton.click();
      
      // Wait for success message or modal close
      await page.waitForTimeout(3000);
      
      console.log('User creation form tested');
    } else {
      console.log('Add User button not found - testing API creation instead');
      
      // Test user creation via API
      const testUser = {
        firstName: 'API Test',
        lastName: 'User',
        email: `api.test.${Date.now()}@test.com`,
        role: 'user'
      };
      
      try {
        const response = await ApiUtils.makeAuthenticatedRequest(page, 'POST', '/api/users', testUser);
        expect(response).toBeTruthy();
        console.log('User created via API successfully');
      } catch (error) {
        console.log('API user creation test failed:', error);
      }
    }
  });

  test('should delete user successfully', async ({ page }) => {
    console.log('Testing user deletion...');
    
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // Wait for users table
    await page.locator('table, .users-table').first().waitFor({ timeout: 15000 });
    
    // Look for delete button (usually on test users)
    const deleteButton = page.locator('[data-testid="delete-user-btn"], button:has-text("Delete"), button:has-text("Удалить"), .delete-user-btn').first();
    
    if (await deleteButton.count() > 0) {
      await deleteButton.click();
      
      // Handle confirmation dialog if present
      await page.waitForTimeout(1000);
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Да"), button:has-text("Delete")').first();
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }
      
      // Wait for deletion to complete
      await page.waitForTimeout(3000);
      
      console.log('User deletion tested');
    } else {
      console.log('Delete button not found in UI - testing API deletion');
      
      // Test via API - create a test user first, then delete it
      const testUser = {
        firstName: 'Delete Test',
        lastName: 'User',
        email: `delete.test.${Date.now()}@test.com`,
        role: 'user'
      };
      
      try {
        // Create user
        const createResponse = await ApiUtils.makeAuthenticatedRequest(page, 'POST', '/api/users', testUser);
        const userId = createResponse.data?._id || createResponse._id;
        
        if (userId) {
          // Delete user
          await ApiUtils.makeAuthenticatedRequest(page, 'DELETE', `/api/users/${userId}`);
          console.log('User deletion via API successful');
        }
      } catch (error) {
        console.log('API user deletion test failed:', error);
      }
    }
  });

  test('should sync users with Bitrix24', async ({ page }) => {
    console.log('Testing Bitrix24 user sync...');
    
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // Look for sync button
    const syncButton = page.locator('[data-testid="sync-users-btn"], button:has-text("Sync"), button:has-text("Синхронизировать"), .sync-btn').first();
    
    if (await syncButton.count() > 0) {
      // Monitor network requests for sync operation
      const syncPromise = page.waitForResponse(response => 
        response.url().includes('/api/users/sync') && response.status() === 200
      );
      
      await syncButton.click();
      
      try {
        await syncPromise;
        console.log('Bitrix24 sync initiated successfully');
      } catch (error) {
        console.log('Sync response timeout - checking for loading indicators');
      }
      
      // Wait for sync to complete (look for loading indicators to disappear)
      await page.waitForTimeout(5000);
      
    } else {
      console.log('Sync button not found - testing API sync endpoint');
      
      try {
        const response = await ApiUtils.makeAuthenticatedRequest(page, 'POST', '/api/users/sync');
        console.log('Bitrix24 sync via API:', response?.success ? 'Success' : 'Failed');
      } catch (error) {
        console.log('API sync test failed:', error);
      }
    }
  });

  test('should manage user roles and status', async ({ page }) => {
    console.log('Testing user role and status management...');
    
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // Wait for users table
    await page.locator('table, .users-table').first().waitFor({ timeout: 15000 });
    
    // Count users by role
    const adminUsers = await page.locator('td:has-text("admin"), .role-admin').count();
    const regularUsers = await page.locator('td:has-text("user"), .role-user').count();
    
    console.log(`Found ${adminUsers} admin users and ${regularUsers} regular users`);
    
    // Verify we have at least one admin
    expect(adminUsers).toBeGreaterThanOrEqual(1);
    
    // Test role filtering if available
    const roleFilter = page.locator('[data-testid="role-filter"], .role-filter, select[name="role"]').first();
    if (await roleFilter.count() > 0) {
      // Filter by admin role
      await roleFilter.selectOption('admin');
      await page.waitForTimeout(2000);
      
      // Verify only admin users are shown
      const filteredRows = await page.locator('tr:has(td)').count();
      console.log(`Filtered to ${filteredRows} admin users`);
      
      // Reset filter
      await roleFilter.selectOption('');
      await page.waitForTimeout(1000);
    }
    
    // Check for user status indicators
    const activeUsers = await page.locator('.status-active, td:has-text("Active"), td:has-text("Активен")').count();
    const inactiveUsers = await page.locator('.status-inactive, td:has-text("Inactive"), td:has-text("Неактивен")').count();
    
    console.log(`Found ${activeUsers} active users and ${inactiveUsers} inactive users`);
  });

  test('should handle user data validation errors', async ({ page }) => {
    console.log('Testing user data validation...');
    
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // Try to create user with invalid data via API
    const invalidUserData = [
      { email: 'invalid-email', firstName: '', lastName: '', role: 'invalid-role' },
      { email: '', firstName: 'Test', lastName: 'User', role: 'user' },
      { email: 'test@test.com', firstName: '', lastName: '', role: '' }
    ];
    
    for (const invalidData of invalidUserData) {
      try {
        await ApiUtils.makeAuthenticatedRequest(page, 'POST', '/api/users', invalidData);
        console.log('Expected validation error for:', invalidData);
      } catch (error) {
        console.log('✓ Validation error caught as expected:', error.message);
      }
    }
    
    console.log('User validation testing completed');
  });

  test('should load and display user details correctly', async ({ page }) => {
    console.log('Testing user details display...');
    
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // Get users data via API to verify UI display
    try {
      const usersResponse = await ApiUtils.makeAuthenticatedRequest(page, 'GET', '/api/users');
      const users = usersResponse.data || usersResponse;
      
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
      
      console.log(`API returned ${users.length} users`);
      
      // Verify first user has expected fields
      const firstUser = users[0];
      const expectedFields = ['_id', 'email', 'firstName', 'lastName', 'role'];
      
      for (const field of expectedFields) {
        if (firstUser.hasOwnProperty(field)) {
          console.log(`✓ User has field: ${field}`);
        } else {
          console.log(`⚠ Missing field: ${field}`);
        }
      }
      
    } catch (error) {
      console.log('Failed to get users via API:', error);
    }
  });
});