import { NextResponse } from 'next/server';

interface ServiceCheck {
  healthy: boolean;
  responseTime?: number;
  error?: string;
  configured: boolean;
}

// Check OpenAI service
async function checkOpenAI(): Promise<ServiceCheck> {
  const check: ServiceCheck = { healthy: false, configured: false };

  if (!process.env.OPENAI_API_KEY) {
    return check;
  }

  check.configured = true;
  const startTime = Date.now();

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });

    check.responseTime = Date.now() - startTime;

    if (response.status === 429) {
      check.error = 'Rate limited / quota exceeded';
    } else if (response.status === 401) {
      check.error = 'Invalid API key';
    } else if (response.ok) {
      check.healthy = true;
    } else {
      check.error = `HTTP ${response.status}`;
    }
  } catch (error) {
    check.error = error instanceof Error ? error.message : 'Connection failed';
    check.responseTime = Date.now() - startTime;
  }

  return check;
}

// Check Weaviate service
async function checkWeaviate(): Promise<ServiceCheck> {
  const check: ServiceCheck = { healthy: false, configured: false };

  if (!process.env.WEAVIATE_HOST || !process.env.WEAVIATE_API_KEY) {
    return check;
  }

  check.configured = true;
  const startTime = Date.now();

  try {
    const response = await fetch(`${process.env.WEAVIATE_HOST}/v1/.well-known/ready`, {
      headers: { Authorization: `Bearer ${process.env.WEAVIATE_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });

    check.responseTime = Date.now() - startTime;
    check.healthy = response?.ok || false;

    if (!check.healthy) {
      check.error = `HTTP ${response?.status || 'timeout'}`;
    }
  } catch (error) {
    check.healthy = false;
    check.error = error instanceof Error ? error.message : 'Connection failed';
    check.responseTime = Date.now() - startTime;
  }

  return check;
}

// Check Redis service
async function checkRedis(): Promise<ServiceCheck> {
  const check: ServiceCheck = { healthy: false, configured: false };

  if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
    return check;
  }

  check.configured = true;
  const startTime = Date.now();

  try {
    const response = await fetch(process.env.UPSTASH_REDIS_URL + '/ping', {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_TOKEN}` },
      signal: AbortSignal.timeout(5000),
    });

    check.responseTime = Date.now() - startTime;
    check.healthy = response?.ok || false;

    if (!check.healthy) {
      check.error = `HTTP ${response?.status || 'timeout'}`;
    }
  } catch (error) {
    check.healthy = false;
    check.error = error instanceof Error ? error.message : 'Connection failed';
    check.responseTime = Date.now() - startTime;
  }

  return check;
}

// Generate recommendations based on checks
function generateRecommendations(checks: Record<string, ServiceCheck>): string[] {
  const recommendations: string[] = [];

  if (!checks.openai.configured) {
    recommendations.push('OpenAI API key not configured - demo mode only');
  } else if (!checks.openai.healthy) {
    if (checks.openai.error?.includes('quota')) {
      recommendations.push('OpenAI quota exceeded - demo mode recommended');
    } else if (checks.openai.error?.includes('Invalid')) {
      recommendations.push('OpenAI authentication failed - check API key');
    } else {
      recommendations.push('OpenAI service issues detected');
    }
  }

  if (!checks.weaviate.configured) {
    recommendations.push('Weaviate not configured - search functionality unavailable');
  } else if (!checks.weaviate.healthy) {
    recommendations.push('Weaviate search unavailable - using fallback responses');
  }

  if (!checks.mem0.configured) {
    recommendations.push('Mem0 not configured - conversation memory disabled');
  }

  if (!checks.redis.configured) {
    recommendations.push('Redis not configured - caching disabled');
  } else if (!checks.redis.healthy) {
    recommendations.push('Redis cache unavailable - performance may be slower');
  }

  if (recommendations.length === 0) {
    recommendations.push('All services healthy - optimal performance expected');
  }

  return recommendations;
}

// Simplified health check endpoint
export async function GET() {
  try {
    // Run checks in parallel
    const [openai, weaviate, redis] = await Promise.all([
      checkOpenAI(),
      checkWeaviate(),
      checkRedis(),
    ]);

    // Mem0 check (no endpoint to test)
    const mem0: ServiceCheck = {
      healthy: !!process.env.MEM0_API_KEY,
      configured: !!process.env.MEM0_API_KEY,
    };

    // API check (always healthy)
    const api: ServiceCheck = {
      healthy: true,
      configured: true,
    };

    const checks = { api, openai, weaviate, mem0, redis };

    // Calculate status
    const criticalServices = [openai, weaviate];
    const allServices = Object.values(checks);

    const criticalFailures = criticalServices.filter(s => s.configured && !s.healthy).length;
    const totalFailures = allServices.filter(s => s.configured && !s.healthy).length;

    const fallbackMode = criticalFailures > 0 || (!openai.configured || !weaviate.configured);

    let status: 'healthy' | 'degraded' | 'down';
    if (criticalFailures >= 2) {
      status = 'down';
    } else if (criticalFailures > 0 || totalFailures >= 2) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    const recommendations = generateRecommendations(checks);

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      fallbackMode,
      checks,
      recommendations,
      environment: process.env.NODE_ENV || 'development',
    }, {
      status: status === 'down' ? 503 : status === 'degraded' ? 206 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': status,
        'X-Fallback-Mode': fallbackMode.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: 'down',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      fallbackMode: true,
      checks: {},
      recommendations: ['Health check system failure - all services assumed down'],
      error: error instanceof Error ? error.message : 'Unknown error',
    }, {
      status: 503,
      headers: {
        'X-Health-Status': 'down',
        'X-Fallback-Mode': 'true',
      },
    });
  }
}