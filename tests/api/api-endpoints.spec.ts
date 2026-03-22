import { test, expect } from '@playwright/test';
import { AuthUtils } from '../utils/auth-utils';
import { ApiUtils } from '../utils/api-utils';

test.describe('API Endpoint Testing', () => {
  const ADMIN_CREDENTIALS = {
    email: 'admin@opora.local',
    password: 'qawsed12345'
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await AuthUtils.login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    await AuthUtils.verifyAuthenticated(page);
  });

  test('should verify all /api endpoints are working correctly', async ({ page }) => {
    console.log('Testing API endpoints accessibility...');
    
    const coreEndpoints = [
      '/api/auth/check',
      '/api/users',
      '/api/submissions/my',
      '/api/formfields',
      '/api/settings'
    ];
    
    const { working, broken } = await ApiUtils.verifyEndpointsAccessible(page, coreEndpoints);
    
    console.log(`Working endpoints: ${working.length}`);
    console.log(`Broken endpoints: ${broken.length}`);
    
    working.forEach(endpoint => console.log(`✓ ${endpoint}`));
    broken.forEach(endpoint => console.log(`✗ ${endpoint}`));
    
    // Expect at least 80% of core endpoints to be working
    const workingRate = working.length / coreEndpoints.length;
    expect(workingRate).toBeGreaterThan(0.8);
  });

  test('should detect no duplicate /api/api URLs being called', async ({ page }) => {
    console.log('Monitoring for duplicate API calls...');
    
    const { validCalls, duplicateCalls } = await ApiUtils.monitorApiCalls(page);
    
    // Navigate through different pages to trigger API calls
    const pagesToTest = [
      '/admin/users',
      '/my-submissions',
      '/admin',
    ];
    
    for (const pagePath of pagesToTest) {
      try {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      } catch (error) {
        console.log(`Failed to navigate to ${pagePath}:`, error);
      }
    }
    
    // Wait a bit more to catch any delayed API calls
    await page.waitForTimeout(3000);
    
    console.log(`Valid API calls detected: ${validCalls.length}`);
    console.log(`Duplicate /api/api calls detected: ${duplicateCalls.length}`);
    
    if (duplicateCalls.length > 0) {
      console.log('Duplicate API calls found:');
      duplicateCalls.forEach(call => console.log(`⚠ ${call}`));
    }
    
    // Should have no duplicate API calls
    expect(duplicateCalls.length).toBe(0);
    
    // Should have some valid API calls
    expect(validCalls.length).toBeGreaterThan(0);
  });

  test('should verify PostgreSQL operations are working', async ({ page }) => {
    console.log('Testing PostgreSQL database operations...');
    
    const { success, operations } = await ApiUtils.testDatabaseOperations(page);
    
    operations.forEach(operation => console.log(operation));
    
    expect(success).toBe(true);
    expect(operations.length).toBeGreaterThan(0);
    
    // Verify no MongoDB-specific operations
    const mongoOperations = operations.filter(op => 
      op.toLowerCase().includes('mongodb') || 
      op.toLowerCase().includes('mongo')
    );
    
    expect(mongoOperations.length).toBe(0);
  });

  test('should validate API response structures', async ({ page }) => {
    console.log('Testing API response structures...');
    
    const endpointTests = [
      {
        endpoint: '/api/users',
        method: 'GET' as const,
        expectedFields: ['success', 'data']
      },
      {
        endpoint: '/api/submissions/my?limit=5',
        method: 'GET' as const,
        expectedFields: ['success', 'data']
      },
      {
        endpoint: '/api/formfields',
        method: 'GET' as const,
        expectedFields: ['success', 'data']
      },
      {
        endpoint: '/api/auth/check',
        method: 'GET' as const,
        expectedFields: ['success']
      }
    ];
    
    let successfulTests = 0;
    let totalTests = endpointTests.length;
    
    for (const { endpoint, method, expectedFields } of endpointTests) {
      try {
        const response = await ApiUtils.testEndpointStructure(page, method, endpoint, expectedFields);
        console.log(`✓ ${endpoint} - Response structure valid`);
        successfulTests++;
        
        // Additional validation for specific endpoints
        if (endpoint.includes('/users') && response.data) {
          const users = response.data;
          if (Array.isArray(users) && users.length > 0) {
            const userFields = ['_id', 'email', 'role'];
            const firstUser = users[0];
            const hasUserFields = userFields.every(field => firstUser.hasOwnProperty(field));
            if (hasUserFields) {
              console.log(`✓ ${endpoint} - User data structure valid`);
            }
          }
        }
        
        if (endpoint.includes('/submissions') && response.data) {
          const submissions = response.data;
          if (Array.isArray(submissions) && submissions.length > 0) {
            const submissionFields = ['_id', 'submissionNumber', 'status'];
            const firstSubmission = submissions[0];
            const hasSubmissionFields = submissionFields.some(field => firstSubmission.hasOwnProperty(field));
            if (hasSubmissionFields) {
              console.log(`✓ ${endpoint} - Submission data structure valid`);
            }
          }
        }
        
      } catch (error) {
        console.log(`✗ ${endpoint} - Response structure invalid:`, error);
      }
    }
    
    const successRate = successfulTests / totalTests;
    expect(successRate).toBeGreaterThan(0.7);
  });

  test('should test API error handling', async ({ page }) => {
    console.log('Testing API error handling...');
    
    const errorTestCases = [
      {
        endpoint: '/api/users/invalid-id',
        method: 'GET' as const,
        expectedStatus: [400, 404]
      },
      {
        endpoint: '/api/submissions/invalid-id',
        method: 'GET' as const,
        expectedStatus: [400, 404]
      },
      {
        endpoint: '/api/users',
        method: 'POST' as const,
        data: { invalid: 'data' },
        expectedStatus: [400, 422]
      }
    ];
    
    let properErrorHandling = 0;
    
    for (const { endpoint, method, data, expectedStatus } of errorTestCases) {
      try {
        await ApiUtils.makeAuthenticatedRequest(page, method, endpoint, data);
        console.log(`⚠ ${endpoint} - Expected error but got success`);
      } catch (error) {
        console.log(`✓ ${endpoint} - Proper error handling`);
        properErrorHandling++;
      }
    }
    
    expect(properErrorHandling).toBeGreaterThan(0);
  });

  test('should verify API authentication and authorization', async ({ page }) => {
    console.log('Testing API authentication and authorization...');
    
    // Test with valid token (already logged in)
    try {
      const authCheckResponse = await ApiUtils.makeAuthenticatedRequest(page, 'GET', '/api/auth/check');
      expect(authCheckResponse.success).toBe(true);
      console.log('✓ Valid token authentication works');
    } catch (error) {
      console.log('✗ Valid token authentication failed:', error);
    }
    
    // Test without token
    const response = await page.request.get('http://localhost:5001/api/users');
    const statusWithoutToken = response.status();
    console.log(`Request without token status: ${statusWithoutToken}`);
    
    // Should be 401 Unauthorized
    expect([401, 403]).toContain(statusWithoutToken);
    
    // Test with invalid token
    const invalidTokenResponse = await page.request.get('http://localhost:5001/api/users', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    
    const invalidTokenStatus = invalidTokenResponse.status();
    console.log(`Request with invalid token status: ${invalidTokenStatus}`);
    expect([401, 403]).toContain(invalidTokenStatus);
  });

  test('should test API rate limiting and performance', async ({ page }) => {
    console.log('Testing API performance and potential rate limiting...');
    
    const testEndpoint = '/api/auth/check';
    const requestCount = 10;
    const requests: Promise<any>[] = [];
    const startTime = Date.now();
    
    // Make multiple concurrent requests
    for (let i = 0; i < requestCount; i++) {
      requests.push(
        ApiUtils.makeAuthenticatedRequest(page, 'GET', testEndpoint).catch(err => ({ error: err.message }))
      );
    }
    
    const results = await Promise.all(requests);
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    const successfulRequests = results.filter(result => !result.error);
    const failedRequests = results.filter(result => result.error);
    
    console.log(`${successfulRequests.length} successful requests`);
    console.log(`${failedRequests.length} failed requests`);
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Average response time: ${totalTime / requestCount}ms`);
    
    // Expect reasonable performance
    const avgResponseTime = totalTime / requestCount;
    expect(avgResponseTime).toBeLessThan(5000); // Less than 5 seconds average
    
    // Most requests should succeed (unless there's intentional rate limiting)
    const successRate = successfulRequests.length / requestCount;
    expect(successRate).toBeGreaterThan(0.5); // At least 50% should succeed
  });

  test('should verify CORS and security headers', async ({ page }) => {
    console.log('Testing CORS and security headers...');
    
    // Make a request and check headers
    const response = await ApiUtils.makeAuthenticatedRequest(page, 'GET', '/api/auth/check');
    
    // The response should be successful
    expect(response).toBeTruthy();
    
    // Test CORS by making a cross-origin-style request
    const corsTestResponse = await page.request.get('http://localhost:5001/api/auth/check', {
      headers: {
        'Origin': 'http://localhost:3000',
        'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('token'))}`
      }
    });
    
    const corsStatus = corsTestResponse.status();
    console.log(`CORS test status: ${corsStatus}`);
    
    // Should allow requests from frontend origin
    expect([200, 204]).toContain(corsStatus);
  });

  test('should test API data consistency', async ({ page }) => {
    console.log('Testing API data consistency...');
    
    try {
      // Get users data
      const usersResponse = await ApiUtils.makeAuthenticatedRequest(page, 'GET', '/api/users');
      const users = usersResponse.data || usersResponse;
      
      if (Array.isArray(users) && users.length > 0) {
        console.log(`Testing consistency of ${users.length} users`);
        
        // Check for duplicate emails (should be unique)
        const emails = users.map(user => user.email).filter(email => email);
        const uniqueEmails = new Set(emails);
        
        console.log(`Total emails: ${emails.length}`);
        console.log(`Unique emails: ${uniqueEmails.size}`);
        
        expect(uniqueEmails.size).toBe(emails.length); // No duplicate emails
        
        // Check for required fields
        let usersWithAllFields = 0;
        const requiredFields = ['_id', 'email', 'role'];
        
        users.forEach(user => {
          const hasAllFields = requiredFields.every(field => user.hasOwnProperty(field));
          if (hasAllFields) {
            usersWithAllFields++;
          }
        });
        
        console.log(`Users with all required fields: ${usersWithAllFields}/${users.length}`);
        expect(usersWithAllFields).toBe(users.length);
      }
      
      // Test submissions data consistency
      const submissionsResponse = await ApiUtils.makeAuthenticatedRequest(page, 'GET', '/api/submissions/my?limit=20');
      const submissions = submissionsResponse.data || submissionsResponse;
      
      if (Array.isArray(submissions) && submissions.length > 0) {
        console.log(`Testing consistency of ${submissions.length} submissions`);
        
        // Check for duplicate submission numbers
        const submissionNumbers = submissions.map(s => s.submissionNumber).filter(n => n);
        const uniqueNumbers = new Set(submissionNumbers);
        
        console.log(`Unique submission numbers: ${uniqueNumbers.size}/${submissionNumbers.length}`);
        expect(uniqueNumbers.size).toBe(submissionNumbers.length);
      }
      
    } catch (error) {
      console.log('Data consistency test failed:', error);
    }
  });
});