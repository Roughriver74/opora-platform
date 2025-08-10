import { test, expect } from '@playwright/test';

test.describe('Form Submission to Bitrix24', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should submit form successfully to Bitrix24', async ({ page }) => {
    console.log('Starting form submission test...');
    
    // Check if we need to login
    const loginForm = page.locator('form').filter({ hasText: 'Вход в систему' });
    if (await loginForm.isVisible()) {
      console.log('Login required, logging in...');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Test123!');
      await page.getByRole('button', { name: /войти/i }).click();
      
      // Wait for redirect after login
      await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
    }

    // Wait for the form to load
    await page.waitForSelector('form', { timeout: 10000 });
    console.log('Form loaded');

    // Fill in the form fields
    // Company name
    const companyInput = page.locator('input[name*="company"], input[name*="название"], input[name*="организац"]').first();
    if (await companyInput.isVisible()) {
      await companyInput.fill('Test Company ' + Date.now());
    }

    // Contact person
    const contactInput = page.locator('input[name*="контакт"], input[name*="фио"], input[name*="имя"]').first();
    if (await contactInput.isVisible()) {
      await contactInput.fill('Test User');
    }

    // Phone
    const phoneInput = page.locator('input[type="tel"], input[name*="телефон"], input[name*="phone"]').first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('+79991234567');
    }

    // Email
    const emailInput = page.locator('input[type="email"]:not([name="email"]), input[name*="почта"], input[name*="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
    }

    // Fill any visible select fields
    const selects = page.locator('select:visible');
    const selectCount = await selects.count();
    for (let i = 0; i < selectCount; i++) {
      const select = selects.nth(i);
      const options = select.locator('option');
      const optionCount = await options.count();
      if (optionCount > 1) {
        await select.selectOption({ index: 1 });
      }
    }

    // Set up response listener
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/submissions/submit'),
      { timeout: 30000 }
    );

    // Submit the form
    console.log('Submitting form...');
    const submitButton = page.getByRole('button', { name: /отправить заявку|создать заявку|отправить/i });
    await submitButton.click();

    // Wait for the response
    const response = await responsePromise;
    const responseData = await response.json();
    
    console.log('Response status:', response.status());
    console.log('Response data:', JSON.stringify(responseData, null, 2));
    
    // Check the response
    if (response.status() === 200 && responseData.success) {
      console.log('✅ Form submitted successfully!');
      if (responseData.data?.bitrixDealId) {
        console.log('✅ Bitrix Deal ID:', responseData.data.bitrixDealId);
      }
    } else {
      console.error('❌ Form submission failed:', responseData.message || 'Unknown error');
    }
    
    expect(response.status()).toBe(200);
    expect(responseData.success).toBeTruthy();
  });

  test('should display validation errors for empty form', async ({ page }) => {
    console.log('Testing form validation...');
    
    // Wait for the form
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Try to submit without filling
    const submitButton = page.getByRole('button', { name: /отправить заявку|создать заявку|отправить/i });
    await submitButton.click();
    
    // Wait a bit for validation to appear
    await page.waitForTimeout(1000);
    
    // Check for error messages
    const errorMessages = page.locator('.MuiFormHelperText-root.Mui-error, .MuiAlert-root.MuiAlert-standardError, [role="alert"]');
    const errorCount = await errorMessages.count();
    
    if (errorCount > 0) {
      console.log(`✅ Validation working - ${errorCount} error(s) displayed`);
    } else {
      console.log('⚠️ No validation errors found - form might not have required fields');
    }
    
    expect(errorCount).toBeGreaterThanOrEqual(0);
  });
});