import { test, expect } from '@playwright/test';

test.describe('Form Submission Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should submit form successfully to Bitrix24', async ({ page }) => {
    // First, let's check if we need to login
    const loginButton = page.getByRole('button', { name: /войти/i });
    if (await loginButton.isVisible()) {
      // Login as test user
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Test123!');
      await loginButton.click();
      
      // Wait for login to complete
      await page.waitForURL('**/');
    }

    // Wait for the form to load
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Fill in required form fields (adjust based on actual form fields)
    // Check if there are any visible text inputs
    const firstInput = page.locator('input[type="text"]:visible').first();
    if (await firstInput.isVisible()) {
      await firstInput.fill('Test Company ' + Date.now());
    }

    // Fill phone number if exists
    const phoneInput = page.locator('input[type="tel"]:visible').first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('+79991234567');
    }

    // Fill email if exists and not already filled
    const emailInput = page.locator('input[type="email"]:not([name="email"]):visible').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
    }

    // Check for any required selects
    const selects = page.locator('select:visible');
    const selectCount = await selects.count();
    for (let i = 0; i < selectCount; i++) {
      const select = selects.nth(i);
      const options = select.locator('option');
      const optionCount = await options.count();
      if (optionCount > 1) {
        // Select the second option (first is usually empty)
        await select.selectOption({ index: 1 });
      }
    }

    // Submit the form
    const submitButton = page.getByRole('button', { name: /отправить|создать|сохранить/i });
    
    // Set up response listener for the submission
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/submissions/submit') && response.status() === 200,
      { timeout: 30000 }
    );

    // Click submit
    await submitButton.click();

    // Wait for the response
    const response = await responsePromise;
    const responseData = await response.json();
    
    // Verify the response
    expect(response.status()).toBe(200);
    expect(responseData.success).toBeTruthy();
    
    // Check if Bitrix deal was created
    if (responseData.data?.bitrixDealId) {
      console.log('✅ Form submitted successfully with Bitrix Deal ID:', responseData.data.bitrixDealId);
    }

    // Check for success message on the page
    const successMessage = page.locator('text=/успешно|отправлено|создано/i');
    if (await successMessage.isVisible({ timeout: 5000 })) {
      console.log('✅ Success message displayed');
    }
  });

  test('should handle form validation errors', async ({ page }) => {
    // Wait for the form to load
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Try to submit without filling required fields
    const submitButton = page.getByRole('button', { name: /отправить|создать|сохранить/i });
    await submitButton.click();
    
    // Check for validation errors
    const errorMessages = page.locator('.MuiFormHelperText-root.Mui-error, .MuiAlert-root.MuiAlert-standardError');
    const errorCount = await errorMessages.count();
    
    expect(errorCount).toBeGreaterThan(0);
    console.log(`✅ Form validation is working - ${errorCount} error(s) displayed`);
  });

  test('should check My Submissions page', async ({ page }) => {
    // First login
    const loginButton = page.getByRole('button', { name: /войти/i });
    if (await loginButton.isVisible()) {
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Test123!');
      await loginButton.click();
      await page.waitForURL('**/');
    }

    // Navigate to My Submissions
    await page.goto('http://localhost:3000/my-submissions');
    
    // Wait for the submissions to load
    await page.waitForSelector('table, .MuiTableContainer-root', { timeout: 10000 });
    
    // Check if there are any submissions
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    
    if (rowCount > 0) {
      console.log(`✅ Found ${rowCount} submission(s) in My Submissions`);
      
      // Try to edit the first submission
      const editButton = rows.first().locator('button[title*="Редактировать"]').first();
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // Should redirect to the form with edit mode
        await page.waitForURL('**/?edit=*', { timeout: 10000 });
        console.log('✅ Edit functionality is working');
      }
    } else {
      console.log('ℹ️ No submissions found in My Submissions');
    }
  });
});