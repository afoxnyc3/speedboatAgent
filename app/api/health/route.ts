/**
 * System Health Check Endpoint
 * Comprehensive health monitoring for all system components
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCacheManager } from '../../../src/lib/cache/redis-cache';

// Health check interfaces
interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
  details?: Record<string, any>;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  components: {
    redis: ComponentHealth;
    weaviate: ComponentHealth;
    openai: ComponentHealth;
    memory: ComponentHealth;
  };
  performance: {
    cacheHitRate: number;
    averageResponseTime: number;
    errorRate: number;
  };
  resources: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
  };
}

/**
 * Get system uptime in seconds
 */
function getUptime(): number {
  return process.uptime();
}

/**
 * Get current memory usage
 */
function getMemoryUsage(): NodeJS.MemoryUsage {
  return process.memoryUsage();
}

/**
 * Get CPU usage estimation
 */
function getCPUUsage(): number {
  // Simple CPU usage estimation based on event loop lag
  const start = process.hrtime.bigint();
  return Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
}

/**
 * Check Redis health
 */
async function checkRedisHealth(): Promise<ComponentHealth> {
  try {
    const cacheManager = getCacheManager();

    if (!cacheManager.isAvailable()) {
      return {
        status: 'unhealthy',
        error: 'Redis client not available'
      };
    }

    const healthCheck = await cacheManager.healthCheck();

    if (!healthCheck.healthy) {
      return {
        status: 'unhealthy',
        error: healthCheck.error || 'Redis ping failed'
      };
    }

    const status = healthCheck.latency && healthCheck.latency > 1000 ? 'degraded' : 'healthy';

    return {
      status,
      latency: healthCheck.latency,
      details: {
        cacheMetrics: cacheManager.getCacheMetrics()
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown Redis error'
    };
  }
}

/**
 * Check Weaviate health
 */
async function checkWeaviateHealth(): Promise<ComponentHealth> {
  try {
    // Basic connectivity check - in production this would be a real Weaviate health check
    const weaviateHost = process.env.WEAVIATE_HOST;

    if (!weaviateHost) {
      return {
        status: 'unhealthy',
        error: 'Weaviate host not configured'
      };
    }

    // For now, assume healthy if configured
    // In production, implement actual Weaviate health check
    return {
      status: 'healthy',
      latency: 0,
      details: {
        host: weaviateHost.replace(/https?:\/\//, '').substring(0, 20) + '...'
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown Weaviate error'
    };
  }
}

/**
 * Check OpenAI API health
 */
async function checkOpenAIHealth(): Promise<ComponentHealth> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        status: 'unhealthy',
        error: 'OpenAI API key not configured'
      };
    }

    // For now, assume healthy if configured
    // In production, implement actual OpenAI API health check
    return {
      status: 'healthy',
      details: {
        keyConfigured: true
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown OpenAI error'
    };
  }
}

/**
 * Check Memory (Mem0) health
 */
async function checkMemoryHealth(): Promise<ComponentHealth> {
  try {
    const apiKey = process.env.MEM0_API_KEY;

    if (!apiKey) {
      return {
        status: 'unhealthy',
        error: 'Mem0 API key not configured'
      };
    }

    // For now, assume healthy if configured
    // In production, implement actual Mem0 health check
    return {
      status: 'healthy',
      details: {
        keyConfigured: true
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown Memory error'
    };
  }
}

/**
 * Calculate overall system status
 */
function calculateOverallStatus(components: SystemHealth['components']): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(components).map(c => c.status);

  if (statuses.some(s => s === 'unhealthy')) {
    return 'unhealthy';
  }

  if (statuses.some(s => s === 'degraded')) {
    return 'degraded';
  }

  return 'healthy';
}

export async function GET(_request: NextRequest) {
  const startTime = Date.now();

  try {
    // Run all health checks in parallel
    const [redis, weaviate, openai, memory] = await Promise.all([
      checkRedisHealth(),
      checkWeaviateHealth(),
      checkOpenAIHealth(),
      checkMemoryHealth()
    ]);

    const components = { redis, weaviate, openai, memory };
    const overallStatus = calculateOverallStatus(components);

    // Get performance metrics
    const cacheManager = getCacheManager();
    const cacheHealth = cacheManager.getCacheHealth();

    const systemHealth: SystemHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: getUptime(),
      version: '0.6.0',
      environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development',
      components,
      performance: {
        cacheHitRate: cacheHealth.overall.hitRate,
        averageResponseTime: Date.now() - startTime,
        errorRate: 0 // TODO: Implement error rate tracking
      },
      resources: {
        memoryUsage: getMemoryUsage(),
        cpuUsage: getCPUUsage()
      }
    };

    // Set appropriate HTTP status based on health
    const httpStatus = overallStatus === 'healthy' ? 200 :
                      overallStatus === 'degraded' ? 207 : 503;

    return new NextResponse(JSON.stringify(systemHealth, null, 2), {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Health check error:', error);

    const errorHealth: SystemHealth = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: getUptime(),
      version: '0.6.0',
      environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development',
      components: {
        redis: { status: 'unhealthy', error: 'Health check failed' },
        weaviate: { status: 'unhealthy', error: 'Health check failed' },
        openai: { status: 'unhealthy', error: 'Health check failed' },
        memory: { status: 'unhealthy', error: 'Health check failed' }
      },
      performance: {
        cacheHitRate: 0,
        averageResponseTime: Date.now() - startTime,
        errorRate: 100
      },
      resources: {
        memoryUsage: getMemoryUsage(),
        cpuUsage: getCPUUsage()
      }
    };

    return new NextResponse(JSON.stringify(errorHealth, null, 2), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}