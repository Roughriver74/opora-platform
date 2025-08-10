import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export class DockerUtils {
  /**
   * Check if all required containers are running
   */
  static async checkContainersStatus(): Promise<{
    running: string[];
    missing: string[];
    healthy: string[];
    unhealthy: string[];
  }> {
    const requiredContainers = [
      'beton_frontend',
      'beton_backend', 
      'beton_postgres',
      'beton_redis'
    ];

    const running: string[] = [];
    const missing: string[] = [];
    const healthy: string[] = [];
    const unhealthy: string[] = [];

    try {
      const { stdout } = await execPromise('docker ps --format "table {{.Names}}\\t{{.Status}}"');
      const containerLines = stdout.split('\n').slice(1); // Skip header
      
      for (const containerName of requiredContainers) {
        const containerLine = containerLines.find(line => line.includes(containerName));
        
        if (containerLine) {
          running.push(containerName);
          
          // Check health status
          if (containerLine.includes('healthy')) {
            healthy.push(containerName);
          } else if (containerLine.includes('unhealthy')) {
            unhealthy.push(containerName);
          } else {
            // For containers without health checks
            healthy.push(containerName);
          }
        } else {
          missing.push(containerName);
        }
      }
    } catch (error) {
      console.error('Error checking container status:', error);
      missing.push(...requiredContainers);
    }

    return { running, missing, healthy, unhealthy };
  }

  /**
   * Check container resource usage
   */
  static async checkContainerResources(): Promise<{
    containers: Array<{
      name: string;
      cpu: string;
      memory: string;
      status: 'normal' | 'warning' | 'critical';
    }>;
  }> {
    const containers: Array<{
      name: string;
      cpu: string;
      memory: string;
      status: 'normal' | 'warning' | 'critical';
    }> = [];

    try {
      const { stdout } = await execPromise('docker stats --no-stream --format "table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}"');
      const lines = stdout.split('\n').slice(1); // Skip header
      
      for (const line of lines) {
        if (line.trim() && line.includes('beton_')) {
          const parts = line.split(/\s+/);
          const name = parts[0];
          const cpu = parts[1];
          const memory = parts[2];
          
          // Determine status based on resource usage
          let status: 'normal' | 'warning' | 'critical' = 'normal';
          const cpuValue = parseFloat(cpu.replace('%', ''));
          
          if (cpuValue > 80) {
            status = 'critical';
          } else if (cpuValue > 50) {
            status = 'warning';
          }

          containers.push({ name, cpu, memory, status });
        }
      }
    } catch (error) {
      console.error('Error checking container resources:', error);
    }

    return { containers };
  }

  /**
   * Test nginx proxy routing
   */
  static async testNginxRouting(): Promise<{
    success: boolean;
    routes: Array<{ path: string; status: number; working: boolean }>;
  }> {
    const routes = [
      { path: 'http://localhost:3000/', expectedStatus: 200 },
      { path: 'http://localhost:3000/api/health', expectedStatus: 200 },
      { path: 'http://localhost:5001/api/health', expectedStatus: 200 },
    ];

    const results: Array<{ path: string; status: number; working: boolean }> = [];
    let overallSuccess = true;

    for (const route of routes) {
      try {
        const response = await fetch(route.path, { 
          method: 'GET',
          timeout: 5000 
        });
        
        const working = response.status === route.expectedStatus;
        results.push({
          path: route.path,
          status: response.status,
          working
        });

        if (!working) {
          overallSuccess = false;
        }
      } catch (error) {
        results.push({
          path: route.path,
          status: 0,
          working: false
        });
        overallSuccess = false;
      }
    }

    return { success: overallSuccess, routes: results };
  }

  /**
   * Check Docker Compose services
   */
  static async checkComposeServices(): Promise<{
    services: Array<{
      name: string;
      status: string;
      ports: string;
      working: boolean;
    }>;
  }> {
    const services: Array<{
      name: string;
      status: string;
      ports: string;
      working: boolean;
    }> = [];

    try {
      const { stdout } = await execPromise('docker-compose ps --format table');
      const lines = stdout.split('\n').slice(1); // Skip header
      
      for (const line of lines) {
        if (line.trim() && line.includes('beton')) {
          const parts = line.split(/\s+/);
          const name = parts[0];
          const status = parts[2] || 'unknown';
          const ports = parts[parts.length - 1] || '';
          const working = status.includes('Up');

          services.push({ name, status, ports, working });
        }
      }
    } catch (error) {
      console.error('Error checking compose services:', error);
    }

    return { services };
  }

  /**
   * Check environment configuration
   */
  static async checkEnvironmentConfig(): Promise<{
    production: boolean;
    development: boolean;
    envVars: { [key: string]: boolean };
  }> {
    const envVars: { [key: string]: boolean } = {};
    
    try {
      // Check for environment files
      const { stdout } = await execPromise('ls -la | grep -E "\.env"');
      envVars['.env files present'] = stdout.trim().length > 0;
    } catch {
      envVars['.env files present'] = false;
    }

    try {
      // Check Docker Compose environment
      const { stdout } = await execPromise('docker-compose config | grep -E "environment:|NODE_ENV"');
      envVars['Docker environment configured'] = stdout.trim().length > 0;
    } catch {
      envVars['Docker environment configured'] = false;
    }

    // Determine environment type
    const production = process.env.NODE_ENV === 'production';
    const development = !production;

    return { production, development, envVars };
  }
}