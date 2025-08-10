import { Page, APIRequestContext } from '@playwright/test';

export class ApiUtils {
  /**
   * Make authenticated API request
   */
  static async makeAuthenticatedRequest(
    page: Page,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
    data?: any
  ): Promise<any> {
    // Get auth token from localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const baseURL = 'http://localhost:5001';
    const fullUrl = url.startsWith('/') ? `${baseURL}${url}` : `${baseURL}/${url}`;

    const response = await page.request.fetch(fullUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok()) {
      throw new Error(`API request failed: ${response.status()} ${response.statusText()}`);
    }

    return await response.json();
  }

  /**
   * Test API endpoint response structure
   */
  static async testEndpointStructure(
    page: Page,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
    expectedFields: string[],
    data?: any
  ): Promise<any> {
    const response = await this.makeAuthenticatedRequest(page, method, url, data);
    
    // Check if response has expected structure
    for (const field of expectedFields) {
      if (!(field in response)) {
        throw new Error(`Expected field '${field}' not found in API response from ${url}`);
      }
    }

    return response;
  }

  /**
   * Check for duplicate API calls (e.g., /api/api instead of /api)
   */
  static async monitorApiCalls(page: Page): Promise<{ validCalls: string[], duplicateCalls: string[] }> {
    const apiCalls: string[] = [];
    const duplicateCalls: string[] = [];
    const validCalls: string[] = [];

    // Monitor all network requests
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api')) {
        apiCalls.push(url);
        
        // Check for duplicate /api/api patterns
        if (url.includes('/api/api')) {
          duplicateCalls.push(url);
        } else if (url.match(/\/api\/[^/]+/)) {
          validCalls.push(url);
        }
      }
    });

    return { validCalls, duplicateCalls };
  }

  /**
   * Verify API endpoints are accessible
   */
  static async verifyEndpointsAccessible(page: Page, endpoints: string[]): Promise<{ working: string[], broken: string[] }> {
    const working: string[] = [];
    const broken: string[] = [];

    for (const endpoint of endpoints) {
      try {
        await this.makeAuthenticatedRequest(page, 'GET', endpoint);
        working.push(endpoint);
      } catch (error) {
        broken.push(endpoint);
        console.warn(`Endpoint ${endpoint} is not accessible:`, error);
      }
    }

    return { working, broken };
  }

  /**
   * Test PostgreSQL operations through API
   */
  static async testDatabaseOperations(page: Page): Promise<{ success: boolean, operations: string[] }> {
    const operations: string[] = [];
    
    try {
      // Test users endpoint (should use PostgreSQL)
      const usersResponse = await this.makeAuthenticatedRequest(page, 'GET', '/api/users');
      operations.push('Users table read - SUCCESS');

      // Test submissions endpoint
      const submissionsResponse = await this.makeAuthenticatedRequest(page, 'GET', '/api/submissions/my?page=1&limit=5');
      operations.push('Submissions table read - SUCCESS');

      // Test form fields endpoint
      const formFieldsResponse = await this.makeAuthenticatedRequest(page, 'GET', '/api/formfields');
      operations.push('Form fields table read - SUCCESS');

      return { success: true, operations };
    } catch (error) {
      operations.push(`Database operation failed: ${error}`);
      return { success: false, operations };
    }
  }
}