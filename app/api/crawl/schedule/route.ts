/**
 * Crawl Scheduling API
 * Manages automated web crawl jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCrawlScheduler, CrawlJobDataSchema } from '../../../../src/lib/ingestion/crawl-scheduler';

// Request schemas
const ScheduleCrawlRequestSchema = z.object({
  action: z.enum(['schedule', 'immediate', 'cancel']),
  jobData: CrawlJobDataSchema.optional(),
  jobId: z.string().optional(),
}).strict();

const ListJobsRequestSchema = z.object({
  status: z.enum(['all', 'scheduled', 'completed', 'failed']).default('all'),
  limit: z.number().min(1).max(100).default(10),
}).strict();

/**
 * POST /api/crawl/schedule - Schedule or manage crawl jobs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, jobData, jobId } = ScheduleCrawlRequestSchema.parse(body);
    const scheduler = getCrawlScheduler();

    switch (action) {
      case 'schedule': {
        if (!jobData) {
          return NextResponse.json(
            { error: 'jobData required for schedule action' },
            { status: 400 }
          );
        }

        const scheduledJobId = await scheduler.scheduleWeeklyCrawl(jobData);

        return NextResponse.json({
          success: true,
          jobId: scheduledJobId,
          message: 'Weekly crawl scheduled successfully',
          nextRun: 'Every Sunday at 2:00 AM',
        });
      }

      case 'immediate': {
        if (!jobData) {
          return NextResponse.json(
            { error: 'jobData required for immediate action' },
            { status: 400 }
          );
        }

        const immediateJobId = await scheduler.scheduleImmediateCrawl(jobData);

        return NextResponse.json({
          success: true,
          jobId: immediateJobId,
          message: 'Immediate crawl job queued',
        });
      }

      case 'cancel': {
        if (!jobId) {
          return NextResponse.json(
            { error: 'jobId required for cancel action' },
            { status: 400 }
          );
        }

        const cancelled = await scheduler.cancelJob(jobId);

        if (!cancelled) {
          return NextResponse.json(
            { error: 'Job not found or already completed' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Job cancelled successfully',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Schedule API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/crawl/schedule - List scheduled jobs and their status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = ListJobsRequestSchema.parse({
      status: searchParams.get('status') || 'all',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10,
    });

    const scheduler = getCrawlScheduler();
    const scheduledJobs = await scheduler.listScheduledJobs();

    // Filter by status if specified
    let filteredJobs = scheduledJobs;
    if (query.status !== 'all') {
      filteredJobs = scheduledJobs.filter(job => job.status === query.status);
    }

    // Apply limit
    const limitedJobs = filteredJobs.slice(0, query.limit);

    return NextResponse.json({
      success: true,
      jobs: limitedJobs,
      total: filteredJobs.length,
      hasMore: filteredJobs.length > query.limit,
    });

  } catch (error) {
    console.error('Schedule list API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}