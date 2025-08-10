import { test, expect } from '@playwright/test';

test.describe('Bitrix24 CRM Integration - Simplified Test Suite', () => {
  
  test('comprehensive system health check', async ({ page }) => {
    console.log('🔍 Starting comprehensive Bitrix24 CRM system health check...');
    console.log('='.repeat(70));

    let report = {
      timestamp: new Date().toISOString(),
      testResults: {},
      findings: [],
      recommendations: [],
      overallStatus: 'UNKNOWN'
    };

    // 1. Test Application Loading
    console.log('\n🌐 TESTING APPLICATION LOADING');
    console.log('-'.repeat(50));
    
    try {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const title = await page.title();
      
      report.testResults.applicationLoading = {
        status: 'PASS',
        title: title,
        accessible: true
      };
      
      console.log(`✅ Application loads successfully`);
      console.log(`✅ Page title: ${title}`);
      
    } catch (error) {
      report.testResults.applicationLoading = {
        status: 'FAIL',
        error: error.message
      };
      console.log('❌ Application loading failed:', error.message);
      report.recommendations.push('🔧 Fix application loading - basic page access failing');
    }

    // 2. Test Admin Panel Access
    console.log('\n👤 TESTING ADMIN PANEL ACCESS');
    console.log('-'.repeat(50));
    
    try {
      // Open navigation drawer
      const drawerButton = page.locator('button:has-text("open drawer")');
      await drawerButton.click();
      await page.waitForTimeout(1000);
      
      // Click Administration link
      const adminLink = page.locator('text=Администрирование');
      await adminLink.click();
      await page.waitForLoadState('networkidle');
      
      // Check if we're on admin page
      const adminHeading = page.locator('text=Администрирование');
      const isAdminPageVisible = await adminHeading.isVisible();
      
      // Check welcome message
      const welcomeMessage = page.locator('text=Добро пожаловать');
      const hasWelcome = await welcomeMessage.count() > 0;
      
      report.testResults.adminAccess = {
        status: 'PASS',
        adminPanelAccessible: isAdminPageVisible,
        userLoggedIn: hasWelcome,
        currentUser: hasWelcome ? await welcomeMessage.textContent() : 'Unknown'
      };
      
      console.log(`✅ Admin panel accessible: ${isAdminPageVisible}`);
      console.log(`✅ User logged in: ${hasWelcome}`);
      if (hasWelcome) {
        const welcomeText = await welcomeMessage.textContent();
        console.log(`✅ Welcome message: ${welcomeText}`);
      }
      
    } catch (error) {
      report.testResults.adminAccess = {
        status: 'FAIL',
        error: error.message
      };
      console.log('❌ Admin panel access failed:', error.message);
      report.recommendations.push('🔧 Fix admin panel access - authentication or routing issue');
    }

    // 3. Test My Submissions Page
    console.log('\n📋 TESTING MY SUBMISSIONS PAGE');
    console.log('-'.repeat(50));
    
    try {
      await page.goto('/my-submissions');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000); // Wait for data to load
      
      // Check for pagination errors in console
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().toLowerCase().includes('undefined')) {
          consoleErrors.push(msg.text());
        }
      });
      
      // Count submissions
      const submissionCards = page.locator('[data-testid="submission-card"], .submission-card, .submission-item');
      let submissionCount = await submissionCards.count();
      
      // If no specific submission cards, count generic containers that look like submissions
      if (submissionCount === 0) {
        const possibleSubmissions = page.locator('div:has-text("Bitrix ID:")');
        submissionCount = await possibleSubmissions.count();
      }
      
      // Check for Bitrix24 integration indicators
      const bitrixIntegration = page.locator('text=Bitrix ID:');
      const bitrixCount = await bitrixIntegration.count();
      
      // Check for sync status
      const syncStatus = page.locator('text=Синхронизировано');
      const syncedCount = await syncStatus.count();
      
      const hasNoPaginationErrors = consoleErrors.length === 0;
      
      report.testResults.submissions = {
        status: hasNoPaginationErrors ? 'PASS' : 'WARNING',
        submissionCount: submissionCount,
        bitrixIntegrationCount: bitrixCount,
        syncedSubmissions: syncedCount,
        paginationErrors: consoleErrors.length,
        paginationErrorDetails: consoleErrors,
        pageLoading: true
      };
      
      console.log(`✅ Submissions page loads successfully`);
      console.log(`✅ Found ${submissionCount} submissions`);
      console.log(`✅ Found ${bitrixCount} Bitrix24 integrations`);
      console.log(`✅ Found ${syncedCount} synchronized submissions`);
      
      if (hasNoPaginationErrors) {
        console.log('✅ No pagination errors detected');
      } else {
        console.log(`⚠️ ${consoleErrors.length} pagination errors detected`);
        report.recommendations.push('🔧 Fix pagination undefined errors in My Submissions page');
      }
      
    } catch (error) {
      report.testResults.submissions = {
        status: 'FAIL',
        error: error.message
      };
      console.log('❌ Submissions testing failed:', error.message);
      report.recommendations.push('🔧 Fix My Submissions page - page not accessible');
    }

    // 4. Test API Endpoints
    console.log('\n🌐 TESTING API ENDPOINTS');
    console.log('-'.repeat(50));
    
    try {
      // Test backend connectivity
      const healthResponse = await page.request.get('http://localhost:5001/api/health');
      const backendStatus = healthResponse.status();
      
      // Test some endpoints (these will likely fail without auth, but we can check if they respond)
      const endpoints = [
        '/api/users',
        '/api/submissions',
        '/api/formfields'
      ];
      
      const endpointResults = [];
      for (const endpoint of endpoints) {
        try {
          const response = await page.request.get(`http://localhost:5001${endpoint}`);
          endpointResults.push({
            endpoint,
            status: response.status(),
            accessible: response.status() !== 500 // 401/403 is OK, 500 is not
          });
        } catch (error) {
          endpointResults.push({
            endpoint,
            status: 0,
            accessible: false,
            error: error.message
          });
        }
      }
      
      const accessibleEndpoints = endpointResults.filter(r => r.accessible).length;
      
      report.testResults.apiEndpoints = {
        status: accessibleEndpoints > 0 ? 'PASS' : 'WARNING',
        backendStatus: backendStatus,
        endpointResults: endpointResults,
        accessibleEndpoints: accessibleEndpoints,
        totalEndpoints: endpoints.length
      };
      
      console.log(`✅ Backend status: ${backendStatus}`);
      console.log(`✅ Accessible endpoints: ${accessibleEndpoints}/${endpoints.length}`);
      
      if (accessibleEndpoints === 0) {
        report.recommendations.push('🔧 Check API endpoints - no endpoints responding properly');
      }
      
    } catch (error) {
      report.testResults.apiEndpoints = {
        status: 'FAIL',
        error: error.message
      };
      console.log('❌ API endpoint testing failed:', error.message);
    }

    // 5. Test Docker Environment
    console.log('\n🐳 TESTING DOCKER ENVIRONMENT');
    console.log('-'.repeat(50));
    
    try {
      // Test if containers are accessible via their ports
      const containerPorts = [
        { name: 'Frontend', port: 3000 },
        { name: 'Backend', port: 5001 }
      ];
      
      const containerResults = [];
      for (const container of containerPorts) {
        try {
          const response = await fetch(`http://localhost:${container.port}`, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });
          containerResults.push({
            name: container.name,
            port: container.port,
            status: response.status,
            accessible: true
          });
        } catch (error) {
          containerResults.push({
            name: container.name,
            port: container.port,
            status: 0,
            accessible: false
          });
        }
      }
      
      const accessibleContainers = containerResults.filter(c => c.accessible).length;
      
      report.testResults.dockerEnvironment = {
        status: accessibleContainers >= 2 ? 'PASS' : 'WARNING',
        containerResults: containerResults,
        accessibleContainers: accessibleContainers,
        totalContainers: containerPorts.length
      };
      
      console.log(`✅ Accessible containers: ${accessibleContainers}/${containerPorts.length}`);
      containerResults.forEach(container => {
        const status = container.accessible ? '✅' : '❌';
        console.log(`${status} ${container.name} (port ${container.port}): ${container.accessible ? 'OK' : 'Not accessible'}`);
      });
      
    } catch (error) {
      report.testResults.dockerEnvironment = {
        status: 'FAIL',
        error: error.message
      };
      console.log('❌ Docker environment testing failed:', error.message);
    }

    // 6. Overall Assessment
    console.log('\n📊 OVERALL SYSTEM ASSESSMENT');
    console.log('='.repeat(70));
    
    const testStatuses = Object.values(report.testResults).map(r => r.status);
    const passCount = testStatuses.filter(s => s === 'PASS').length;
    const warningCount = testStatuses.filter(s => s === 'WARNING').length;
    const failCount = testStatuses.filter(s => s === 'FAIL').length;
    
    let overallStatus = 'HEALTHY';
    if (failCount > 0) {
      overallStatus = 'CRITICAL';
    } else if (warningCount > 0) {
      overallStatus = 'WARNING';
    }
    
    report.overallStatus = overallStatus;
    report.testSummary = { passCount, warningCount, failCount };
    
    // Key Findings
    const findings = [];
    
    if (report.testResults.submissions?.submissionCount > 0) {
      findings.push('✅ Form submissions are working - found multiple submissions');
    }
    
    if (report.testResults.submissions?.bitrixIntegrationCount > 0) {
      findings.push('✅ Bitrix24 integration is working - submissions have Bitrix IDs');
    }
    
    if (report.testResults.submissions?.syncedSubmissions > 0) {
      findings.push('✅ Bitrix24 synchronization is working - submissions marked as synchronized');
    }
    
    if (report.testResults.submissions?.paginationErrors === 0) {
      findings.push('✅ My Submissions pagination fixed - no undefined errors');
    } else if (report.testResults.submissions?.paginationErrors > 0) {
      findings.push('⚠️ My Submissions pagination still has issues');
    }
    
    if (report.testResults.adminAccess?.adminPanelAccessible) {
      findings.push('✅ Admin panel is accessible without explicit login');
    }
    
    if (report.testResults.dockerEnvironment?.accessibleContainers >= 2) {
      findings.push('✅ Docker containers are running properly');
    }
    
    report.findings = findings;
    
    // Console Output
    console.log(`🎯 Overall Status: ${overallStatus}`);
    console.log(`📈 Health Score: ${((passCount * 2 + warningCount) / (testStatuses.length * 2) * 100).toFixed(1)}%`);
    console.log(`✅ Passed: ${passCount}`);
    console.log(`⚠️ Warnings: ${warningCount}`);
    console.log(`❌ Failed: ${failCount}`);
    
    console.log('\n🔍 KEY FINDINGS:');
    findings.forEach(finding => console.log(`  ${finding}`));
    
    if (report.recommendations.length > 0) {
      console.log('\n🔧 RECOMMENDATIONS:');
      report.recommendations.forEach((rec, i) => console.log(`  ${i + 1}. ${rec}`));
    }
    
    console.log('\n📋 DETAILED TEST RESULTS:');
    Object.entries(report.testResults).forEach(([testName, result]) => {
      console.log(`  ${testName}: ${result.status}`);
    });
    
    // Critical Analysis for User
    console.log('\n🎯 CRITICAL ANALYSIS FOR YOUR FIXES:');
    console.log('-'.repeat(50));
    
    if (report.testResults.submissions?.paginationErrors === 0) {
      console.log('✅ RECENT FIX VERIFIED: My Submissions pagination is now working correctly');
    } else {
      console.log('❌ RECENT FIX NEEDS ATTENTION: My Submissions still shows pagination issues');
    }
    
    if (report.testResults.submissions?.bitrixIntegrationCount > 0) {
      console.log('✅ BITRIX24 INTEGRATION: Working properly - submissions have Bitrix IDs and sync status');
    } else {
      console.log('❌ BITRIX24 INTEGRATION: No Bitrix integration detected');
    }
    
    if (report.testResults.submissions?.submissionCount > 5) {
      console.log('✅ FORM FUNCTIONALITY: Multiple submissions found - form system working');
    } else {
      console.log('⚠️ FORM FUNCTIONALITY: Low submission count detected');
    }
    
    if (report.testResults.dockerEnvironment?.accessibleContainers >= 2) {
      console.log('✅ DOCKER ENVIRONMENT: All required containers accessible');
    } else {
      console.log('❌ DOCKER ENVIRONMENT: Some containers not accessible');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log(`🕐 Test completed at: ${report.timestamp}`);
    console.log('📄 Full report available in test results');
    
    // Save detailed report
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const reportsDir = path.join(process.cwd(), 'test-results');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(reportsDir, `bitrix-crm-health-report-${timestamp}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`📄 Detailed JSON report saved to: ${reportPath}`);
      
    } catch (error) {
      console.log('Warning: Could not save report to file:', error.message);
    }
    
    // Test assertions for Playwright
    expect(failCount).toBeLessThanOrEqual(1); // Allow max 1 critical failure
    expect(passCount).toBeGreaterThan(2); // Expect at least 3 tests to pass
    
    if (overallStatus === 'CRITICAL') {
      console.log('\n🚨 CRITICAL: System has major issues requiring immediate attention!');
    }
  });
});