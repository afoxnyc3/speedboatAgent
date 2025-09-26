/**
 * Crawl Monitoring API
 * Health checks and monitoring for automated crawl system
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCrawlScheduler } from '@/lib/ingestion/crawl-scheduler';
import { getWebCrawler } from '@/lib/ingestion/web-crawler';

// Monitoring query schema
const MonitoringQuerySchema = z.object({
  component: z.enum(['all', 'scheduler', 'crawler', 'queue']).default('all'),
  includeMetrics: z.boolean().default(true),
}).strict();

/**
 * GET /api/crawl/monitor - System health and monitoring
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = MonitoringQuerySchema.parse({
      component: searchParams.get('component') as any || 'all',
      includeMetrics: searchParams.get('includeMetrics') === 'true',
    });

    const results: Record<string, any> = {};

    // Check scheduler health
    if (query.component === 'all' || query.component === 'scheduler') {
      const scheduler = getCrawlScheduler();
      const schedulerHealthy = await scheduler.healthCheck();

      results.scheduler = {
        status: schedulerHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      };

      if (query.includeMetrics) {
        try {
          const scheduledJobs = await scheduler.listScheduledJobs();
          results.scheduler.metrics = {
            scheduledJobs: scheduledJobs.length,
            activeJobs: scheduledJobs.filter(job => job.status === 'active').length,
            waitingJobs: scheduledJobs.filter(job => job.status === 'waiting').length,
          };
        } catch (error) {
          results.scheduler.metrics = { error: 'Failed to fetch metrics' };
        }
      }
    }

    // Check crawler health
    if (query.component === 'all' || query.component === 'crawler') {
      const crawler = getWebCrawler();
      const crawlerHealthy = await crawler.healthCheck();

      results.crawler = {
        status: crawlerHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      };

      if (query.includeMetrics) {
        results.crawler.metrics = {
          firecrawlConnected: crawlerHealthy,
          lastHealthCheck: new Date().toISOString(),
        };
      }
    }

    // Overall system status
    const systemHealthy = Object.values(results).every(
      (component: any) => component.status === 'healthy'
    );

    return NextResponse.json({
      success: true,
      systemStatus: systemHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      components: results,
    });

  } catch (error) {
    console.error('Crawl monitoring API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        systemStatus: 'error',
        error: 'Monitoring system error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}