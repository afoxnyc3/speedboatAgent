#!/usr/bin/env tsx

/**
 * Cache Warming Deployment Script
 * Automatically warms cache after deployment with common queries
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface WarmingResult {
  success: boolean;
  results?: {
    embeddings: { warmed: number; failed: number; cached: number };
    searches: { success: number; failed: number; alreadyCached: number };
    totalTime: number;
    queriesProcessed: number;
  };
  message?: string;
  error?: any;
}

/**
 * Production-ready cache warming queries optimized for this RAG system
 */
const PRODUCTION_QUERIES = [
  // Core application queries
  'rate limiting configuration',
  'authentication setup',
  'search API usage',
  'chat interface',
  'weaviate integration',

  // Performance queries
  'redis cache optimization',
  'response streaming',
  'performance monitoring',
  'memory usage',
  'typescript errors',

  // Development queries
  'next.js configuration',
  'middleware setup',
  'error handling',
  'testing procedures',
  'deployment process',

  // Infrastructure queries
  'environment variables',
  'vercel deployment',
  'monitoring setup',
  'security implementation',
  'database connection'
];

async function warmCache(baseUrl: string): Promise<WarmingResult> {
  const warmingUrl = `${baseUrl}/api/cache/warm`;

  const payload = {
    queries: PRODUCTION_QUERIES.map(text => ({
      text,
      priority: 8,
      context: 'deployment-warming'
    })),
    warmingType: 'both' as const,
    concurrent: 5
  };

  try {
    console.log(`🔥 Warming cache with ${PRODUCTION_QUERIES.length} queries...`);
    console.log(`📍 Target: ${warmingUrl}`);

    const response = await fetch(warmingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result as WarmingResult;

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Cache warming failed'
    };
  }
}

async function checkCacheStatus(baseUrl: string): Promise<any> {
  try {
    const response = await fetch(`${baseUrl}/api/cache/warm`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('Could not check cache status:', error);
    return null;
  }
}

async function main() {
  const baseUrl = process.argv[2] || (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000');

  console.log('🚀 Cache Warming Deployment Script');
  console.log(`📍 Target URL: ${baseUrl}`);
  console.log(`🕐 Started: ${new Date().toISOString()}`);
  console.log('');

  // Check current cache status
  console.log('📊 Checking current cache status...');
  const cacheStatus = await checkCacheStatus(baseUrl);
  if (cacheStatus) {
    console.log(`   Current hit rate: ${(cacheStatus.currentStats?.overallHitRate * 100 || 0).toFixed(1)}%`);
    console.log(`   Total requests: ${cacheStatus.currentStats?.totalRequests || 0}`);
  }
  console.log('');

  // Execute cache warming
  const result = await warmCache(baseUrl);

  if (result.success && result.results) {
    console.log('✅ Cache warming completed successfully!');
    console.log('');
    console.log('📈 Results:');
    console.log(`   Embeddings: ${result.results.embeddings.warmed} warmed, ${result.results.embeddings.cached} cached`);
    console.log(`   Searches: ${result.results.searches.success} successful, ${result.results.searches.alreadyCached} cached`);
    console.log(`   Total time: ${result.results.totalTime}ms`);
    console.log(`   Queries processed: ${result.results.queriesProcessed}`);
    console.log('');

    // Performance improvement estimate
    const totalWarmed = result.results.embeddings.warmed + result.results.searches.success;
    const estimatedImprovement = (totalWarmed / PRODUCTION_QUERIES.length) * 100;
    console.log(`🎯 Estimated performance improvement: ${estimatedImprovement.toFixed(1)}% for warmed queries`);

  } else {
    console.error('❌ Cache warming failed:');
    console.error('   Message:', result.message);
    console.error('   Error:', result.error);
    process.exit(1);
  }

  console.log('');
  console.log(`✨ Cache warming completed at ${new Date().toISOString()}`);
  console.log('🚀 Application ready for optimized performance!');
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('Cache warming script failed:', error);
    process.exit(1);
  });
}

export { warmCache, checkCacheStatus };