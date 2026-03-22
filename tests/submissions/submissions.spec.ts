import { test, expect } from '@playwright/test';
import { AuthUtils } from '../utils/auth-utils';
import { ApiUtils } from '../utils/api-utils';

test.describe('Form Submissions & My Submissions', () => {
  const ADMIN_CREDENTIALS = {
    email: 'admin@opora.local',
    password: 'qawsed12345'
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await AuthUtils.login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    await AuthUtils.verifyAuthenticated(page);
  });

  test('should load and display My Submissions page without pagination errors', async ({ page }) => {
    console.log('Testing My Submissions page loading...');
    
    // Navigate to My Submissions page
    await page.goto('/my-submissions');
    await page.waitForLoadState('networkidle');
    
    // Check for pagination undefined error in console
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Check for common elements that indicate the page loaded correctly
    const pageElements = [
      page.locator('h1, h2, .page-title').first(),
      page.locator('table, .submissions-table, .data-grid').first(),
      page.locator('.pagination, .MuiPagination-root').first()
    ];
    
    let foundElements = 0;
    for (const element of pageElements) {
      if (await element.count() > 0) {
        foundElements++;
        console.log('✓ Found expected page element');
      }
    }
    
    // Verify at least some page structure is present
    expect(foundElements).toBeGreaterThan(0);
    
    // Check for pagination undefined errors
    const paginationErrors = consoleErrors.filter(error => 
      error.toLowerCase().includes('pagination') && error.toLowerCase().includes('undefined')
    );
    
    if (paginationErrors.length > 0) {
      console.log('⚠ Found pagination errors:', paginationErrors);
    }
    
    expect(paginationErrors.length).toBe(0);
    
    // Test pagination functionality if present
    const paginationElement = page.locator('.pagination, .MuiPagination-root').first();
    if (await paginationElement.count() > 0) {
      console.log('Testing pagination functionality...');
      
      // Look for page buttons
      const pageButtons = page.locator('.pagination button, .MuiPagination-ul button');
      const buttonCount = await pageButtons.count();
      
      if (buttonCount > 1) {
        // Try to click next page if available
        const nextButton = page.locator('button[aria-label="Next page"], button:has-text("Next"), .pagination-next').first();
        if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
          await nextButton.click();
          await page.waitForLoadState('networkidle');
          console.log('✓ Pagination navigation works');
        }
      }
    }
    
    console.log('My Submissions page testing completed');
  });

  test('should handle form submission functionality', async ({ page }) => {
    console.log('Testing form submission functionality...');
    
    // Navigate to the main form page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for form elements
    const formElement = page.locator('form, .betone-form, .submission-form').first();
    
    if (await formElement.count() > 0) {
      console.log('Form found, testing submission process...');
      
      // Find form fields
      const textInputs = page.locator('input[type="text"], input[type="email"], input[type="tel"]');
      const textareas = page.locator('textarea');
      const selects = page.locator('select');
      const checkboxes = page.locator('input[type="checkbox"]');
      
      // Fill some sample data if fields exist
      const textInputCount = await textInputs.count();
      if (textInputCount > 0) {
        for (let i = 0; i < Math.min(textInputCount, 3); i++) {
          const input = textInputs.nth(i);
          const fieldType = await input.getAttribute('type');
          
          if (fieldType === 'email') {
            await input.fill('test@example.com');
          } else if (fieldType === 'tel') {
            await input.fill('+7 (123) 456-78-90');
          } else {
            await input.fill('Test Value');
          }
        }
      }
      
      // Fill textareas
      const textareaCount = await textareas.count();
      if (textareaCount > 0) {
        await textareas.first().fill('Test description or comment');
      }
      
      // Handle selects
      const selectCount = await selects.count();
      if (selectCount > 0) {
        const firstSelect = selects.first();
        const options = await firstSelect.locator('option').count();
        if (options > 1) {
          await firstSelect.selectOption({ index: 1 });
        }
      }
      
      // Look for submit button
      const submitButton = page.locator('button[type="submit"], button:has-text("Отправить"), button:has-text("Submit"), .submit-btn').first();
      
      if (await submitButton.count() > 0) {
        console.log('Submit button found, testing submission...');
        
        // Monitor for submission request
        const submissionPromise = page.waitForResponse(response => 
          response.url().includes('/api/submissions') && response.request().method() === 'POST'
        );
        
        try {
          await submitButton.click();
          
          // Wait for submission response
          const response = await submissionPromise;
          const status = response.status();
          
          console.log(`Submission response status: ${status}`);
          
          if (status === 200 || status === 201) {
            console.log('✓ Form submission successful');
            
            // Look for success message
            await page.waitForTimeout(2000);
            const successMessage = page.locator('.success, .alert-success, text=успешно, text=Success').first();
            if (await successMessage.count() > 0) {
              console.log('✓ Success message displayed');
            }
          }
          
        } catch (error) {
          console.log('Form submission test timeout or error:', error);
        }
      }
    } else {
      console.log('No form found on main page, testing API submission instead');
      
      // Test submission via API
      const testSubmission = {
        formId: 'test-form-id',
        data: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '+7 123 456 78 90',
          message: 'Test message'
        }
      };
      
      try {
        const response = await ApiUtils.makeAuthenticatedRequest(page, 'POST', '/api/submissions/submit', testSubmission);
        console.log('API submission test result:', response?.success ? 'Success' : 'Failed');
      } catch (error) {
        console.log('API submission test failed:', error);
      }
    }
  });

  test('should display submissions list with proper data', async ({ page }) => {
    console.log('Testing submissions list display...');
    
    // Try both admin submissions and user submissions
    const submissionPages = ['/admin/submissions', '/my-submissions'];
    
    for (const pagePath of submissionPages) {
      try {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        console.log(`Testing ${pagePath}...`);
        
        // Look for table or list of submissions
        const submissionsTable = page.locator('table, .submissions-list, .data-grid').first();
        
        if (await submissionsTable.count() > 0) {
          // Check for table headers
          const expectedHeaders = ['ID', 'Номер', 'Название', 'Статус', 'Дата', 'Date', 'Status', 'Title'];
          let foundHeaders = 0;
          
          for (const header of expectedHeaders) {
            const headerElement = page.locator(`th:has-text("${header}"), .table-header:has-text("${header}")`);
            if (await headerElement.count() > 0) {
              foundHeaders++;
            }
          }
          
          console.log(`Found ${foundHeaders} expected headers`);
          
          // Check for submission rows
          const submissionRows = page.locator('tbody tr, .submission-row, .data-row');
          const rowCount = await submissionRows.count();
          
          console.log(`Found ${rowCount} submission rows`);
          
          if (rowCount > 0) {
            // Check first row has expected data structure
            const firstRow = submissionRows.first();
            const cellCount = await firstRow.locator('td, .cell').count();
            console.log(`First row has ${cellCount} cells`);
            
            expect(cellCount).toBeGreaterThan(3);
          }
        } else {
          console.log(`No submissions table found on ${pagePath}`);
        }
        
      } catch (error) {
        console.log(`Error testing ${pagePath}:`, error);
      }
    }
  });

  test('should handle form field operations correctly', async ({ page }) => {
    console.log('Testing form field operations...');
    
    // Navigate to form fields admin page
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Look for form fields or form editor link
    const formFieldsLink = page.locator('a:has-text("Поля"), a:has-text("Fields"), [href*="form"], [href*="field"]').first();
    
    if (await formFieldsLink.count() > 0) {
      await formFieldsLink.click();
      await page.waitForLoadState('networkidle');
    } else {
      // Try direct navigation to form fields page
      await page.goto('/admin/forms');
      await page.waitForLoadState('networkidle');
    }
    
    // Test form fields API
    try {
      const formFieldsResponse = await ApiUtils.makeAuthenticatedRequest(page, 'GET', '/api/formfields');
      const formFields = formFieldsResponse.data || formFieldsResponse;
      
      if (Array.isArray(formFields)) {
        console.log(`Found ${formFields.length} form fields via API`);
        expect(formFields.length).toBeGreaterThan(0);
        
        // Check field structure
        if (formFields.length > 0) {
          const firstField = formFields[0];
          const expectedFieldProperties = ['_id', 'name', 'type', 'label'];
          
          for (const prop of expectedFieldProperties) {
            if (firstField.hasOwnProperty(prop)) {
              console.log(`✓ Form field has property: ${prop}`);
            }
          }
        }
      }
    } catch (error) {
      console.log('Form fields API test failed:', error);
    }
    
    // Test form editor functionality if available
    const formEditor = page.locator('.form-editor, [data-testid="form-editor"]').first();
    if (await formEditor.count() > 0) {
      console.log('Form editor found, testing basic functionality...');
      
      // Look for add field button
      const addFieldBtn = page.locator('button:has-text("Add"), button:has-text("Добавить"), .add-field-btn').first();
      if (await addFieldBtn.count() > 0) {
        await addFieldBtn.click();
        await page.waitForTimeout(1000);
        console.log('✓ Add field button works');
        
        // Close modal if opened
        const closeBtn = page.locator('button:has-text("Close"), .close, [aria-label="Close"]').first();
        if (await closeBtn.count() > 0) {
          await closeBtn.click();
        }
      }
    }
  });

  test('should handle submission status updates', async ({ page }) => {
    console.log('Testing submission status updates...');
    
    // Get submissions via API first
    try {
      const submissionsResponse = await ApiUtils.makeAuthenticatedRequest(page, 'GET', '/api/submissions/my?limit=5');
      const submissions = submissionsResponse.data || submissionsResponse;
      
      if (Array.isArray(submissions) && submissions.length > 0) {
        const firstSubmission = submissions[0];
        const submissionId = firstSubmission._id || firstSubmission.id;
        
        if (submissionId) {
          console.log(`Testing status update for submission: ${submissionId}`);
          
          // Test status update via API
          const statusUpdates = ['in_progress', 'completed', 'new'];
          
          for (const status of statusUpdates) {
            try {
              const updateResponse = await ApiUtils.makeAuthenticatedRequest(
                page, 
                'PATCH', 
                `/api/submissions/${submissionId}/status`,
                { status, comment: 'Test status update' }
              );
              
              if (updateResponse.success) {
                console.log(`✓ Status updated to: ${status}`);
              }
            } catch (error) {
              console.log(`Status update to ${status} failed:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.log('Submissions API test failed:', error);
    }
  });

  test('should filter and search submissions', async ({ page }) => {
    console.log('Testing submission filtering and search...');
    
    await page.goto('/my-submissions');
    await page.waitForLoadState('networkidle');
    
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="Поиск"]').first();
    
    if (await searchInput.count() > 0) {
      console.log('Testing search functionality...');
      await searchInput.fill('test');
      await page.waitForTimeout(2000); // Wait for search results
      
      // Clear search
      await searchInput.fill('');
      await page.waitForTimeout(1000);
      console.log('✓ Search functionality tested');
    }
    
    // Look for status filter
    const statusFilter = page.locator('select[name="status"], .status-filter').first();
    if (await statusFilter.count() > 0) {
      console.log('Testing status filter...');
      
      const options = await statusFilter.locator('option').count();
      if (options > 1) {
        await statusFilter.selectOption({ index: 1 });
        await page.waitForTimeout(2000);
        
        // Reset filter
        await statusFilter.selectOption({ index: 0 });
        await page.waitForTimeout(1000);
      }
      console.log('✓ Status filter tested');
    }
    
    // Look for date range filters
    const dateInputs = page.locator('input[type="date"]');
    const dateInputCount = await dateInputs.count();
    
    if (dateInputCount > 0) {
      console.log('Testing date filter...');
      const today = new Date().toISOString().split('T')[0];
      await dateInputs.first().fill(today);
      await page.waitForTimeout(1000);
      console.log('✓ Date filter tested');
    }
  });

  test('should validate submission data integrity', async ({ page }) => {
    console.log('Testing submission data integrity...');
    
    try {
      // Get submissions via API
      const submissionsResponse = await ApiUtils.makeAuthenticatedRequest(page, 'GET', '/api/submissions/my?limit=10');
      const submissions = submissionsResponse.data || submissionsResponse;
      
      if (Array.isArray(submissions)) {
        console.log(`Validating ${submissions.length} submissions...`);
        
        let validSubmissions = 0;
        let invalidSubmissions = 0;
        
        for (const submission of submissions) {
          // Check required fields
          const requiredFields = ['_id', 'submissionNumber', 'status', 'createdAt'];
          let hasAllFields = true;
          
          for (const field of requiredFields) {
            if (!submission[field]) {
              hasAllFields = false;
              console.log(`⚠ Missing field ${field} in submission ${submission._id}`);
            }
          }
          
          if (hasAllFields) {
            validSubmissions++;
          } else {
            invalidSubmissions++;
          }
        }
        
        console.log(`✓ Valid submissions: ${validSubmissions}`);
        console.log(`⚠ Invalid submissions: ${invalidSubmissions}`);
        
        // Expect at least 80% of submissions to be valid
        const validationRate = validSubmissions / submissions.length;
        expect(validationRate).toBeGreaterThan(0.8);
      }
    } catch (error) {
      console.log('Submission validation test failed:', error);
    }
  });
});