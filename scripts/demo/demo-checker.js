#!/usr/bin/env node

/**
 * Demo Day System Checker
 *
 * This script performs comprehensive system checks before demo day
 * to ensure all components are working correctly.
 */

const fetch = require('node-fetch');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  baseUrl: process.env.DEMO_BASE_URL || 'https://your-domain.vercel.app',
  timeout: 15000, // 15 seconds
  requiredEnvVars: [
    'OPENAI_API_KEY',
    'WEAVIATE_HOST',
    'WEAVIATE_API_KEY',
    'UPSTASH_REDIS_URL',
    'GITHUB_TOKEN'
  ],
  criticalEndpoints: [
    '/api/health',
    '/api/search',
    '/api/chat'
  ],
  testQueries: [
    'What is the project architecture?',
    'How does the hybrid search work?'
  ]
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// Test results storage
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function addResult(name, status, message, data = null) {
  const result = {
    name,
    status, // 'pass', 'fail', 'warn'
    message,
    data,
    timestamp: new Date().toISOString()
  };

  results.tests.push(result);

  switch (status) {
    case 'pass':
      results.passed++;
      log(`✅ ${name}: ${message}`, 'green');
      break;
    case 'fail':
      results.failed++;
      log(`❌ ${name}: ${message}`, 'red');
      break;
    case 'warn':
      results.warnings++;
      log(`⚠️ ${name}: ${message}`, 'yellow');
      break;
  }

  return result;
}

// Individual test functions
async function checkEnvironmentVariables() {
  log('🔍 Checking environment variables...', 'blue');

  const missing = [];
  const present = [];

  for (const envVar of config.requiredEnvVars) {
    if (process.env[envVar]) {
      present.push(envVar);
    } else {
      missing.push(envVar);
    }
  }

  if (missing.length === 0) {
    addResult('Environment Variables', 'pass', `All ${present.length} required variables present`);
  } else {
    addResult('Environment Variables', 'fail', `Missing: ${missing.join(', ')}`);
  }

  return missing.length === 0;
}

async function checkGitStatus() {
  log('🔍 Checking git status...', 'blue');

  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().substring(0, 8);

    if (status) {
      addResult('Git Status', 'warn', `Uncommitted changes detected on branch ${branch}`, { branch, commitHash, uncommitted: true });
    } else {
      addResult('Git Status', 'pass', `Clean working tree on branch ${branch} (${commitHash})`, { branch, commitHash, uncommitted: false });
    }

    return true;
  } catch (error) {
    addResult('Git Status', 'fail', `Git check failed: ${error.message}`);
    return false;
  }
}

async function checkApplicationHealth() {
  log('🔍 Checking application health...', 'blue');

  try {
    const response = await fetch(`${config.baseUrl}/api/health`, {
      timeout: config.timeout
    });

    if (response.ok) {
      const health = await response.json();
      addResult('Application Health', 'pass', `Application is healthy`, health);
      return true;
    } else {
      addResult('Application Health', 'fail', `Health check returned ${response.status}`);
      return false;
    }
  } catch (error) {
    addResult('Application Health', 'fail', `Health check failed: ${error.message}`);
    return false;
  }
}

async function checkAPIEndpoints() {
  log('🔍 Checking API endpoints...', 'blue');

  let allPassed = true;

  for (const endpoint of config.criticalEndpoints) {
    try {
      const startTime = Date.now();
      const response = await fetch(`${config.baseUrl}${endpoint}`, {
        timeout: config.timeout,
        method: endpoint === '/api/chat' ? 'POST' : 'GET',
        headers: endpoint === '/api/chat' ? { 'Content-Type': 'application/json' } : {},
        body: endpoint === '/api/chat' ? JSON.stringify({
          message: 'test',
          sessionId: 'health-check'
        }) : undefined
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        addResult(`Endpoint ${endpoint}`, 'pass', `Responded in ${duration}ms`, { duration, status: response.status });
      } else {
        addResult(`Endpoint ${endpoint}`, 'fail', `Returned ${response.status}`, { duration, status: response.status });
        allPassed = false;
      }
    } catch (error) {
      addResult(`Endpoint ${endpoint}`, 'fail', `Request failed: ${error.message}`);
      allPassed = false;
    }
  }

  return allPassed;
}

async function checkExternalServices() {
  log('🔍 Checking external services...', 'blue');

  let allPassed = true;

  // Check OpenAI API
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      timeout: config.timeout
    });

    if (response.ok) {
      addResult('OpenAI API', 'pass', 'OpenAI API accessible');
    } else {
      addResult('OpenAI API', 'fail', `OpenAI API returned ${response.status}`);
      allPassed = false;
    }
  } catch (error) {
    addResult('OpenAI API', 'fail', `OpenAI API check failed: ${error.message}`);
    allPassed = false;
  }

  // Check Weaviate
  if (process.env.WEAVIATE_HOST) {
    try {
      const response = await fetch(`${process.env.WEAVIATE_HOST}/v1/.well-known/ready`, {
        timeout: config.timeout
      });

      if (response.ok) {
        addResult('Weaviate', 'pass', 'Weaviate cluster is ready');
      } else {
        addResult('Weaviate', 'fail', `Weaviate returned ${response.status}`);
        allPassed = false;
      }
    } catch (error) {
      addResult('Weaviate', 'fail', `Weaviate check failed: ${error.message}`);
      allPassed = false;
    }
  }

  // Check Redis (if redis-cli is available)
  if (process.env.UPSTASH_REDIS_URL) {
    try {
      const result = execSync(`redis-cli -u "${process.env.UPSTASH_REDIS_URL}" ping`, {
        encoding: 'utf8',
        timeout: 5000
      }).trim();

      if (result === 'PONG') {
        addResult('Redis Cache', 'pass', 'Redis is responding');
      } else {
        addResult('Redis Cache', 'warn', 'Redis ping returned unexpected response');
      }
    } catch (error) {
      addResult('Redis Cache', 'warn', 'Redis check failed (redis-cli might not be available)');
    }
  }

  return allPassed;
}

async function checkPerformance() {
  log('🔍 Checking performance...', 'blue');

  let allPassed = true;

  for (const query of config.testQueries) {
    try {
      const startTime = Date.now();

      const response = await fetch(`${config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          sessionId: `perf-test-${Date.now()}`
        }),
        timeout: config.timeout
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        if (duration < 2000) {
          addResult(`Performance Test`, 'pass', `Query responded in ${duration}ms (< 2s target)`, { query, duration });
        } else if (duration < 5000) {
          addResult(`Performance Test`, 'warn', `Query responded in ${duration}ms (slower than 2s target)`, { query, duration });
        } else {
          addResult(`Performance Test`, 'fail', `Query responded in ${duration}ms (too slow)`, { query, duration });
          allPassed = false;
        }
      } else {
        addResult(`Performance Test`, 'fail', `Query failed with status ${response.status}`, { query, duration });
        allPassed = false;
      }
    } catch (error) {
      addResult(`Performance Test`, 'fail', `Query failed: ${error.message}`, { query });
      allPassed = false;
    }
  }

  return allPassed;
}

async function checkCacheHealth() {
  log('🔍 Checking cache performance...', 'blue');

  try {
    const response = await fetch(`${config.baseUrl}/api/monitoring/cache-stats`, {
      timeout: config.timeout
    });

    if (response.ok) {
      const stats = await response.json();
      const hitRate = stats.hitRate || 0;

      if (hitRate > 0.7) {
        addResult('Cache Performance', 'pass', `Cache hit rate: ${(hitRate * 100).toFixed(1)}% (target: >70%)`, stats);
      } else if (hitRate > 0.5) {
        addResult('Cache Performance', 'warn', `Cache hit rate: ${(hitRate * 100).toFixed(1)}% (below target)`, stats);
      } else {
        addResult('Cache Performance', 'warn', `Cache hit rate: ${(hitRate * 100).toFixed(1)}% (low performance)`, stats);
      }
    } else {
      addResult('Cache Performance', 'warn', 'Cache stats endpoint not available');
    }
  } catch (error) {
    addResult('Cache Performance', 'warn', `Cache stats check failed: ${error.message}`);
  }
}

async function checkDemoFiles() {
  log('🔍 Checking demo files...', 'blue');

  const requiredFiles = [
    'docs/DEMO_EMERGENCY_PROCEDURES.md',
    'docs/QUICK_TROUBLESHOOTING_COMMANDS.md',
    'data/demo/demo-responses.json',
    'scripts/demo/preload-cache.js',
    'scripts/demo/fallback-server.js',
    'scripts/demo/emergency-rollback.sh'
  ];

  let allPresent = true;

  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      addResult(`Demo File: ${file}`, 'pass', `File exists (${stats.size} bytes)`);
    } else {
      addResult(`Demo File: ${file}`, 'fail', 'File missing');
      allPresent = false;
    }
  }

  return allPresent;
}

async function generateReport() {
  const reportPath = path.join(process.cwd(), 'test-results', 'demo-readiness-report.json');

  // Ensure directory exists
  const dir = path.dirname(reportPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.tests.length,
      passed: results.passed,
      failed: results.failed,
      warnings: results.warnings,
      overallStatus: results.failed === 0 ? 'READY' : 'NOT_READY'
    },
    environment: {
      baseUrl: config.baseUrl,
      nodeVersion: process.version,
      platform: process.platform
    },
    tests: results.tests
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`📄 Report saved to: ${reportPath}`, 'cyan');

  return report;
}

function printSummary(report) {
  console.log();
  log('📊 DEMO READINESS SUMMARY', 'magenta');
  console.log('═'.repeat(50));

  const statusColor = report.summary.overallStatus === 'READY' ? 'green' : 'red';
  const statusIcon = report.summary.overallStatus === 'READY' ? '✅' : '❌';

  log(`${statusIcon} Overall Status: ${report.summary.overallStatus}`, statusColor);
  log(`📋 Total Tests: ${report.summary.total}`, 'cyan');
  log(`✅ Passed: ${report.summary.passed}`, 'green');
  log(`❌ Failed: ${report.summary.failed}`, report.summary.failed > 0 ? 'red' : 'cyan');
  log(`⚠️ Warnings: ${report.summary.warnings}`, report.summary.warnings > 0 ? 'yellow' : 'cyan');

  if (report.summary.failed > 0) {
    console.log();
    log('CRITICAL ISSUES TO FIX:', 'red');
    report.tests
      .filter(test => test.status === 'fail')
      .forEach(test => {
        log(`  • ${test.name}: ${test.message}`, 'red');
      });
  }

  if (report.summary.warnings > 0) {
    console.log();
    log('WARNINGS TO REVIEW:', 'yellow');
    report.tests
      .filter(test => test.status === 'warn')
      .forEach(test => {
        log(`  • ${test.name}: ${test.message}`, 'yellow');
      });
  }

  console.log();
  log(report.summary.overallStatus === 'READY' ? '🎯 SYSTEM IS READY FOR DEMO!' : '🚨 SYSTEM NEEDS ATTENTION BEFORE DEMO', statusColor);
}

async function main() {
  log('🚀 Starting Demo Day Readiness Check', 'magenta');
  log(`Target: ${config.baseUrl}`, 'cyan');
  console.log();

  // Run all checks
  await checkEnvironmentVariables();
  await checkGitStatus();
  await checkDemoFiles();
  await checkApplicationHealth();
  await checkAPIEndpoints();
  await checkExternalServices();
  await checkPerformance();
  await checkCacheHealth();

  // Generate and display report
  const report = await generateReport();
  printSummary(report);

  // Exit with appropriate code
  process.exit(report.summary.failed > 0 ? 1 : 0);
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Rejection: ${reason}`, 'red');
  process.exit(1);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  log('\n🛑 Check interrupted by user', 'yellow');
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch(error => {
    log(`❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  checkEnvironmentVariables,
  checkApplicationHealth,
  checkAPIEndpoints,
  checkExternalServices,
  checkPerformance,
  generateReport
};