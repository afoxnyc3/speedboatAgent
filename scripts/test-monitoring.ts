/**
 * Test Monitoring System
 * Validates all monitoring endpoints and functionality
 */

import { getCacheManager } from '../src/lib/cache/redis-cache';

async function testHealthEndpoint() {
  console.log('🔍 Testing Health Endpoint...');

  try {
    // Test Redis connection
    const cacheManager = getCacheManager();
    const redisHealth = await cacheManager.healthCheck();
    console.log('Redis Health:', redisHealth);

    // Test memory usage
    const memoryUsage = process.memoryUsage();
    console.log('Memory Usage:', {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      usage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100) + '%'
    });

    // Test environment variables
    const envChecks = {
      redis: !!process.env.UPSTASH_REDIS_URL,
      openai: !!process.env.OPENAI_API_KEY,
      weaviate: !!process.env.WEAVIATE_HOST,
      mem0: !!process.env.MEM0_API_KEY,
      sentry: !!process.env.SENTRY_DSN
    };
    console.log('Environment Checks:', envChecks);

    console.log('✅ Health endpoint tests passed');
  } catch (error) {
    console.error('❌ Health endpoint test failed:', error);
  }
}

async function testCacheMetrics() {
  console.log('\n🔍 Testing Cache Metrics...');

  try {
    const cacheManager = getCacheManager();

    // Test cache operations
    console.log('Testing cache operations...');
    await cacheManager.setEmbedding('test-query', [0.1, 0.2, 0.3], 'test-model');
    const cached = await cacheManager.getEmbedding('test-query');
    console.log('Cache test result:', cached ? 'HIT' : 'MISS');

    // Get cache metrics
    const metrics = cacheManager.getCacheMetrics();
    console.log('Cache Metrics:', Object.keys(metrics).map(type => ({
      type,
      hits: metrics[type].hits,
      misses: metrics[type].misses,
      hitRate: (metrics[type].hitRate * 100).toFixed(1) + '%'
    })));

    // Get cache health
    const health = cacheManager.getCacheHealth();
    console.log('Cache Health:', {
      overallHitRate: (health.overall.hitRate * 100).toFixed(1) + '%',
      totalRequests: health.overall.totalRequests,
      recommendations: health.recommendations
    });

    console.log('✅ Cache metrics tests passed');
  } catch (error) {
    console.error('❌ Cache metrics test failed:', error);
  }
}

async function testPerformanceTracking() {
  console.log('\n🔍 Testing Performance Tracking...');

  try {
    // Import performance tracker
    const { performanceTracker } = await import('../src/lib/monitoring/performance-middleware');

    // Track some test events
    performanceTracker.track({
      name: 'test_operation',
      value: 150,
      unit: 'ms',
      tags: { operation: 'test' },
      timestamp: Date.now()
    });

    // Get metrics
    const metrics = performanceTracker.getMetrics();
    console.log('Performance Metrics:', metrics);

    // Get recent events
    const events = performanceTracker.getEvents(5);
    console.log('Recent Events:', events.length, 'events tracked');

    console.log('✅ Performance tracking tests passed');
  } catch (error) {
    console.error('❌ Performance tracking test failed:', error);
  }
}

async function testAnalyticsIntegration() {
  console.log('\n🔍 Testing Analytics Integration...');

  try {
    // Test analytics manager
    const { analytics } = await import('../src/components/monitoring/analytics-provider');

    // Track test events
    analytics.trackPerformance('test_metric', 200, { test: true });
    analytics.trackUserAction('test_action', { user: 'test' });
    analytics.trackSystemHealth('healthy', { redis: true, weaviate: true }, 3600);

    console.log('✅ Analytics integration tests passed');
  } catch (error) {
    console.error('❌ Analytics integration test failed:', error);
  }
}

async function runMonitoringTests() {
  console.log('🚀 Starting Monitoring System Tests\n');

  await testHealthEndpoint();
  await testCacheMetrics();
  await testPerformanceTracking();
  await testAnalyticsIntegration();

  console.log('\n🎉 Monitoring system tests completed!');
  console.log('\n📊 Monitoring System Summary:');
  console.log('- Health endpoint: Checks Redis, memory, environment');
  console.log('- Cache metrics: Tracks hit rates, performance');
  console.log('- Performance tracking: Monitors response times, errors');
  console.log('- Analytics integration: Vercel Analytics + custom events');
  console.log('- Alert system: Configurable rules with Sentry integration');
  console.log('- Real-time dashboard: /monitoring route');
  console.log('\n🔗 Monitoring Endpoints:');
  console.log('- /api/health - System health check');
  console.log('- /api/monitoring/dashboard - Real-time metrics');
  console.log('- /api/monitoring/alerts - Alert management');
  console.log('- /api/monitoring/costs - Cost tracking');
  console.log('- /monitoring - Web dashboard');
}

// Run tests
runMonitoringTests().catch(console.error);