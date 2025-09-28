/**
 * Crawl Job Status API
 * Get detailed status and results for specific crawl jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCrawlScheduler } from '../../../../../src/lib/ingestion/crawl-scheduler';

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

/**
 * GET /api/crawl/status/[jobId] - Get job status and results
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const scheduler = getCrawlScheduler();
    const jobStatus = await scheduler.getJobStatus(jobId);

    return NextResponse.json({
      success: true,
      jobId,
      ...jobStatus,
    });

  } catch (error) {
    console.error(`Job status API error for ${(await params).jobId}:`, error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}