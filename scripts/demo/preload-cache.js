#!/usr/bin/env node

/**
 * Demo Cache Preloader
 *
 * This script preloads the cache with common demo queries to ensure
 * fast response times during the demonstration.
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  baseUrl: process.env.DEMO_BASE_URL || 'https://your-domain.vercel.app',
  timeout: 30000, // 30 seconds
  retries: 3,
  queries: [
    'What is the project architecture?',
    'How do I set up the development environment?',
    'Explain the hybrid search implementation',
    'What are the performance metrics and optimizations?',
    'How is the application deployed and monitored?',
    'How does the RAG pipeline work?',
    'What technologies are used in this project?',
    'How do I contribute to this project?'
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
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(url, options, retries = config.retries) {
  try {
    const response = await fetch(url, {
      ...options,
      timeout: config.timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    if (retries > 0) {
      log(`Retrying... (${retries} attempts left)`, 'yellow');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return makeRequest(url, options, retries - 1);
    }
    throw error;
  }
}

async function preloadQuery(query, index) {
  const sessionId = `demo-warmup-${Date.now()}-${index}`;

  try {
    log(`[${index + 1}/${config.queries.length}] Preloading: "${query}"`, 'blue');

    const startTime = Date.now();

    const response = await makeRequest(`${config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        sessionId: sessionId
      })
    });

    const result = await response.json();
    const duration = Date.now() - startTime;

    log(`✅ Cached in ${duration}ms - Response: ${result.response?.substring(0, 100)}...`, 'green');

    return {
      query,
      success: true,
      duration,
      sessionId,
      cached: true
    };
  } catch (error) {
    log(`❌ Failed to preload "${query}": ${error.message}`, 'red');

    return {
      query,
      success: false,
      error: error.message,
      sessionId
    };
  }
}

async function healthCheck() {
  try {
    log('🔍 Performing health check...', 'cyan');

    const response = await makeRequest(`${config.baseUrl}/api/health`);
    const health = await response.json();

    if (health.status === 'healthy') {
      log('✅ System is healthy', 'green');
      return true;
    } else {
      log(`⚠️ System health: ${health.status}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Health check failed: ${error.message}`, 'red');
    return false;
  }
}

async function checkCacheStats() {
  try {
    const response = await makeRequest(`${config.baseUrl}/api/monitoring/cache-stats`);
    const stats = await response.json();

    log(`📊 Cache Stats:`, 'cyan');
    log(`   Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`, 'cyan');
    log(`   Total Hits: ${stats.hits}`, 'cyan');
    log(`   Total Misses: ${stats.misses}`, 'cyan');

    return stats;
  } catch (error) {
    log(`⚠️ Could not fetch cache stats: ${error.message}`, 'yellow');
    return null;
  }
}

async function clearDemoSessions() {
  try {
    log('🧹 Clearing previous demo sessions...', 'cyan');

    const response = await makeRequest(`${config.baseUrl}/api/sessions/clear-demo`, {
      method: 'DELETE'
    });

    if (response.ok) {
      log('✅ Demo sessions cleared', 'green');
    }
  } catch (error) {
    log(`⚠️ Could not clear demo sessions: ${error.message}`, 'yellow');
  }
}

async function saveResults(results) {
  const reportPath = path.join(__dirname, '../../test-results/demo-preload-report.json');

  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: config.baseUrl,
    totalQueries: config.queries.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    averageDuration: results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.success).length,
    results: results
  };

  try {
    // Ensure directory exists
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`📄 Report saved to: ${reportPath}`, 'cyan');
  } catch (error) {
    log(`⚠️ Could not save report: ${error.message}`, 'yellow');
  }

  return report;
}

async function main() {
  log('🚀 Starting Demo Cache Preloader', 'magenta');
  log(`Target: ${config.baseUrl}`, 'cyan');
  log(`Queries to preload: ${config.queries.length}`, 'cyan');
  console.log();

  // Health check
  const isHealthy = await healthCheck();
  if (!isHealthy) {
    log('❌ System is not healthy. Aborting cache preload.', 'red');
    process.exit(1);
  }

  console.log();

  // Clear previous demo sessions
  await clearDemoSessions();

  console.log();

  // Get initial cache stats
  const initialStats = await checkCacheStats();

  console.log();

  // Preload queries
  log('🔄 Preloading demo queries...', 'magenta');
  const results = [];

  for (let i = 0; i < config.queries.length; i++) {
    const result = await preloadQuery(config.queries[i], i);
    results.push(result);

    // Small delay between requests
    if (i < config.queries.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log();

  // Get final cache stats
  const finalStats = await checkCacheStats();

  console.log();

  // Generate report
  const report = await saveResults(results);

  // Summary
  log('📊 Preload Summary:', 'magenta');
  log(`   Total Queries: ${report.totalQueries}`, 'cyan');
  log(`   Successful: ${report.successful}`, 'green');
  log(`   Failed: ${report.failed}`, report.failed > 0 ? 'red' : 'cyan');
  log(`   Average Duration: ${report.averageDuration?.toFixed(0)}ms`, 'cyan');

  if (initialStats && finalStats) {
    const hitRateChange = finalStats.hitRate - initialStats.hitRate;
    log(`   Cache Hit Rate Change: ${hitRateChange > 0 ? '+' : ''}${(hitRateChange * 100).toFixed(1)}%`,
        hitRateChange > 0 ? 'green' : 'cyan');
  }

  console.log();

  if (report.failed > 0) {
    log('⚠️ Some queries failed to preload. Check the report for details.', 'yellow');
    process.exit(1);
  } else {
    log('✅ All demo queries successfully preloaded!', 'green');
    log('🎯 System is ready for demo day!', 'green');
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`, 'red');
  process.exit(1);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  log('\n🛑 Preload interrupted by user', 'yellow');
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch(error => {
    log(`❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { preloadQuery, healthCheck, checkCacheStats };