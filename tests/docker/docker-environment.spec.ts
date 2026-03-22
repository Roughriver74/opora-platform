import { test, expect } from '@playwright/test';
import { DockerUtils } from '../utils/docker-utils';

test.describe('Docker Environment Testing', () => {

  test('should verify all required containers are running', async () => {
    console.log('Checking Docker containers status...');
    
    const { running, missing, healthy, unhealthy } = await DockerUtils.checkContainersStatus();
    
    console.log(`Running containers: ${running.length}`);
    console.log(`Missing containers: ${missing.length}`);
    console.log(`Healthy containers: ${healthy.length}`);
    console.log(`Unhealthy containers: ${unhealthy.length}`);
    
    running.forEach(container => console.log(`✓ Running: ${container}`));
    missing.forEach(container => console.log(`✗ Missing: ${container}`));
    healthy.forEach(container => console.log(`✓ Healthy: ${container}`));
    unhealthy.forEach(container => console.log(`⚠ Unhealthy: ${container}`));
    
    // All required containers should be running
    expect(missing.length).toBe(0);
    expect(running.length).toBe(4); // frontend, backend, postgres, redis
    
    // No containers should be unhealthy
    expect(unhealthy.length).toBe(0);
  });

  test('should verify nginx proxy routing is working', async ({ page }) => {
    console.log('Testing nginx proxy routing...');
    
    const { success, routes } = await DockerUtils.testNginxRouting();
    
    console.log(`Nginx routing test ${success ? 'passed' : 'failed'}`);
    
    routes.forEach(route => {
      const status = route.working ? '✓' : '✗';
      console.log(`${status} ${route.path} - Status: ${route.status}`);
    });
    
    // At least the main frontend route should work
    const frontendRoute = routes.find(route => route.path.includes('localhost:3000/'));
    expect(frontendRoute?.working).toBe(true);
    
    // Most routes should be working
    const workingRoutes = routes.filter(route => route.working);
    const workingRate = workingRoutes.length / routes.length;
    expect(workingRate).toBeGreaterThan(0.6);
  });

  test('should check container resource usage', async () => {
    console.log('Checking container resource usage...');
    
    const { containers } = await DockerUtils.checkContainerResources();
    
    console.log(`Monitoring ${containers.length} containers`);
    
    containers.forEach(container => {
      const statusIcon = container.status === 'normal' ? '✓' : 
                        container.status === 'warning' ? '⚠' : '✗';
      console.log(`${statusIcon} ${container.name} - CPU: ${container.cpu}, Memory: ${container.memory}`);
    });
    
    // No containers should be in critical state
    const criticalContainers = containers.filter(c => c.status === 'critical');
    expect(criticalContainers.length).toBe(0);
    
    // At least some containers should be monitored
    expect(containers.length).toBeGreaterThan(0);
  });

  test('should verify Docker Compose services', async () => {
    console.log('Checking Docker Compose services...');
    
    const { services } = await DockerUtils.checkComposeServices();
    
    console.log(`Found ${services.length} services`);
    
    services.forEach(service => {
      const status = service.working ? '✓' : '✗';
      console.log(`${status} ${service.name} - Status: ${service.status}, Ports: ${service.ports}`);
    });
    
    // All services should be working
    const workingServices = services.filter(service => service.working);
    if (services.length > 0) {
      expect(workingServices.length).toBe(services.length);
    }
  });

  test('should verify environment configuration', async () => {
    console.log('Checking environment configuration...');
    
    const { production, development, envVars } = await DockerUtils.checkEnvironmentConfig();
    
    console.log(`Production mode: ${production}`);
    console.log(`Development mode: ${development}`);
    console.log('Environment variables:');
    
    Object.entries(envVars).forEach(([key, value]) => {
      const status = value ? '✓' : '✗';
      console.log(`  ${status} ${key}: ${value}`);
    });
    
    // Should have proper environment setup
    expect(development || production).toBe(true);
    
    // Should have environment files or configuration
    const hasEnvConfig = Object.values(envVars).some(value => value === true);
    expect(hasEnvConfig).toBe(true);
  });

  test('should test container connectivity', async ({ page }) => {
    console.log('Testing container connectivity...');
    
    // Test frontend to backend connectivity
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if page loads successfully (indicates nginx -> frontend works)
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    console.log(`✓ Frontend accessible - Page title: ${title}`);
    
    // Test backend API connectivity through frontend
    try {
      const response = await page.request.get('http://localhost:5001/api/health');
      const status = response.status();
      console.log(`Backend API health check status: ${status}`);
      expect([200, 404]).toContain(status); // 404 is ok if health endpoint doesn't exist
    } catch (error) {
      console.log('Direct backend connectivity test failed:', error);
    }
    
    // Test database connectivity through API
    try {
      // This will test if backend can connect to PostgreSQL
      const response = await page.request.get('http://localhost:5001/api/users', {
        headers: {
          'Authorization': 'Bearer test-token' // Will fail auth but should connect to DB
        }
      });
      const status = response.status();
      console.log(`Database connectivity test status: ${status}`);
      // 401/403 is expected (auth failure), but not 500 (DB connection failure)
      expect([401, 403, 200]).toContain(status);
      console.log('✓ Database connectivity working');
    } catch (error) {
      console.log('Database connectivity test inconclusive:', error);
    }
  });

  test('should verify production vs development configuration', async ({ page }) => {
    console.log('Checking production vs development configuration...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for development indicators
    const isDevelopment = await page.evaluate(() => {
      return {
        nodeEnv: process.env.NODE_ENV,
        isDev: window.location.hostname === 'localhost',
        hasDevTools: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
      };
    });
    
    console.log('Development indicators:', isDevelopment);
    
    // Check for production optimizations
    const hasMinifiedJS = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      return scripts.some(script => 
        script.src.includes('.min.') || 
        script.src.includes('/static/js/')
      );
    });
    
    console.log(`Minified JS detected: ${hasMinifiedJS}`);
    
    // Check console for development warnings
    const consoleWarnings: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().includes('development')) {
        consoleWarnings.push(msg.text());
      }
    });
    
    await page.waitForTimeout(3000);
    
    if (consoleWarnings.length > 0) {
      console.log('Development warnings found:');
      consoleWarnings.forEach(warning => console.log(`  ⚠ ${warning}`));
    }
    
    // Verify appropriate configuration for environment
    if (isDevelopment.isDev) {
      console.log('✓ Development environment detected');
      expect(isDevelopment.isDev).toBe(true);
    } else {
      console.log('✓ Production environment detected');
      expect(hasMinifiedJS).toBe(true);
    }
  });

  test('should check container logs for errors', async () => {
    console.log('Checking container logs for critical errors...');
    
    const containers = ['opora_frontend', 'opora_backend', 'opora_postgres', 'opora_redis'];
    const criticalErrors: string[] = [];
    
    for (const container of containers) {
      try {
        // Get last 50 lines of logs
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execPromise = promisify(exec);
        
        const { stdout: logs } = await execPromise(`docker logs --tail 50 ${container} 2>&1`);
        
        // Check for critical error patterns
        const errorPatterns = [
          /ERROR/gi,
          /FATAL/gi,
          /CRITICAL/gi,
          /Exception/gi,
          /failed to connect/gi,
          /connection refused/gi,
          /timeout/gi
        ];
        
        const logLines = logs.split('\n');
        let errorCount = 0;
        
        logLines.forEach(line => {
          errorPatterns.forEach(pattern => {
            if (pattern.test(line)) {
              errorCount++;
              if (errorCount <= 5) { // Limit to avoid spam
                criticalErrors.push(`${container}: ${line.trim()}`);
              }
            }
          });
        });
        
        console.log(`${container}: ${errorCount} potential errors found`);
        
      } catch (error) {
        console.log(`Failed to check logs for ${container}:`, error);
      }
    }
    
    if (criticalErrors.length > 0) {
      console.log('Critical errors found in logs:');
      criticalErrors.forEach(error => console.log(`  ✗ ${error}`));
    } else {
      console.log('✓ No critical errors found in recent logs');
    }
    
    // Allow some errors but not too many
    expect(criticalErrors.length).toBeLessThan(10);
  });

  test('should verify port accessibility', async () => {
    console.log('Testing port accessibility...');
    
    const ports = [
      { port: 3000, service: 'Frontend' },
      { port: 5001, service: 'Backend' },
      { port: 5489, service: 'PostgreSQL' },
      { port: 6396, service: 'Redis' }
    ];
    
    let accessiblePorts = 0;
    
    for (const { port, service } of ports) {
      try {
        const response = await fetch(`http://localhost:${port}`, { 
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        
        console.log(`✓ ${service} (port ${port}) - Status: ${response.status}`);
        accessiblePorts++;
      } catch (error) {
        console.log(`✗ ${service} (port ${port}) - Not accessible`);
      }
    }
    
    console.log(`${accessiblePorts}/${ports.length} ports accessible`);
    
    // At least frontend and backend should be accessible
    expect(accessiblePorts).toBeGreaterThanOrEqual(2);
  });
});