/**
 * Cache Optimization Recommendations
 * Utility functions for generating optimization recommendations
 */

/**
 * Calculate performance score
 */
export function calculatePerformanceScore(
  metrics: unknown,
  health: unknown,
  _usageStats: unknown
): { score: number; grade: string } {
  let score = 0;

  // Hit rate scoring (40% weight)
  const hitRate = (metrics as any)?.hitRate || 0;
  score += hitRate * 40;

  // Health scoring (30% weight)
  const isHealthy = (health as any)?.status === 'healthy';
  score += isHealthy ? 30 : 0;

  // Response time scoring (30% weight)
  const avgResponseTime = (metrics as any)?.avgResponseTime || 100;
  const responseScore = Math.max(0, 30 - (avgResponseTime / 10));
  score += responseScore;

  // Determine grade
  let grade: string;
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';

  return { score: Math.round(score), grade };
}

/**
 * Generate compression recommendations
 */
export function generateCompressionRecommendations(stats: unknown): string[] {
  const recommendations: string[] = [];

  if ((stats as any)?.compressionRatio < 0.3) {
    recommendations.push('Enable compression for better memory efficiency');
  }

  if ((stats as any)?.largeEntries > 10) {
    recommendations.push('Consider aggressive compression for large cache entries');
  }

  return recommendations;
}

/**
 * Generate immediate action recommendations
 */
export function generateImmediateRecommendations(
  health: unknown,
  _metrics: unknown
): string[] {
  const recommendations: string[] = [];

  if ((health as any)?.status !== 'healthy') {
    recommendations.push('URGENT: Cache service is unhealthy - check Redis connection');
  }

  if ((health as any)?.memoryPressure > 0.9) {
    recommendations.push('HIGH: Memory pressure detected - implement cleanup strategy');
  }

  return recommendations;
}

/**
 * Generate optimization recommendations
 */
export function generateOptimizationRecommendations(
  _metrics: unknown,
  usageStats: unknown
): string[] {
  const recommendations: string[] = [];

  if ((usageStats as any)?.frequentMisses > 100) {
    recommendations.push('Implement intelligent cache warming for frequently missed keys');
  }

  if ((usageStats as any)?.ttlExpired > 50) {
    recommendations.push('Optimize TTL settings based on usage patterns');
  }

  return recommendations;
}

/**
 * Generate performance recommendations
 */
export function generatePerformanceRecommendations(
  health: unknown,
  _metrics: unknown
): string[] {
  const recommendations: string[] = [];

  if ((health as any)?.latency > 50) {
    recommendations.push('Network latency is high - consider Redis optimization');
  }

  if ((health as any)?.connectionPool < 0.5) {
    recommendations.push('Increase Redis connection pool size for better performance');
  }

  return recommendations;
}