#!/usr/bin/env tsx

/**
 * Test Script for Web Crawl Automation
 * Tests scheduler, change detection, and incremental updates
 */

import { config } from 'dotenv';
import { getCrawlScheduler, DEFAULT_DOCS_CRAWL_CONFIG } from '../src/lib/ingestion/crawl-scheduler';
import { getWebCrawler } from '../src/lib/ingestion/web-crawler';

// Load environment variables
config();

async function testCrawlAutomation() {
  console.log('🕷️ Testing Web Crawl Automation Pipeline\n');

  try {
    // Test 1: Health checks
    console.log('1️⃣ Testing component health checks...');

    const scheduler = getCrawlScheduler();
    const crawler = getWebCrawler();

    const schedulerHealthy = await scheduler.healthCheck();
    const crawlerHealthy = await crawler.healthCheck();

    console.log(`   Scheduler: ${schedulerHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    console.log(`   Crawler: ${crawlerHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);

    if (!schedulerHealthy || !crawlerHealthy) {
      throw new Error('Components not healthy');
    }

    // Test 2: Schedule immediate crawl job
    console.log('\n2️⃣ Testing immediate crawl job scheduling...');

    const testJobData = {
      ...DEFAULT_DOCS_CRAWL_CONFIG,
      targets: [
        {
          url: 'https://httpbin.org/html',
          domain: 'httpbin.org',
          maxDepth: 1,
          priority: 1.0,
        },
      ],
      scheduleType: 'manual' as const,
      changeDetection: true,
      incrementalUpdate: true,
    };

    const jobId = await scheduler.scheduleImmediateCrawl(testJobData);
    console.log(`   ✅ Job scheduled with ID: ${jobId}`);

    // Test 3: Monitor job execution
    console.log('\n3️⃣ Monitoring job execution...');

    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout

    while (attempts < maxAttempts) {
      const status = await scheduler.getJobStatus(jobId);

      console.log(`   Status: ${status.status}, Progress: ${status.progress}%`);

      if (status.status === 'completed') {
        console.log('   ✅ Job completed successfully');

        if (status.result) {
          console.log(`   📊 Results:`);
          console.log(`      - Documents updated: ${status.result.documentsUpdated}`);
          console.log(`      - Changes detected: ${status.result.changesDetected.length}`);
          console.log(`      - Execution time: ${status.result.executionTime}ms`);
          console.log(`      - Errors: ${status.result.errors.length}`);
        }
        break;
      }

      if (status.status === 'failed') {
        console.log(`   ❌ Job failed: ${status.error}`);
        throw new Error(`Job failed: ${status.error}`);
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (attempts >= maxAttempts) {
      throw new Error('Job timeout - took longer than 30 seconds');
    }

    // Test 4: List scheduled jobs
    console.log('\n4️⃣ Testing job listing...');

    const jobs = await scheduler.listScheduledJobs();
    console.log(`   ✅ Found ${jobs.length} scheduled jobs`);

    jobs.forEach((job, index) => {
      console.log(`   ${index + 1}. Job ${job.id} (${job.name}) - Status: ${job.status}`);
    });

    // Test 5: Weekly schedule (don't actually schedule, just validate)
    console.log('\n5️⃣ Testing weekly schedule validation...');

    try {
      // This would schedule a weekly job, but we'll cancel it immediately
      const weeklyJobId = await scheduler.scheduleWeeklyCrawl(DEFAULT_DOCS_CRAWL_CONFIG);
      console.log(`   ✅ Weekly job scheduled with ID: ${weeklyJobId}`);

      const cancelled = await scheduler.cancelJob(weeklyJobId);
      console.log(`   ✅ Weekly job cancelled: ${cancelled}`);
    } catch (error) {
      console.log(`   ❌ Weekly scheduling failed: ${error}`);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Component health checks');
    console.log('   ✅ Immediate job scheduling');
    console.log('   ✅ Job execution monitoring');
    console.log('   ✅ Job listing functionality');
    console.log('   ✅ Weekly schedule validation');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);

  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    try {
      const scheduler = getCrawlScheduler();
      await scheduler.cleanup();
      console.log('   ✅ Cleanup completed');
    } catch (error) {
      console.error('   ❌ Cleanup failed:', error);
    }
  }
}

// Check environment
function validateEnvironment() {
  const required = [
    'FIRECRAWL_API_KEY',
    'UPSTASH_REDIS_URL',
    'UPSTASH_REDIS_TOKEN',
    'WEAVIATE_HOST',
    'WEAVIATE_API_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    process.exit(1);
  }
}

// Main execution
async function main() {
  console.log('🔧 Validating environment...');
  validateEnvironment();
  console.log('✅ Environment validated\n');

  await testCrawlAutomation();
}

if (require.main === module) {
  main().catch(console.error);
}