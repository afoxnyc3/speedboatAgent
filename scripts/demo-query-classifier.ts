/**
 * Demo script for Query Classification System
 */

import { config } from 'dotenv';
config();

// import { classifyQuery, classifyQueryWithMetrics } from '../src/lib/search/query-classifier';

// Sample queries to demonstrate classification
const sampleQueries = [
  // Technical queries
  'How do I implement React hooks in TypeScript?',
  'What is the correct API endpoint for authentication?',
  'How to fix this database connection error?',

  // Business queries
  'What are the main features of the speedboat booking system?',
  'How do customers make reservations?',
  'What pricing options are available?',

  // Operational queries
  'How do I deploy the application to production?',
  'What is the CI/CD process?',
  'How to configure environment variables?'
];

async function demonstrateClassification() {
  console.log('Demo temporarily disabled - waiting for query-classifier implementation');
  return;
  /*
  console.log('🤖 Query Classification System Demo\n');
  console.log('Testing with sample queries...\n');

  for (let i = 0; i < sampleQueries.length; i++) {
    const query = sampleQueries[i];

    try {
      console.log(`Query ${i + 1}: "${query}"`);

      const { classification, metrics } = await classifyQueryWithMetrics(query, {
        timeout: 5000,
        fallbackWeights: true
      });

      console.log(`✅ Type: ${classification.type}`);
      console.log(`📊 Confidence: ${classification.confidence.toFixed(2)}`);
      console.log(`⚖️  Weights: GitHub=${classification.weights.github}x, Web=${classification.weights.web}x`);
      console.log(`⏱️  Response time: ${metrics.responseTime}ms`);
      console.log(`💾 Cache hit: ${metrics.cacheHit}`);
      if (classification.reasoning) {
        console.log(`🧠 Reasoning: ${classification.reasoning}`);
      }
      console.log('---\n');

      // Short delay to show cache performance on repeated queries
      if (i === 2) {
        console.log('Testing cache performance with repeated query...\n');
        const startTime = Date.now();
        const { metrics: cachedMetrics } = await classifyQueryWithMetrics(sampleQueries[0]);
        console.log(`🚀 Cached query response time: ${cachedMetrics.responseTime}ms`);
        console.log(`💾 Cache hit: ${cachedMetrics.cacheHit}`);
        console.log('---\n');
      }

    } catch (error) {
      console.error(`❌ Error classifying query: ${error}`);
      console.log('---\n');
    }
  }

  // Test edge cases
  console.log('Testing edge cases...\n');

  const edgeCases = [
    '',
    'hello',
    'How?',
    'a'.repeat(1000) // Very long query
  ];

  for (const edgeQuery of edgeCases) {
    try {
      console.log(`Edge case: "${edgeQuery.substring(0, 50)}${edgeQuery.length > 50 ? '...' : '"}"`);
      const result = await classifyQuery(edgeQuery, { fallbackWeights: true, timeout: 3000 });
      console.log(`✅ Handled gracefully: ${result.type} (${result.confidence.toFixed(2)})`);
    } catch (error) {
      console.log(`❌ Expected error: ${error instanceof Error ? error.message : error}`);
    }
    console.log('---\n');
  }
  */
}

if (require.main === module) {
  demonstrateClassification()
    .then(() => {
      console.log('✅ Demo completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Demo failed:', error);
      process.exit(1);
    });
}