#!/usr/bin/env tsx

/**
 * Demo Health Check Script
 * Quick verification that critical demo paths are working
 */

import chalk from 'chalk';

interface EndpointTest {
  name: string;
  method: 'GET' | 'POST';
  url: string;
  body?: any;
  expectedStatus: number;
  description: string;
}

const DEMO_ENDPOINTS: EndpointTest[] = [
  {
    name: 'health',
    method: 'GET',
    url: '/api/health',
    expectedStatus: 200,
    description: 'System health check'
  },
  {
    name: 'search-health',
    method: 'GET',
    url: '/api/search',
    expectedStatus: 200,
    description: 'Search service health'
  },
  {
    name: 'search-basic',
    method: 'POST',
    url: '/api/search',
    body: { query: 'demo test search' },
    expectedStatus: 200,
    description: 'Basic search functionality'
  },
  {
    name: 'chat-stream',
    method: 'POST',
    url: '/api/chat/stream',
    body: { message: 'What is this project about?' },
    expectedStatus: 200,
    description: 'Chat streaming response'
  },
  {
    name: 'cost-monitoring',
    method: 'GET',
    url: '/api/monitoring/costs',
    expectedStatus: 200,
    description: 'Cost monitoring dashboard'
  },
  {
    name: 'cache-metrics',
    method: 'GET',
    url: '/api/cache/metrics',
    expectedStatus: 200,
    description: 'Cache performance metrics'
  }
];

class DemoHealthChecker {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async runHealthCheck(): Promise<boolean> {
    console.log(chalk.blue.bold('🏥 Demo Health Check\n'));
    console.log(`Testing against: ${this.baseUrl}\n`);

    let allPassed = true;
    const results: Array<{ name: string; success: boolean; error?: string }> = [];

    for (const endpoint of DEMO_ENDPOINTS) {
      console.log(chalk.yellow(`🔍 Testing ${endpoint.name}: ${endpoint.description}`));

      try {
        const result = await this.testEndpoint(endpoint);
        results.push({ name: endpoint.name, success: result.success, error: result.error });

        if (result.success) {
          console.log(chalk.green(`✅ ${endpoint.name} - OK (${result.responseTime}ms)\n`));
        } else {
          console.log(chalk.red(`❌ ${endpoint.name} - FAILED: ${result.error}\n`));
          allPassed = false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(chalk.red(`💥 ${endpoint.name} - CRASHED: ${errorMessage}\n`));
        results.push({ name: endpoint.name, success: false, error: errorMessage });
        allPassed = false;
      }
    }

    this.displaySummary(results, allPassed);
    return allPassed;
  }

  private async testEndpoint(endpoint: EndpointTest): Promise<{
    success: boolean;
    error?: string;
    responseTime: number;
  }> {
    const startTime = Date.now();
    const url = `${this.baseUrl}${endpoint.url}`;

    try {
      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }

      const response = await fetch(url, options);
      const responseTime = Date.now() - startTime;

      if (response.status !== endpoint.expectedStatus) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Expected ${endpoint.expectedStatus}, got ${response.status}: ${errorText}`,
          responseTime
        };
      }

      // Additional validation for specific endpoints
      if (endpoint.name === 'search-basic') {
        const data = await response.json();
        if (!data.results || !Array.isArray(data.results)) {
          return {
            success: false,
            error: 'Search response missing results array',
            responseTime
          };
        }
      }

      if (endpoint.name === 'chat-stream') {
        const text = await response.text();
        if (text.length === 0) {
          return {
            success: false,
            error: 'Chat stream returned empty response',
            responseTime
          };
        }
      }

      if (endpoint.name === 'cost-monitoring') {
        const data = await response.json();
        if (!data.totalCost || !data.services) {
          return {
            success: false,
            error: 'Cost monitoring response missing required fields',
            responseTime
          };
        }
      }

      return { success: true, responseTime };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        responseTime
      };
    }
  }

  private displaySummary(results: Array<{ name: string; success: boolean; error?: string }>, allPassed: boolean): void {
    console.log(chalk.blue.bold('📊 Health Check Summary\n'));

    const passed = results.filter(r => r.success).length;
    const total = results.length;

    console.log(`Results: ${passed}/${total} endpoints healthy\n`);

    if (allPassed) {
      console.log(chalk.green.bold('🎉 ALL SYSTEMS GO!'));
      console.log(chalk.green('Demo is ready for presentation.'));
      console.log(chalk.green('\nDemo flow suggestions:'));
      console.log(chalk.green('1. Show health dashboard (/api/health)'));
      console.log(chalk.green('2. Demonstrate search (/api/search)'));
      console.log(chalk.green('3. Show chat interaction (/api/chat/stream)'));
      console.log(chalk.green('4. Display monitoring (/api/monitoring/costs)'));
    } else {
      console.log(chalk.red.bold('⚠️  DEMO NOT READY!'));
      console.log(chalk.red('Fix the following issues before demo:'));

      results.forEach(result => {
        if (!result.success) {
          console.log(chalk.red(`  ❌ ${result.name}: ${result.error}`));
        }
      });

      console.log(chalk.yellow('\nTroubleshooting:'));
      console.log(chalk.yellow('1. Ensure application is running (npm start)'));
      console.log(chalk.yellow('2. Check environment variables are set'));
      console.log(chalk.yellow('3. Verify external services (Weaviate, Redis) are accessible'));
      console.log(chalk.yellow('4. Check network connectivity'));
    }

    console.log('\n');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'http://localhost:3000';

  if (args.includes('--help')) {
    console.log(chalk.blue.bold('Demo Health Check\n'));
    console.log('Usage: npm run demo:health-check [base-url]\n');
    console.log('Examples:');
    console.log('  npm run demo:health-check                        # Check localhost:3000');
    console.log('  npm run demo:health-check http://localhost:3001  # Check custom URL');
    console.log('  npm run demo:health-check https://app.vercel.app # Check production');
    return;
  }

  const checker = new DemoHealthChecker(baseUrl);
  const success = await checker.runHealthCheck();

  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}