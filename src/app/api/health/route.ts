import { NextResponse } from 'next/server';

export async function GET() {
  const checks: Record<string, boolean> = {
    api: true,
    database: false,
    cache: false,
  };

  try {
    if (process.env.WEAVIATE_HOST && process.env.WEAVIATE_API_KEY) {
      const weaviateResponse = await fetch(`${process.env.WEAVIATE_HOST}/v1/.well-known/ready`, {
        headers: {
          Authorization: `Bearer ${process.env.WEAVIATE_API_KEY}`,
        },
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);
      checks.database = weaviateResponse?.ok || false;
    }

    if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
      const redisResponse = await fetch(process.env.UPSTASH_REDIS_URL + '/ping', {
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_TOKEN}`,
        },
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);
      checks.cache = redisResponse?.ok || false;
    }

    const allHealthy = Object.values(checks).every(status => status);

    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      environment: process.env.NODE_ENV || 'development',
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, {
      status: 503,
    });
  }
}