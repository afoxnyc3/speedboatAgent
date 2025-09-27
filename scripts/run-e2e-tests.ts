#!/usr/bin/env tsx

/**
 * E2E Test Runner Script
 * Comprehensive test runner for local development and demo preparation
 */

import { spawn, ChildProcess } from 'child_process';
import chalk from 'chalk';
import Table from 'cli-table3';

interface TestSuite {
  name: string;
  file: string;
  description: string;
  critical: boolean;
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'search',
    file: 'search.spec.ts',
    description: 'Search API functionality',
    critical: true
  },
  {
    name: 'chat',
    file: 'chat.spec.ts',
    description: 'Chat streaming responses',
    critical: true
  },
  {
    name: 'performance',
    file: 'performance.spec.ts',
    description: 'Performance monitoring',
    critical: true
  },
  {
    name: 'error-handling',
    file: 'error-handling.spec.ts',
    description: 'Error scenarios and recovery',
    critical: false
  }
];

class E2ETestRunner {
  private appProcess: ChildProcess | null = null;
  private readonly baseUrl = 'http://localhost:3000';
  private readonly healthEndpoint = `${this.baseUrl}/api/health`;

  async run(suites: string[] = [], options: { headed?: boolean; debug?: boolean; ui?: boolean } = {}) {
    console.log(chalk.blue.bold('🧪 E2E Test Runner for Demo Preparation\n'));

    try {
      // Step 1: Build the application
      await this.buildApplication();

      // Step 2: Start the application
      await this.startApplication();

      // Step 3: Wait for application to be ready
      await this.waitForApplication();

      // Step 4: Run tests
      const results = await this.runTests(suites, options);

      // Step 5: Display results
      this.displayResults(results);

      // Step 6: Demo readiness check
      this.checkDemoReadiness(results);

    } catch (error) {
      console.error(chalk.red('❌ E2E test run failed:'), error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  private async buildApplication(): Promise<void> {
    console.log(chalk.yellow('📦 Building application...'));

    return new Promise((resolve, reject) => {
      const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' });

      buildProcess.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green('✅ Application built successfully\n'));
          resolve();
        } else {
          reject(new Error(`Build failed with code ${code}`));
        }
      });
    });
  }

  private async startApplication(): Promise<void> {
    console.log(chalk.yellow('🚀 Starting application...'));

    return new Promise((resolve, reject) => {
      this.appProcess = spawn('npm', ['start'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      let output = '';
      const timeout = setTimeout(() => {
        reject(new Error('Application start timeout'));
      }, 30000);

      this.appProcess.stdout?.on('data', (data) => {
        output += data.toString();
        if (output.includes('Ready') || output.includes('started server')) {
          clearTimeout(timeout);
          console.log(chalk.green('✅ Application started\n'));
          resolve();
        }
      });

      this.appProcess.stderr?.on('data', (data) => {
        console.error('App stderr:', data.toString());
      });

      this.appProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Give the app a moment to start
      setTimeout(() => {
        if (!output.includes('Ready') && !output.includes('started server')) {
          clearTimeout(timeout);
          console.log(chalk.yellow('⏳ Application starting (checking health endpoint)...'));
          resolve();
        }
      }, 5000);
    });
  }

  private async waitForApplication(): Promise<void> {
    console.log(chalk.yellow('🔍 Waiting for application to be ready...'));

    const maxAttempts = 30;
    const delay = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(this.healthEndpoint);
        if (response.ok) {
          console.log(chalk.green('✅ Application is ready\n'));
          return;
        }
      } catch (error) {
        // Application not ready yet
      }

      if (attempt === maxAttempts) {
        throw new Error('Application failed to become ready');
      }

      console.log(chalk.gray(`   Attempt ${attempt}/${maxAttempts}...`));
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private async runTests(suites: string[], options: { headed?: boolean; debug?: boolean; ui?: boolean }): Promise<Map<string, boolean>> {
    console.log(chalk.blue.bold('🧪 Running E2E Tests\n'));

    const results = new Map<string, boolean>();
    const suitesToRun = suites.length > 0 ?
      TEST_SUITES.filter(suite => suites.includes(suite.name)) :
      TEST_SUITES;

    if (options.ui) {
      console.log(chalk.yellow('🎮 Starting Playwright UI...'));
      return this.runPlaywrightUI();
    }

    for (const suite of suitesToRun) {
      console.log(chalk.yellow(`🔬 Running ${suite.name} tests: ${suite.description}`));

      try {
        const success = await this.runTestSuite(suite, options);
        results.set(suite.name, success);

        if (success) {
          console.log(chalk.green(`✅ ${suite.name} tests passed\n`));
        } else {
          console.log(chalk.red(`❌ ${suite.name} tests failed\n`));
        }
      } catch (error) {
        console.error(chalk.red(`💥 ${suite.name} tests crashed:`), error);
        results.set(suite.name, false);
      }
    }

    return results;
  }

  private async runTestSuite(suite: TestSuite, options: { headed?: boolean; debug?: boolean }): Promise<boolean> {
    return new Promise((resolve) => {
      const args = ['test', suite.file];

      if (options.headed) {
        args.push('--headed');
      }

      if (options.debug) {
        args.push('--debug');
      }

      const testProcess = spawn('npx', ['playwright', ...args], {
        stdio: 'inherit',
        env: {
          ...process.env,
          PLAYWRIGHT_BASE_URL: this.baseUrl
        }
      });

      testProcess.on('close', (code) => {
        resolve(code === 0);
      });
    });
  }

  private async runPlaywrightUI(): Promise<Map<string, boolean>> {
    return new Promise((resolve) => {
      const uiProcess = spawn('npx', ['playwright', 'test', '--ui'], {
        stdio: 'inherit',
        env: {
          ...process.env,
          PLAYWRIGHT_BASE_URL: this.baseUrl
        }
      });

      uiProcess.on('close', () => {
        // Return empty results for UI mode
        resolve(new Map());
      });
    });
  }

  private displayResults(results: Map<string, boolean>): void {
    if (results.size === 0) {
      return; // UI mode or no tests run
    }

    console.log(chalk.blue.bold('\n📊 Test Results Summary\n'));

    const table = new Table({
      head: ['Test Suite', 'Status', 'Critical', 'Description'],
      colWidths: [15, 10, 10, 40]
    });

    TEST_SUITES.forEach(suite => {
      const result = results.get(suite.name);
      const status = result === undefined ? 'SKIPPED' : result ? 'PASS' : 'FAIL';
      const statusColor = result === undefined ? 'gray' : result ? 'green' : 'red';

      table.push([
        suite.name,
        chalk[statusColor](status),
        suite.critical ? chalk.red('YES') : chalk.gray('NO'),
        suite.description
      ]);
    });

    console.log(table.toString());
  }

  private checkDemoReadiness(results: Map<string, boolean>): void {
    console.log(chalk.blue.bold('\n🎯 Demo Readiness Check\n'));

    const criticalSuites = TEST_SUITES.filter(suite => suite.critical);
    const criticalResults = criticalSuites.map(suite => ({
      name: suite.name,
      passed: results.get(suite.name) === true
    }));

    const allCriticalPassed = criticalResults.every(result => result.passed);
    const totalPassed = Array.from(results.values()).filter(Boolean).length;
    const totalTests = results.size;

    if (allCriticalPassed) {
      console.log(chalk.green.bold('✅ DEMO READY!'));
      console.log(chalk.green('All critical test suites passed. Safe to demonstrate:'));
      console.log(chalk.green('  🔍 Search functionality (/api/search)'));
      console.log(chalk.green('  💬 Chat streaming (/api/chat/stream)'));
      console.log(chalk.green('  📊 Performance monitoring (/api/monitoring/*)'));

      if (totalPassed === totalTests) {
        console.log(chalk.green.bold('\n🌟 PERFECT SCORE! All tests passed.'));
      } else {
        console.log(chalk.yellow(`\n⚠️  Note: ${totalTests - totalPassed} non-critical tests failed.`));
      }
    } else {
      console.log(chalk.red.bold('❌ NOT DEMO READY!'));
      console.log(chalk.red('Critical test failures detected:'));

      criticalResults.forEach(result => {
        if (!result.passed) {
          console.log(chalk.red(`  ❌ ${result.name}`));
        }
      });

      console.log(chalk.yellow('\n🔧 Fix critical issues before demo!'));
    }

    console.log(chalk.blue(`\nOverall: ${totalPassed}/${totalTests} test suites passed`));
  }

  private async cleanup(): Promise<void> {
    console.log(chalk.yellow('\n🧹 Cleaning up...'));

    if (this.appProcess) {
      this.appProcess.kill('SIGTERM');

      // Give it a moment to shut down gracefully
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (this.appProcess.killed === false) {
        this.appProcess.kill('SIGKILL');
      }
    }

    console.log(chalk.green('✅ Cleanup complete\n'));
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new E2ETestRunner();

  // Parse arguments
  const suites: string[] = [];
  const options: { headed?: boolean; debug?: boolean; ui?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--headed':
        options.headed = true;
        break;
      case '--debug':
        options.debug = true;
        break;
      case '--ui':
        options.ui = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        if (TEST_SUITES.some(suite => suite.name === arg)) {
          suites.push(arg);
        } else {
          console.error(chalk.red(`Unknown argument: ${arg}`));
          printHelp();
          process.exit(1);
        }
    }
  }

  await runner.run(suites, options);
}

function printHelp() {
  console.log(chalk.blue.bold('E2E Test Runner\n'));
  console.log('Usage: npm run test:e2e:runner [suite...] [options]\n');
  console.log('Test Suites:');
  TEST_SUITES.forEach(suite => {
    const critical = suite.critical ? chalk.red(' (critical)') : '';
    console.log(`  ${suite.name}${critical} - ${suite.description}`);
  });
  console.log('\nOptions:');
  console.log('  --headed    Run in headed mode (visible browser)');
  console.log('  --debug     Run in debug mode');
  console.log('  --ui        Open Playwright UI');
  console.log('  --help      Show this help\n');
  console.log('Examples:');
  console.log('  npm run test:e2e:runner                    # Run all tests');
  console.log('  npm run test:e2e:runner search chat        # Run specific suites');
  console.log('  npm run test:e2e:runner --headed           # Run with visible browser');
  console.log('  npm run test:e2e:runner --ui               # Open UI mode');
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export { E2ETestRunner };