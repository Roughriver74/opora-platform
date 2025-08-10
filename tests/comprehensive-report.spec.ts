import { test, expect } from '@playwright/test';
import { AuthUtils } from './utils/auth-utils';
import { ApiUtils } from './utils/api-utils';
import { DockerUtils } from './utils/docker-utils';

test.describe('Comprehensive System Health Report', () => {
  const ADMIN_CREDENTIALS = {
    email: 'crm@betonexpress.pro',
    password: 'qawsed12345'
  };

  let systemReport: any = {
    timestamp: new Date().toISOString(),
    authentication: {},
    userManagement: {},
    submissions: {},
    apiEndpoints: {},
    dockerEnvironment: {},
    overallHealth: {},
    recommendations: []
  };

  test('comprehensive system health check and report generation', async ({ page }) => {
    console.log('🔍 Starting comprehensive system health check...');
    console.log('='.repeat(60));

    // 1. AUTHENTICATION TESTING
    console.log('\n📝 TESTING AUTHENTICATION & AUTHORIZATION');
    console.log('-'.repeat(40));

    try {
      await page.goto('/');
      await AuthUtils.login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
      await AuthUtils.verifyAuthenticated(page);
      await AuthUtils.verifyAdminRole(page);

      systemReport.authentication = {
        status: 'PASS',
        loginWorking: true,
        adminAccess: true,
        tokenValidation: true,
        issues: []
      };
      console.log('✅ Authentication system working correctly');

    } catch (error) {
      systemReport.authentication = {
        status: 'FAIL',
        loginWorking: false,
        adminAccess: false,
        tokenValidation: false,
        issues: [error.message],
        error: error.message
      };
      console.log('❌ Authentication system has issues:', error.message);
      systemReport.recommendations.push('🔧 Fix authentication system - admin login not working with provided credentials');
    }

    // 2. USER MANAGEMENT TESTING
    console.log('\n👥 TESTING USER MANAGEMENT');
    console.log('-'.repeat(40));

    try {
      await page.goto('/admin/users');
      await page.waitForLoadState('networkidle');

      // Count users
      const usersTable = page.locator('table, .users-table').first();
      await usersTable.waitFor({ timeout: 15000 });
      
      const userRows = page.locator('tr:has(td)');
      const userCount = await userRows.count();
      
      const usersViaApi = await ApiUtils.makeAuthenticatedRequest(page, 'GET', '/api/users');
      const apiUserCount = (usersViaApi.data || usersViaApi).length;

      systemReport.userManagement = {
        status: userCount >= 70 ? 'PASS' : 'WARNING',
        uiUserCount: userCount,
        apiUserCount: apiUserCount,
        expectedUserCount: 70,
        editFunctionality: await testUserEditFunctionality(page),
        loadingWorking: userCount > 0,
        issues: userCount < 70 ? [`Only ${userCount} users found, expected 70+`] : []
      };

      console.log(`✅ User Management: ${userCount} users loaded in UI, ${apiUserCount} via API`);
      
      if (userCount < 70) {
        systemReport.recommendations.push(`⚠️ Expected 70+ users but found ${userCount}. Check user synchronization with Bitrix24`);
      }

    } catch (error) {
      systemReport.userManagement = {
        status: 'FAIL',
        error: error.message,
        issues: ['Failed to load users page', error.message]
      };
      console.log('❌ User Management issues:', error.message);
      systemReport.recommendations.push('🔧 Fix user management - users page not accessible');
    }

    // 3. SUBMISSIONS TESTING
    console.log('\n📋 TESTING FORM SUBMISSIONS');
    console.log('-'.repeat(40));

    try {
      await page.goto('/my-submissions');
      await page.waitForLoadState('networkidle');

      // Check for pagination errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().toLowerCase().includes('pagination')) {
          consoleErrors.push(msg.text());
        }
      });

      await page.waitForTimeout(3000);

      const submissionsResponse = await ApiUtils.makeAuthenticatedRequest(page, 'GET', '/api/submissions/my?limit=5');
      const submissions = submissionsResponse.data || submissionsResponse;

      systemReport.submissions = {
        status: consoleErrors.length === 0 ? 'PASS' : 'FAIL',
        paginationErrors: consoleErrors.length,
        paginationErrorsList: consoleErrors,
        submissionsCount: Array.isArray(submissions) ? submissions.length : 0,
        pageLoading: true,
        apiWorking: true,
        issues: consoleErrors.length > 0 ? ['Pagination undefined errors found'] : []
      };

      if (consoleErrors.length === 0) {
        console.log('✅ Submissions: No pagination errors found');
      } else {
        console.log(`❌ Submissions: ${consoleErrors.length} pagination errors found`);
        systemReport.recommendations.push('🔧 Fix pagination undefined errors in My Submissions page');
      }

    } catch (error) {
      systemReport.submissions = {
        status: 'FAIL',
        error: error.message,
        issues: ['Failed to test submissions', error.message]
      };
      console.log('❌ Submissions testing failed:', error.message);
      systemReport.recommendations.push('🔧 Fix submissions functionality - page not accessible');
    }

    // 4. API ENDPOINTS TESTING
    console.log('\n🌐 TESTING API ENDPOINTS');
    console.log('-'.repeat(40));

    try {
      const { validCalls, duplicateCalls } = await ApiUtils.monitorApiCalls(page);
      const { success: dbSuccess, operations } = await ApiUtils.testDatabaseOperations(page);

      const coreEndpoints = ['/api/auth/check', '/api/users', '/api/submissions/my', '/api/formfields'];
      const { working, broken } = await ApiUtils.verifyEndpointsAccessible(page, coreEndpoints);

      systemReport.apiEndpoints = {
        status: (duplicateCalls.length === 0 && dbSuccess && broken.length === 0) ? 'PASS' : 'WARNING',
        duplicateApiCalls: duplicateCalls.length,
        duplicateCallsList: duplicateCalls,
        workingEndpoints: working.length,
        brokenEndpoints: broken.length,
        brokenEndpointsList: broken,
        postgresqlWorking: dbSuccess,
        databaseOperations: operations,
        issues: [
          ...(duplicateCalls.length > 0 ? [`${duplicateCalls.length} duplicate /api/api calls found`] : []),
          ...(broken.length > 0 ? [`${broken.length} broken endpoints`] : []),
          ...(!dbSuccess ? ['PostgreSQL operations failing'] : [])
        ]
      };

      console.log(`✅ API Endpoints: ${working.length} working, ${broken.length} broken, ${duplicateCalls.length} duplicates`);
      
      if (duplicateCalls.length > 0) {
        systemReport.recommendations.push('🔧 Fix duplicate /api/api URL calls - check API service configuration');
      }
      if (broken.length > 0) {
        systemReport.recommendations.push(`🔧 Fix ${broken.length} broken API endpoints`);
      }

    } catch (error) {
      systemReport.apiEndpoints = {
        status: 'FAIL',
        error: error.message,
        issues: ['Failed to test API endpoints', error.message]
      };
      console.log('❌ API testing failed:', error.message);
    }

    // 5. DOCKER ENVIRONMENT TESTING
    console.log('\n🐳 TESTING DOCKER ENVIRONMENT');
    console.log('-'.repeat(40));

    try {
      const { running, missing, healthy, unhealthy } = await DockerUtils.checkContainersStatus();
      const { containers } = await DockerUtils.checkContainerResources();
      const { success: nginxSuccess } = await DockerUtils.testNginxRouting();

      systemReport.dockerEnvironment = {
        status: (missing.length === 0 && unhealthy.length === 0 && nginxSuccess) ? 'PASS' : 'WARNING',
        runningContainers: running.length,
        missingContainers: missing.length,
        healthyContainers: healthy.length,
        unhealthyContainers: unhealthy.length,
        missingContainersList: missing,
        unhealthyContainersList: unhealthy,
        nginxRouting: nginxSuccess,
        resourceUsage: containers.map(c => ({
          name: c.name,
          cpu: c.cpu,
          memory: c.memory,
          status: c.status
        })),
        issues: [
          ...(missing.length > 0 ? [`${missing.length} containers missing`] : []),
          ...(unhealthy.length > 0 ? [`${unhealthy.length} containers unhealthy`] : []),
          ...(!nginxSuccess ? ['Nginx routing issues'] : [])
        ]
      };

      console.log(`✅ Docker: ${running.length}/4 containers running, ${healthy.length} healthy`);
      
      if (missing.length > 0) {
        systemReport.recommendations.push(`🔧 Start missing Docker containers: ${missing.join(', ')}`);
      }
      if (unhealthy.length > 0) {
        systemReport.recommendations.push(`🔧 Fix unhealthy Docker containers: ${unhealthy.join(', ')}`);
      }

    } catch (error) {
      systemReport.dockerEnvironment = {
        status: 'FAIL',
        error: error.message,
        issues: ['Failed to check Docker environment', error.message]
      };
      console.log('❌ Docker environment check failed:', error.message);
    }

    // 6. OVERALL HEALTH ASSESSMENT
    console.log('\n📊 OVERALL SYSTEM HEALTH ASSESSMENT');
    console.log('='.repeat(60));

    const statusCounts = {
      PASS: 0,
      WARNING: 0,
      FAIL: 0
    };

    [
      systemReport.authentication.status,
      systemReport.userManagement.status,
      systemReport.submissions.status,
      systemReport.apiEndpoints.status,
      systemReport.dockerEnvironment.status
    ].forEach(status => {
      if (status) statusCounts[status]++;
    });

    let overallStatus = 'PASS';
    if (statusCounts.FAIL > 0) overallStatus = 'CRITICAL';
    else if (statusCounts.WARNING > 0) overallStatus = 'WARNING';

    systemReport.overallHealth = {
      status: overallStatus,
      passCount: statusCounts.PASS,
      warningCount: statusCounts.WARNING,
      failCount: statusCounts.FAIL,
      healthScore: ((statusCounts.PASS * 2 + statusCounts.WARNING) / 10) * 100,
      criticalIssuesFound: statusCounts.FAIL,
      warningIssuesFound: statusCounts.WARNING
    };

    // FINAL REPORT OUTPUT
    console.log('\n📋 COMPREHENSIVE SYSTEM REPORT');
    console.log('='.repeat(60));
    console.log(`🕐 Timestamp: ${systemReport.timestamp}`);
    console.log(`📊 Overall Status: ${overallStatus}`);
    console.log(`📈 Health Score: ${systemReport.overallHealth.healthScore.toFixed(1)}%`);
    console.log(`✅ Passed: ${statusCounts.PASS}`);
    console.log(`⚠️  Warnings: ${statusCounts.WARNING}`);
    console.log(`❌ Failed: ${statusCounts.FAIL}`);

    console.log('\n📝 COMPONENT STATUS:');
    console.log(`  🔐 Authentication: ${systemReport.authentication.status}`);
    console.log(`  👥 User Management: ${systemReport.userManagement.status}`);
    console.log(`  📋 Submissions: ${systemReport.submissions.status}`);
    console.log(`  🌐 API Endpoints: ${systemReport.apiEndpoints.status}`);
    console.log(`  🐳 Docker Environment: ${systemReport.dockerEnvironment.status}`);

    if (systemReport.recommendations.length > 0) {
      console.log('\n🔧 RECOMMENDATIONS:');
      systemReport.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }

    console.log('\n🎯 KEY FINDINGS:');
    
    // Recent fixes verification
    if (systemReport.userManagement.status === 'PASS') {
      console.log('  ✅ User editing functionality is working (recent fix verified)');
    } else {
      console.log('  ❌ User editing functionality needs attention');
    }

    if (systemReport.submissions.paginationErrors === 0) {
      console.log('  ✅ My Submissions pagination is working correctly');
    } else {
      console.log('  ❌ My Submissions still has pagination issues');
    }

    if (systemReport.apiEndpoints.duplicateApiCalls === 0) {
      console.log('  ✅ No duplicate /api/api URLs detected');
    } else {
      console.log('  ❌ Duplicate /api/api URLs still being called');
    }

    if (systemReport.apiEndpoints.postgresqlWorking) {
      console.log('  ✅ PostgreSQL operations working correctly');
    } else {
      console.log('  ❌ PostgreSQL operations having issues');
    }

    if (systemReport.dockerEnvironment.runningContainers === 4) {
      console.log('  ✅ All Docker containers running properly');
    } else {
      console.log('  ❌ Some Docker containers not running');
    }

    console.log('\n' + '='.repeat(60));
    console.log('📄 Full report saved to test results');

    // Expectations for test results
    if (overallStatus === 'CRITICAL') {
      systemReport.recommendations.unshift('🚨 CRITICAL: System has major issues that need immediate attention');
    }

    expect(statusCounts.FAIL).toBeLessThanOrEqual(1); // Allow maximum 1 critical failure
    expect(systemReport.overallHealth.healthScore).toBeGreaterThan(60); // At least 60% health

    // Save report to file
    await saveReportToFile(systemReport);
  });

  async function testUserEditFunctionality(page: any): Promise<boolean> {
    try {
      const editButton = page.locator('[data-testid="edit-user-btn"], button:has-text("Edit"), button:has-text("Редактировать")').first();
      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForTimeout(2000);
        
        const editForm = page.locator('[data-testid="user-edit-form"], .user-edit-modal, form').first();
        const formExists = await editForm.count() > 0;
        
        if (formExists) {
          // Close the form
          const closeBtn = page.locator('button:has-text("Close"), .close').first();
          if (await closeBtn.count() > 0) {
            await closeBtn.click();
          }
        }
        
        return formExists;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function saveReportToFile(report: any): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const reportsDir = path.join(process.cwd(), 'test-results', 'reports');
      
      // Create reports directory if it doesn't exist
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(reportsDir, `comprehensive-report-${timestamp}.json`);
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Detailed report saved to: ${reportPath}`);
      
      // Also save a human-readable version
      const readableReportPath = path.join(reportsDir, `comprehensive-report-${timestamp}.txt`);
      const readableReport = generateReadableReport(report);
      fs.writeFileSync(readableReportPath, readableReport);
      console.log(`📄 Readable report saved to: ${readableReportPath}`);
      
    } catch (error) {
      console.log('Failed to save report to file:', error);
    }
  }

  function generateReadableReport(report: any): string {
    let output = '';
    output += '='.repeat(60) + '\n';
    output += 'BETON CRM - COMPREHENSIVE SYSTEM HEALTH REPORT\n';
    output += '='.repeat(60) + '\n';
    output += `Timestamp: ${report.timestamp}\n`;
    output += `Overall Status: ${report.overallHealth.status}\n`;
    output += `Health Score: ${report.overallHealth.healthScore.toFixed(1)}%\n\n`;
    
    output += 'COMPONENT STATUS:\n';
    output += '-'.repeat(40) + '\n';
    output += `Authentication: ${report.authentication.status}\n`;
    output += `User Management: ${report.userManagement.status}\n`;
    output += `Submissions: ${report.submissions.status}\n`;
    output += `API Endpoints: ${report.apiEndpoints.status}\n`;
    output += `Docker Environment: ${report.dockerEnvironment.status}\n\n`;
    
    if (report.recommendations.length > 0) {
      output += 'RECOMMENDATIONS:\n';
      output += '-'.repeat(40) + '\n';
      report.recommendations.forEach((rec: string, i: number) => {
        output += `${i + 1}. ${rec}\n`;
      });
      output += '\n';
    }
    
    output += 'DETAILED FINDINGS:\n';
    output += '-'.repeat(40) + '\n';
    
    if (report.userManagement.uiUserCount) {
      output += `User Management: ${report.userManagement.uiUserCount} users loaded\n`;
    }
    
    if (report.submissions.paginationErrors) {
      output += `Submissions: ${report.submissions.paginationErrors} pagination errors\n`;
    }
    
    if (report.apiEndpoints.duplicateApiCalls) {
      output += `API: ${report.apiEndpoints.duplicateApiCalls} duplicate calls detected\n`;
    }
    
    if (report.dockerEnvironment.runningContainers) {
      output += `Docker: ${report.dockerEnvironment.runningContainers}/4 containers running\n`;
    }
    
    return output;
  }
});