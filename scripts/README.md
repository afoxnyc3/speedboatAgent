# Memory Benchmark Scripts

This directory contains tools for evaluating memory performance in the RAG agent system.

## Files Created

### 1. `benchmark-memory.ts`
Comprehensive TypeScript benchmark script that tests multiple memory configurations:
- **Baseline (No Memory)**: Direct search without memory layer
- **With Mem0**: Current production setup
- **Redis-Only Memory**: Lightweight Redis-based conversation memory
- **PostgreSQL Pattern**: Mock PostgreSQL memory (design pattern)

Features:
- Tests 5 queries per configuration
- Calculates percentiles (P50, P95, P99)
- Provides detailed performance analysis
- Generates recommendations
- Saves results to JSON file

### 2. `quick-benchmark.js`
Simplified Node.js script for fast performance testing:
- Tests 3 configurations with 3 requests each
- Quick results in under 5 minutes
- Color-coded output
- Immediate recommendations

### 3. `run-benchmark.sh`
Helper script to compile and run TypeScript benchmark:
```bash
./scripts/run-benchmark.sh
```

## Memory Client Implementations

### 4. `../src/lib/memory/redis-memory-client.ts`
Redis-only memory implementation:
- Uses Upstash Redis for storage
- Conversation indexing with sorted sets
- 24-hour TTL for entries
- Lightweight operations (~5-50ms)

### 5. `../src/lib/memory/pg-memory-client.ts`
PostgreSQL pattern demonstration:
- Mock implementation with design patterns
- Schema documentation for production use
- Performance simulation (5ms query latency)
- Includes production implementation notes

## Usage

### Quick Test
```bash
node scripts/quick-benchmark.js
```

### Full Benchmark
```bash
npm install chalk cli-table3 --save-dev
./scripts/run-benchmark.sh
```

### Custom Configuration
Set environment variables to test specific memory backends:
```bash
USE_REDIS_MEMORY=true node scripts/quick-benchmark.js
USE_PG_MEMORY_MOCK=true node scripts/quick-benchmark.js
```

## Results

See `MEMORY_BENCHMARK_ANALYSIS.md` for detailed findings:

- **Mem0 overhead**: Only 349ms (2.5%)
- **Real bottleneck**: OpenAI API and Weaviate queries (13+ seconds)
- **Recommendation**: Keep Mem0, optimize core pipeline

## Key Insights

1. **Memory is not the bottleneck** - represents <1% of response time
2. **Search and LLM inference** consume 95%+ of response time
3. **Redis-only memory** can actually improve performance slightly
4. **Focus should be on** streaming responses and API optimization

## Next Steps

1. Implement response streaming for better UX
2. Optimize Weaviate queries and indexing
3. Consider GPT-4 Turbo for faster inference
4. Add Redis caching layer for frequent queries
5. Monitor end-to-end performance metrics