/**
 * Query Classification Integration Example
 * Demonstrates how to use the classification system in a RAG pipeline
 */

import {
  classifyQuery,
  classifyQueryWithMetrics,
  validateClassification
} from '../src/lib/search/query-classifier';
import { QueryClassification } from '../src/types/query-classification';

/**
 * Example: RAG Search with Query Classification
 */
async function ragSearchWithClassification(userQuery: string) {
  console.log(`🔍 Processing query: "${userQuery}"`);

  try {
    // Step 1: Classify the query
    const { classification, metrics } = await classifyQueryWithMetrics(userQuery, {
      timeout: 5000,
      fallbackWeights: true
    });

    console.log(`✅ Classification: ${classification.type} (confidence: ${classification.confidence.toFixed(2)})`);
    console.log(`⏱️  Response time: ${metrics.responseTime}ms (cache: ${metrics.cacheHit})`);

    // Step 2: Validate classification
    if (!validateClassification(classification)) {
      throw new Error('Invalid classification result');
    }

    // Step 3: Apply search strategy based on classification
    const searchStrategy = getSearchStrategy(classification);
    console.log(`🎯 Search strategy: ${searchStrategy.name}`);

    // Step 4: Execute hybrid search (simulated)
    const searchResults = await simulateHybridSearch(userQuery, classification);
    console.log(`📊 Found ${searchResults.length} results`);

    return {
      classification,
      metrics,
      searchStrategy,
      results: searchResults
    };

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
    throw error;
  }
}

/**
 * Get search strategy based on query classification
 */
function getSearchStrategy(classification: QueryClassification) {
  const strategies = {
    technical: {
      name: 'Technical-focused search',
      description: 'Prioritize GitHub repositories and code documentation',
      sources: ['github:1.5x', 'web:0.5x'],
      reranking: 'code-relevance',
      filters: ['file-type:code', 'file-type:documentation']
    },
    business: {
      name: 'Business-focused search',
      description: 'Prioritize business documentation and user guides',
      sources: ['github:0.5x', 'web:1.5x'],
      reranking: 'business-relevance',
      filters: ['file-type:documentation', 'file-type:guides']
    },
    operational: {
      name: 'Operational search',
      description: 'Balanced search across all sources',
      sources: ['github:1.0x', 'web:1.0x'],
      reranking: 'general-relevance',
      filters: ['file-type:configuration', 'file-type:deployment']
    }
  };

  return strategies[classification.type];
}

/**
 * Simulate hybrid search with classification-based weighting
 */
async function simulateHybridSearch(
  query: string,
  classification: QueryClassification
): Promise<Array<{ source: string; title: string; score: number; url: string }>> {
  // Simulated search results with different sources
  const mockResults = [
    {
      source: 'github',
      title: 'Authentication implementation guide',
      score: 0.95,
      url: 'https://github.com/org/repo/blob/main/auth.md'
    },
    {
      source: 'web',
      title: 'Product authentication features',
      score: 0.87,
      url: 'https://docs.company.com/auth-features'
    },
    {
      source: 'github',
      title: 'Auth service configuration',
      score: 0.82,
      url: 'https://github.com/org/repo/blob/main/config/auth.yml'
    },
    {
      source: 'web',
      title: 'User authentication guide',
      score: 0.79,
      url: 'https://help.company.com/authentication'
    }
  ];

  // Apply classification-based weighting
  const weightedResults = mockResults.map(result => ({
    ...result,
    weightedScore: result.score * (
      result.source === 'github'
        ? classification.weights.github
        : classification.weights.web
    )
  }));

  // Sort by weighted score
  weightedResults.sort((a, b) => b.weightedScore - a.weightedScore);

  return weightedResults.map(r => ({
    source: r.source,
    title: r.title,
    score: r.weightedScore,
    url: r.url
  }));
}

/**
 * Example: Batch processing with classification
 */
async function batchProcessingExample(queries: string[]) {
  console.log(`\n📦 Batch processing ${queries.length} queries...\n`);

  const results = [];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`Processing ${i + 1}/${queries.length}: "${query}"`);

    try {
      const result = await ragSearchWithClassification(query);
      results.push({ query, success: true, ...result });
    } catch (error) {
      results.push({
        query,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    console.log('---\n');
  }

  // Summary statistics
  const successful = results.filter(r => r.success);
  const avgResponseTime = successful.reduce((sum, r) => sum + (r.metrics?.responseTime || 0), 0) / successful.length;
  const cacheHitRate = successful.filter(r => r.metrics?.cacheHit).length / successful.length;

  console.log(`📈 Batch Summary:`);
  console.log(`   Success rate: ${successful.length}/${results.length} (${(successful.length / results.length * 100).toFixed(1)}%)`);
  console.log(`   Avg response time: ${avgResponseTime.toFixed(1)}ms`);
  console.log(`   Cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`);

  return results;
}

/**
 * Example: Real-time classification monitoring
 */
async function monitoringExample(query: string) {
  console.log(`\n📊 Monitoring example for: "${query}"\n`);

  const iterations = 5;
  const metrics = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();

    try {
      const { classification, metrics: classificationMetrics } = await classifyQueryWithMetrics(query);
      const end = Date.now();

      const iterationMetrics = {
        iteration: i + 1,
        type: classification.type,
        confidence: classification.confidence,
        responseTime: classificationMetrics.responseTime,
        totalTime: end - start,
        cacheHit: classificationMetrics.cacheHit,
        source: classificationMetrics.source
      };

      metrics.push(iterationMetrics);
      console.log(`Iteration ${i + 1}: ${iterationMetrics.type} (${iterationMetrics.confidence.toFixed(2)}) - ${iterationMetrics.responseTime}ms (${iterationMetrics.source})`);

    } catch (error) {
      console.error(`Iteration ${i + 1} failed: ${error}`);
    }
  }

  // Analysis
  const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
  const cacheHits = metrics.filter(m => m.cacheHit).length;
  const consistentClassification = new Set(metrics.map(m => m.type)).size === 1;

  console.log(`\n📊 Performance Analysis:`);
  console.log(`   Average response time: ${avgResponseTime.toFixed(1)}ms`);
  console.log(`   Cache hits: ${cacheHits}/${iterations} (${(cacheHits / iterations * 100).toFixed(1)}%)`);
  console.log(`   Classification consistency: ${consistentClassification ? '✅ Consistent' : '⚠️ Inconsistent'}`);

  return metrics;
}

/**
 * Main demonstration function
 */
async function runExamples() {
  console.log('🤖 Query Classification Integration Examples\n');

  try {
    // Example 1: Single query classification and search
    console.log('=== Example 1: Single Query Processing ===');
    await ragSearchWithClassification('How do I implement user authentication in React?');
    console.log('\n');

    // Example 2: Different query types
    console.log('=== Example 2: Different Query Types ===');
    const testQueries = [
      'How to implement React hooks?', // Technical
      'What are the main product features?', // Business
      'How to deploy to production?' // Operational
    ];

    await batchProcessingExample(testQueries);

    // Example 3: Performance monitoring
    console.log('=== Example 3: Performance Monitoring ===');
    await monitoringExample('How do I configure the database?');

    console.log('\n✅ All examples completed successfully!');

  } catch (error) {
    console.error('❌ Example execution failed:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export {
  ragSearchWithClassification,
  getSearchStrategy,
  simulateHybridSearch,
  batchProcessingExample,
  monitoringExample
};