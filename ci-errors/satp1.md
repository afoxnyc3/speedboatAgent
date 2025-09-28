PR 139 Fix Vercel API routes by unifying directory structure


Run npm run typecheck

> typescript-next-starter@0.1.0 typecheck
> tsc --noEmit

Error: app/api/cache/metrics/route.ts(87,38): error TS2345: Argument of type '{ hitRate: number; totalRequests: number; }' is not assignable to parameter of type 'OverallMetrics'.
  Property 'cacheSize' is missing in type '{ hitRate: number; totalRequests: number; }' but required in type 'OverallMetrics'.
Error: app/api/cache/metrics/route.ts(119,61): error TS2345: Argument of type '{ search: { healthy: boolean; error?: string | undefined; }; cache: { healthy: boolean; latency?: number | undefined; error?: string | undefined; }; embedding: { cacheAvailable: boolean; stats: any; }; }' is not assignable to parameter of type '{ cache: { healthy: boolean; latency: number; }; }'.
  The types of 'cache.latency' are incompatible between these types.
    Type 'number | undefined' is not assignable to type 'number'.
      Type 'undefined' is not assignable to type 'number'.
Error: app/api/cache/metrics/route.ts(121,49): error TS2345: Argument of type '{ hitRate: number; totalRequests: number; cacheEnabled: boolean; healthStatus: string; latency: number; targetHitRate: number; performanceGrade: string; }' is not assignable to parameter of type 'OverallMetrics'.
  Property 'cacheSize' is missing in type '{ hitRate: number; totalRequests: number; cacheEnabled: boolean; healthStatus: string; latency: number; targetHitRate: number; performanceGrade: string; }' but required in type 'OverallMetrics'.
Error: app/api/cache/optimize/route.ts(94,75): error TS2339: Property 'errors' does not exist on type 'ZodError<unknown>'.
Error: app/api/cache/optimize/route.ts(122,19): error TS2352: Conversion of type 'EnhancedRedisCacheManager' to type 'CacheManager' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type 'EnhancedRedisCacheManager' is missing the following properties from type 'CacheManager': getDetailedMetrics, getUsageStatistics
Error: app/api/cache/warm/route.ts(142,26): error TS2339: Property 'errors' does not exist on type 'ZodError<unknown>'.
Error: app/api/cache/warm/route.ts(292,7): error TS18048: 'cacheStats.byType.embedding.hitRate' is possibly 'undefined'.
Error: app/api/cache/warm/route.ts(297,7): error TS18048: 'cacheStats.byType.searchResult.hitRate' is possibly 'undefined'.
Error: app/api/chat/route.ts(196,7): error TS2322: Type 'Document[]' is not assignable to type 'readonly Citation[]'.
  Type 'Document' is missing the following properties from type 'Citation': documentId, excerpt, relevanceScore, sourcePath, and 2 more.
Error: app/api/chat/route.ts(200,9): error TS2353: Object literal may only specify known properties, and 'memoryContext' does not exist in type 'MessageMetadata'.
Error: app/api/chat/route.ts(304,5): error TS2322: Type '{ title: string; url: string; snippet: string; }[]' is not assignable to type 'Document[]'.
  Type '{ title: string; url: string; snippet: string; }' is missing the following properties from type 'Document': id, content, filepath, language, and 4 more.
Error: app/api/chat/route.ts(338,3): error TS2322: Type '{ id: string; documentId: DocumentId; excerpt: string; relevanceScore: number; sourceUrl: string | undefined; sourcePath: any; sourceType: any; timestamp: Date; }[]' is not assignable to type '{ title: string; url: string; snippet: string; }[]'.
  Type '{ id: string; documentId: DocumentId; excerpt: string; relevanceScore: number; sourceUrl: string | undefined; sourcePath: any; sourceType: any; timestamp: Date; }' is missing the following properties from type '{ title: string; url: string; snippet: string; }': title, url, snippet
Error: app/api/chat/route.ts(344,31): error TS2339: Property 'filepath' does not exist on type 'DocumentMetadata'.
Error: app/api/chat/route.ts(345,31): error TS2339: Property 'source' does not exist on type 'DocumentMetadata'.
Error: app/api/chat/stream/route.ts(152,13): error TS4104: The type 'readonly Document[]' is 'readonly' and cannot be assigned to the mutable type 'Document[]'.
Error: app/api/chat/stream/route.ts(215,15): error TS2322: Type '{ id: MessageId; role: string; content: string; conversationId: ConversationId; timestamp: Date; status: string; sources: Document[]; metadata: { ...; }; }' is not assignable to type 'MessageResponse'.
  Types of property 'role' are incompatible.
    Type 'string' is not assignable to type '"assistant"'.
Error: app/api/chat/stream/route.ts(324,5): error TS2322: Type '{ title: string; url: string; snippet: string; }[]' is not assignable to type 'Document[]'.
  Type '{ title: string; url: string; snippet: string; }' is missing the following properties from type 'Document': id, content, filepath, language, and 4 more.
Error: app/api/chat/stream/route.ts(335,3): error TS2322: Type '{ id: string; documentId: DocumentId; excerpt: string; relevanceScore: number; sourceUrl: string | undefined; sourcePath: any; sourceType: any; timestamp: Date; }[]' is not assignable to type '{ title: string; url: string; snippet: string; }[]'.
  Type '{ id: string; documentId: DocumentId; excerpt: string; relevanceScore: number; sourceUrl: string | undefined; sourcePath: any; sourceType: any; timestamp: Date; }' is missing the following properties from type '{ title: string; url: string; snippet: string; }': title, url, snippet
Error: app/api/chat/stream/route.ts(341,31): error TS2339: Property 'filepath' does not exist on type 'DocumentMetadata'.
Error: app/api/chat/stream/route.ts(342,31): error TS2339: Property 'source' does not exist on type 'DocumentMetadata'.
Error: app/api/crawl/monitor/route.ts(89,61): error TS2339: Property 'errors' does not exist on type 'ZodError<unknown>'.
Error: app/api/crawl/schedule/route.ts(102,57): error TS2339: Property 'errors' does not exist on type 'ZodError<unknown>'.
Error: app/api/crawl/schedule/route.ts(149,61): error TS2339: Property 'errors' does not exist on type 'ZodError<unknown>'.
Error: app/api/feedback/route.ts(64,26): error TS2339: Property 'errors' does not exist on type 'ZodError<unknown>'.
Error: app/api/memory/context/route.ts(9,15): error TS2459: Module '"@/types/memory"' declares 'ConversationId' locally, but it is not exported.
Error: sentry.server.config.ts(62,9): error TS18048: 'event.tags' is possibly 'undefined'.
Error: sentry.server.config.ts(65,9): error TS18048: 'event.tags' is possibly 'undefined'.
Error: sentry.server.config.ts(68,9): error TS18048: 'event.tags' is possibly 'undefined'.
Error: sentry.server.config.ts(71,9): error TS18048: 'event.tags' is possibly 'undefined'.
Error: sentry.server.config.ts(74,9): error TS18048: 'event.tags' is possibly 'undefined'.
Error: sentry.server.config.ts(87,37): error TS2339: Property 'includes' does not exist on type 'string | number | bigint | boolean | symbol'.
  Property 'includes' does not exist on type 'number'.
Error: sentry.server.config.ts(92,37): error TS2339: Property 'includes' does not exist on type 'string | number | bigint | boolean | symbol'.
  Property 'includes' does not exist on type 'number'.
Error: sentry.server.config.ts(93,37): error TS2339: Property 'includes' does not exist on type 'string | number | bigint | boolean | symbol'.
  Property 'includes' does not exist on type 'number'.
Error: sentry.server.config.ts(105,7): error TS2353: Object literal may only specify known properties, and 'tracing' does not exist in type 'HttpOptions'.
Error: sentry.server.config.ts(162,7): error TS18048: 'event.tags' is possibly 'undefined'.
Error: sentry.server.config.ts(166,9): error TS18048: 'event.tags' is possibly 'undefined'.
Error: src/components/chat/FeedbackWidget.tsx(64,36): error TS2448: Block-scoped variable 'submitFeedback' used before its declaration.
Error: src/components/chat/FeedbackWidget.tsx(64,36): error TS2454: Variable 'submitFeedback' is used before being assigned.
Error: src/components/chat/memory-chat-assistant.tsx(9,27): error TS2307: Cannot find module './ChatInterface' or its corresponding type declarations.
Error: src/components/chat/memory-chat-assistant.tsx(10,34): error TS2307: Cannot find module './types' or its corresponding type declarations.
Error: src/components/chat/memory-chat-assistant.tsx(11,15): error TS2459: Module '"../../types/memory"' declares 'ConversationId' locally, but it is not exported.
Error: src/components/chat/memory-chat-assistant.tsx(17,30): error TS2304: Cannot find name 'MemoryContext'.
Error: src/components/chat/memory-chat-assistant.tsx(142,13): error TS18048: 'event.data.message' is possibly 'undefined'.
Error: src/components/chat/memory-chat-assistant.tsx(143,29): error TS18048: 'event.data.message' is possibly 'undefined'.
Error: src/components/monitoring/analytics-provider.tsx(176,15): error TS2341: Property 'track' is private and only accessible within class 'AnalyticsManager'.
Error: src/components/monitoring/analytics-provider.tsx(194,93): error TS2339: Property 'navigationStart' does not exist on type 'PerformanceNavigationTiming'.
Error: src/components/monitoring/analytics-provider.tsx(195,109): error TS2339: Property 'navigationStart' does not exist on type 'PerformanceNavigationTiming'.
Error: src/components/monitoring/analytics-provider.tsx(196,92): error TS2339: Property 'navigationStart' does not exist on type 'PerformanceNavigationTiming'.
Error: src/components/monitoring/analytics-provider.tsx(205,58): error TS2339: Property 'value' does not exist on type 'PerformanceEntry'.
Error: src/components/monitoring/analytics-provider.tsx(207,29): error TS2339: Property 'value' does not exist on type 'PerformanceEntry'.
Error: src/components/monitoring/analytics-provider.tsx(207,59): error TS2339: Property 'value' does not exist on type 'PerformanceEntry'.
Error: src/lib/cache/enhanced-redis-manager.ts(337,26): error TS2683: 'this' implicitly has type 'any' because it does not have a type annotation.
Error: src/lib/cache/enhanced-redis-manager.ts(358,61): error TS2345: Argument of type 'string | number | symbol' is not assignable to parameter of type 'string'.
  Type 'number' is not assignable to type 'string'.
Error: src/lib/cache/enhanced-redis-manager.ts(368,67): error TS2345: Argument of type 'string | number | symbol' is not assignable to parameter of type 'string'.
  Type 'number' is not assignable to type 'string'.
Error: src/lib/cache/enhanced-redis-manager.ts(378,11): error TS2345: Argument of type 'string | number | symbol' is not assignable to parameter of type 'string'.
  Type 'number' is not assignable to type 'string'.
Error: src/lib/feedback/feedback-store.ts(138,37): error TS2540: Cannot assign to 'count' because it is a read-only property.
Error: src/lib/feedback/feedback-store.ts(140,48): error TS2339: Property 'push' does not exist on type 'readonly string[]'.
Error: src/lib/feedback/feedback-store.ts(147,15): error TS2540: Cannot assign to 'percentage' because it is a read-only property.
Error: src/lib/memory/pg-memory-client.ts(76,13): error TS2353: Object literal may only specify known properties, and 'role' does not exist in type 'MemoryItem'.
Error: src/lib/memory/pg-memory-client.ts(156,27): error TS2339: Property 'timestamp' does not exist on type 'MemoryItem'.
Error: src/lib/memory/pg-memory-client.ts(156,51): error TS2339: Property 'timestamp' does not exist on type 'MemoryItem'.
Error: src/lib/memory/pg-memory-client.ts(202,14): error TS2540: Cannot assign to 'content' because it is a read-only property.
Error: src/lib/memory/pg-memory-client.ts(204,16): error TS2540: Cannot assign to 'metadata' because it is a read-only property.
Error: src/lib/memory/pg-memory-client.ts(206,14): error TS2339: Property 'timestamp' does not exist on type 'MemoryItem'.
Error: src/lib/memory/pg-memory-client.ts(298,41): error TS2339: Property 'timestamp' does not exist on type 'MemoryItem'.
Error: src/lib/memory/redis-memory-client.ts(94,51): error TS2345: Argument of type 'MemoryMessage' is not assignable to parameter of type '{ content: string; role: "user" | "assistant"; }'.
  Types of property 'role' are incompatible.
    Type 'MessageRole' is not assignable to type '"user" | "assistant"'.
      Type '"system"' is not assignable to type '"user" | "assistant"'.
Error: src/lib/memory/redis-memory-client.ts(101,25): error TS2345: Argument of type '[string, number, string]' is not assignable to parameter of type '[key: string, scoreMember: ScoreMember<unknown>, ...scoreMemberPairs: ScoreMember<unknown>[]] | [key: string, opts: ZAddCommandOptions, ScoreMember<unknown>, ...ScoreMember<unknown>[]]'.
  Type '[string, number, string]' is not assignable to type '[key: string, opts: ZAddCommandOptions, ScoreMember<unknown>, ...ScoreMember<unknown>[]]'.
    Type at position 1 in source is not compatible with type at position 1 in target.
      Type 'number' is not assignable to type 'ZAddCommandOptions'.
Error: src/lib/memory/redis-memory-client.ts(108,25): error TS2345: Argument of type '[string, number, string]' is not assignable to parameter of type '[key: string, scoreMember: ScoreMember<unknown>, ...scoreMemberPairs: ScoreMember<unknown>[]] | [key: string, opts: ZAddCommandOptions, ScoreMember<unknown>, ...ScoreMember<unknown>[]]'.
  Type '[string, number, string]' is not assignable to type '[key: string, opts: ZAddCommandOptions, ScoreMember<unknown>, ...ScoreMember<unknown>[]]'.
    Type at position 1 in source is not compatible with type at position 1 in target.
      Type 'number' is not assignable to type 'ZAddCommandOptions'.
Error: src/lib/memory/redis-memory-client.ts(173,15): error TS18046: 'result' is of type 'unknown'.
Error: src/lib/memory/redis-memory-client.ts(174,38): error TS18046: 'result' is of type 'unknown'.
Error: src/lib/memory/redis-memory-helpers.ts(77,10): error TS2352: Conversion of type '{ id: MemoryId; content: string; role: "user" | "assistant"; timestamp: Date; metadata: { sessionId: string; conversationId: string | undefined; userId: string | undefined; category: string | undefined; }; category: string; }' to type 'MemoryItem' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type '{ id: MemoryId; content: string; role: "user" | "assistant"; timestamp: Date; metadata: { sessionId: string; conversationId: string | undefined; userId: string | undefined; category: string | undefined; }; category: string; }' is missing the following properties from type 'MemoryItem': scope, createdAt, updatedAt
Error: src/lib/memory/redis-memory-helpers.ts(112,7): error TS2322: Type '"MEMORY_NOT_FOUND" | "REDIS_NOT_AVAILABLE" | "STORAGE_ERROR" | "UPDATE_ERROR" | "DELETE_ERROR"' is not assignable to type 'MemoryErrorCode'.
  Type '"REDIS_NOT_AVAILABLE"' is not assignable to type 'MemoryErrorCode'.
Error: src/lib/search/authority-search-adapter.ts(90,7): error TS2322: Type 'SourceWeights' is not assignable to type 'Record<string, number>'.
  Index signature for type 'string' is missing in type 'SourceWeights'.
Error: src/lib/search/authority-search-adapter.ts(92,67): error TS2339: Property 'authority' does not exist on type 'SourceWeights'.
Error: src/lib/security/api-keys.ts(171,62): error TS2345: Argument of type 'Uint8Array<ArrayBufferLike> | Buffer<ArrayBufferLike>' is not assignable to parameter of type 'BufferSource'.
  Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'BufferSource'.
    Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'ArrayBufferView<ArrayBuffer>'.
      Types of property 'buffer' are incompatible.
        Type 'ArrayBufferLike' is not assignable to type 'ArrayBuffer'.
          Type 'SharedArrayBuffer' is missing the following properties from type 'ArrayBuffer': resizable, resize, detached, transfer, transferToFixedLength
Error: src/lib/security/input-sanitization.ts(152,60): error TS2339: Property 'errors' does not exist on type 'ZodError<unknown>'.
Error: src/lib/security/input-sanitization.ts(153,34): error TS2339: Property 'errors' does not exist on type 'ZodError<unknown>'.
Error: src/lib/security/rate-limiter.ts(73,38): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
Error: src/lib/security/rate-limiter.ts(90,29): error TS2571: Object is of type 'unknown'.
Error: src/types/index.ts(12,1): error TS2308: Module './search' has already exported a member named 'SessionIdSchema'. Consider explicitly re-exporting to resolve the ambiguity.
Error: src/types/index.ts(12,1): error TS2308: Module './search' has already exported a member named 'createSessionId'. Consider explicitly re-exporting to resolve the ambiguity.
Error: src/types/index.ts(19,3): error TS2300: Duplicate identifier 'SessionId'.
Error: src/types/index.ts(46,3): error TS2300: Duplicate identifier 'SessionId'.
Error: src/types/utils.ts(176,7): error TS2322: Type 'ValidationResult<undefined>' is not assignable to type 'ValidationResult<T>'.
  Type 'undefined' is not assignable to type 'T'.
    'T' could be instantiated with an arbitrary type which could be unrelated to 'undefined'.
Error: src/types/utils.ts(178,5): error TS2322: Type 'ValidationResult<undefined>' is not assignable to type 'ValidationResult<T>'.
  Type 'undefined' is not assignable to type 'T'.
    'T' could be instantiated with an arbitrary type which could be unrelated to 'undefined'.
Error: src/types/utils.ts(535,25): error TS2345: Argument of type 'K | undefined' is not assignable to parameter of type 'K'.
  'K' could be instantiated with an arbitrary type which could be unrelated to 'K | undefined'.
Error: Process completed with exit code 2.
0s
0s


18s
Run npm run test:ci

> typescript-next-starter@0.1.0 test:ci
> jest --ci --coverage

PASS src/types/__tests__/types.test.ts
PASS src/lib/cache/__tests__/cache-optimization.test.ts
PASS src/lib/cache/__tests__/performance.test.ts
  ● Console

    console.log
      Cache Performance: 73% hit rate

      at Object.log (src/lib/cache/__tests__/performance.test.ts:138:15)

    console.log
      Total requests: 22, Hits: 16, Misses: 6

      at Object.log (src/lib/cache/__tests__/performance.test.ts:139:15)

FAIL src/lib/memory/__tests__/mem0-client.test.ts
  ● Console

    console.log
      [Mem0] Using mock client (API key issues or disabled)

      at Object.log (src/lib/memory/mem0-client.ts:313:17)

  ● Mem0Client › add › should successfully add memories

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "https://api.mem0.ai/v1/memories", ObjectContaining {"headers": ObjectContaining {"Authorization": "***", "Content-Type": "application/json"}, "method": "POST"}
    Received: "https://api.mem0.ai/v1/memories", {"body": "{\"messages\":[{\"role\":\"user\",\"content\":\"I love TypeScript\"},{\"role\":\"assistant\",\"content\":\"Great! TypeScript is excellent for type safety.\"}],\"user_id\":\"user_123\",\"session_id\":\"session_456\",\"metadata\":{\"category\":\"preference\",\"timestamp\":\"2025-09-28T04:12:01.511Z\"}}", "headers": {"Content-Type": "application/json", "X-API-Key": "test-api-key"}, "method": "POST", "signal": undefined}

    Number of calls: 1

      71 |       expect(result.memoryId).toBe('mem_123');
      72 |       expect(result.operationType).toBe('add');
    > 73 |       expect(fetch).toHaveBeenCalledWith(
         |                     ^
      74 |         'https://api.mem0.ai/v1/memories',
      75 |         expect.objectContaining({
      76 |           method: 'POST',

      at Object.toHaveBeenCalledWith (src/lib/memory/__tests__/mem0-client.test.ts:73:21)

PASS src/lib/memory/__tests__/privacy-compliance.test.ts
PASS src/lib/feedback/__tests__/feedback.test.ts
PASS src/lib/monitoring/__tests__/monitoring.test.ts
PASS src/lib/search/__tests__/enhanced-authority-weighting.test.ts
PASS src/lib/cache/__tests__/redis-cache.test.ts
  ● Console

    console.log
      Cache warming needed for query: test query 1

      at RedisCacheManager.log [as warmCache] (src/lib/cache/redis-cache.ts:487:19)

    console.log
      Cache warming needed for query: test query 2

      at RedisCacheManager.log [as warmCache] (src/lib/cache/redis-cache.ts:487:19)

    console.log
      Cleared 0 total cache keys

      at RedisCacheManager.log [as clearAll] (src/lib/cache/redis-cache.ts:566:15)

PASS src/lib/ingestion/__tests__/crawl-schemas.test.ts
PASS src/lib/security/__tests__/input-sanitization.test.ts
PASS src/lib/security/__tests__/api-keys.test.ts
PASS tests/unit/api/search-simple.test.ts
PASS src/lib/security/__tests__/rate-limiter.test.ts
PASS src/lib/cache/__tests__/scan-iterator.test.ts
PASS src/lib/ingestion/__tests__/content-normalizer-simple.test.ts
PASS tests/unit/example.test.ts
-------------------------------------|---------|----------|---------|---------|-----------------------------------------------------------------------------------------------------------------
File                                 | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                                                                                               
-------------------------------------|---------|----------|---------|---------|-----------------------------------------------------------------------------------------------------------------
All files                            |   21.49 |    13.25 |   17.64 |   22.21 |                                                                                                                 
 app                                 |       0 |        0 |       0 |       0 |                                                                                                                 
  layout.tsx                         |       0 |      100 |       0 |       0 | 7-34                                                                                                            
  page.tsx                           |       0 |        0 |       0 |       0 | 5                                                                                                               
 app/about                           |       0 |      100 |       0 |       0 |                                                                                                                 
  page.tsx                           |       0 |      100 |       0 |       0 | 4                                                                                                               
 app/api/cache/metrics               |       0 |        0 |       0 |       0 |                                                                                                                 
  route.ts                           |       0 |        0 |       0 |       0 | 29-280                                                                                                          
 app/api/cache/optimize              |       0 |        0 |       0 |       0 |                                                                                                                 
  route.ts                           |       0 |        0 |       0 |       0 | 30-154                                                                                                          
 app/api/cache/warm                  |       0 |        0 |       0 |       0 |                                                                                                                 
  route.ts                           |       0 |        0 |       0 |       0 | 23-304                                                                                                          
 app/api/chat                        |       0 |        0 |       0 |       0 |                                                                                                                 
  route.ts                           |       0 |        0 |       0 |       0 | 26-394                                                                                                          
 app/api/chat/stream                 |       0 |        0 |       0 |       0 |                                                                                                                 
  route.ts                           |       0 |        0 |       0 |       0 | 24-353                                                                                                          
 app/api/crawl/monitor               |       0 |        0 |       0 |       0 |                                                                                                                 
  route.ts                           |       0 |        0 |       0 |       0 | 12-94                                                                                                           
 app/api/crawl/schedule              |       0 |        0 |       0 |       0 |                                                                                                                 
  route.ts                           |       0 |        0 |       0 |       0 | 11-154                                                                                                          
 app/api/crawl/status/[jobId]        |       0 |        0 |       0 |       0 |                                                                                                                 
  route.ts                           |       0 |        0 |       0 |       0 | 20-49                                                                                                           
 app/api/feedback                    |       0 |        0 |       0 |       0 |                                                                                                                 
  route.ts                           |       0 |        0 |       0 |       0 | 12-119                                                                                                          
 app/api/health                      |       0 |        0 |       0 |       0 |                                                                                                                 
  route.ts                           |       0 |        0 |       0 |       0 | 4-46                                                                                                            
 app/api/ingest/web                  |       0 |        0 |       0 |       0 |                                                                                                                 
  route.ts                           |       0 |        0 |       0 |       0 | 12-310                                                                                                          
 app/api/memory/context              |       0 |        0 |       0 |       0 |                                                                                                                 
  route.ts                           |       0 |        0 |       0 |       0 | 11-64                                                                                                           
 app/api/monitoring/alerts           |       0 |        0 |       0 |       0 |                                                                                                                 
  route.ts                           |       0 |        0 |       0 |       0 | 14-141                                                                                                          
 app/api/monitoring/costs            |       0 |        0 |       0 |       0 |                                                                                                                 
  route.ts                           |       0 |        0 |       0 |       0 | 56-308                                                                                                          
 app/api/monitoring/dashboard        |       0 |        0 |       0 |       0 |                                                                                                                 
  route.ts                           |       0 |        0 |       0 |       0 | 14-132                                                                                                          
 app/api/search                      |       0 |        0 |       0 |       0 |                                                                                                                 
  route.ts                           |       0 |        0 |       0 |       0 | 23-79                                                                                                           
 app/api/test-sentry                 |       0 |        0 |       0 |       0 |                                                                                                                 
  route.ts                           |       0 |        0 |       0 |       0 | 10-130                                                                                                          
 app/demo                            |       0 |      100 |       0 |       0 |                                                                                                                 
  page.tsx                           |       0 |      100 |       0 |       0 | 5-51                                                                                                            
 app/monitoring                      |       0 |        0 |       0 |       0 |                                                                                                                 
  page.tsx                           |       0 |        0 |       0 |       0 | 107-175                                                                                                         
 app/privacy                         |       0 |      100 |       0 |       0 |                                                                                                                 
  page.tsx                           |       0 |      100 |       0 |       0 | 2                                                                                                               
 components/ai-elements              |       0 |        0 |       0 |       0 |                                                                                                                 
  actions.tsx                        |       0 |        0 |       0 |       0 | 15-64                                                                                                           
  artifact.tsx                       |       0 |        0 |       0 |       0 | 16-146                                                                                                          
  branch.tsx                         |       0 |        0 |       0 |       0 | 19-201                                                                                                          
  chain-of-thought.tsx               |       0 |        0 |       0 |       0 | 25-223                                                                                                          
  code-block.tsx                     |       0 |        0 |       0 |       0 | 18-135                                                                                                          
  context.tsx                        |       0 |        0 |       0 |       0 | 15-396                                                                                                          
  conversation.tsx                   |       0 |        0 |       0 |       0 | 12-77                                                                                                           
  image.tsx                          |       0 |      100 |       0 |       0 | 9-15                                                                                                            
  inline-citation.tsx                |       0 |        0 |       0 |       0 | 28-278                                                                                                          
  loader.tsx                         |       0 |        0 |       0 |       0 | 86-87                                                                                                           
  message.tsx                        |       0 |        0 |       0 |       0 | 15-76                                                                                                           
  open-in-chat.tsx                   |       0 |        0 |       0 |       0 | 18-303                                                                                                          
  prompt-input.tsx                   |       0 |        0 |       0 |       0 | 59-690                                                                                                          
  reasoning.tsx                      |       0 |        0 |       0 |       0 | 22-177                                                                                                          
  response.tsx                       |       0 |      100 |       0 |       0 | 9-22                                                                                                            
  sources.tsx                        |       0 |        0 |       0 |       0 | 14-63                                                                                                           
  suggestion.tsx                     |       0 |        0 |       0 |       0 | 13-44                                                                                                           
  task.tsx                           |       0 |        0 |       0 |       0 | 14-83                                                                                                           
  tool.tsx                           |       0 |        0 |       0 |       0 | 24-134                                                                                                          
  web-preview.tsx                    |       0 |        0 |       0 |       0 | 28-231                                                                                                          
 components/chat                     |       0 |        0 |       0 |       0 |                                                                                                                 
  ChatInterface.tsx                  |       0 |        0 |       0 |       0 | 51-483                                                                                                          
  CodeBlock.tsx                      |       0 |        0 |       0 |       0 | 22-30                                                                                                           
  FeedbackWidget.tsx                 |       0 |        0 |       0 |       0 | 40-175                                                                                                          
  MicroInteractions.tsx              |       0 |        0 |       0 |       0 | 17-315                                                                                                          
  PerformanceDemo.tsx                |       0 |        0 |       0 |       0 | 19-182                                                                                                          
  SkeletonLoader.tsx                 |       0 |        0 |       0 |       0 | 28-118                                                                                                          
  SourceViewer.tsx                   |       0 |        0 |       0 |       0 | 36-157                                                                                                          
  StreamingText.tsx                  |       0 |        0 |       0 |       0 | 17-204                                                                                                          
  chat-assistant.tsx                 |       0 |        0 |       0 |       0 | 9-57                                                                                                            
  mockData.ts                        |       0 |      100 |     100 |       0 | 7-91                                                                                                            
 components/ui                       |       0 |        0 |       0 |       0 |                                                                                                                 
  avatar.tsx                         |       0 |        0 |       0 |       0 |                                                                                                                 
  badge.tsx                          |       0 |        0 |       0 |       0 | 7-35                                                                                                            
  button.tsx                         |       0 |        0 |       0 |       0 | 7-48                                                                                                            
  card.tsx                           |       0 |        0 |       0 |       0 |                                                                                                                 
  carousel.tsx                       |       0 |        0 |       0 |       0 | 33-212                                                                                                          
  collapsible.tsx                    |       0 |        0 |       0 |       0 |                                                                                                                 
  dropdown-menu.tsx                  |       0 |        0 |       0 |       0 | 91-127                                                                                                          
  hover-card.tsx                     |       0 |        0 |       0 |       0 |                                                                                                                 
  input.tsx                          |       0 |        0 |       0 |       0 |                                                                                                                 
  progress.tsx                       |       0 |        0 |       0 |       0 |                                                                                                                 
  scroll-area.tsx                    |       0 |        0 |       0 |       0 | 13                                                                                                              
  select.tsx                         |       0 |        0 |       0 |       0 | 59-106                                                                                                          
  textarea.tsx                       |       0 |        0 |       0 |       0 |                                                                                                                 
  tooltip.tsx                        |       0 |        0 |       0 |       0 |                                                                                                                 
 lib                                 |       0 |      100 |       0 |       0 |                                                                                                                 
  utils.ts                           |       0 |      100 |       0 |       0 | 5                                                                                                               
 lib/feedback                        |       0 |        0 |       0 |       0 |                                                                                                                 
  feedback-store.ts                  |       0 |        0 |       0 |       0 | 24-222                                                                                                          
  feedback.test.ts                   |       0 |      100 |       0 |       0 | 13-306                                                                                                          
 src/components/chat                 |       0 |        0 |       0 |       0 |                                                                                                                 
  FeedbackWidget.tsx                 |       0 |        0 |       0 |       0 | 40-175                                                                                                          
  memory-chat-assistant.tsx          |       0 |        0 |       0 |       0 | 28-327                                                                                                          
 src/components/monitoring           |       0 |        0 |       0 |       0 |                                                                                                                 
  PerformanceDashboard.tsx           |       0 |        0 |       0 |       0 | 56-258                                                                                                          
  SentryTestComponent.tsx            |       0 |        0 |       0 |       0 | 18-256                                                                                                          
  analytics-provider.tsx             |       0 |        0 |       0 |       0 | 32-250                                                                                                          
 src/components/monitoring/dashboard |       0 |        0 |       0 |       0 |                                                                                                                 
  AlertsSection.tsx                  |       0 |        0 |       0 |       0 | 37-112                                                                                                          
  CacheMetricsSection.tsx            |       0 |        0 |       0 |       0 | 25-34                                                                                                           
  PerformanceMetricsCard.tsx         |       0 |        0 |       0 |       0 | 28                                                                                                              
  ResourcesSection.tsx               |       0 |        0 |       0 |       0 | 30-92                                                                                                           
  SystemStatusCard.tsx               |       0 |        0 |       0 |       0 | 17-49                                                                                                           
 src/components/ui                   |       0 |        0 |       0 |       0 |                                                                                                                 
  badge.tsx                          |       0 |      100 |       0 |       0 | 5                                                                                                               
  button.tsx                         |       0 |        0 |       0 |       0 | 6-53                                                                                                            
  card.tsx                           |       0 |      100 |     100 |       0 | 17-76                                                                                                           
  progress.tsx                       |       0 |        0 |     100 |       0 | 23                                                                                                              
 src/lib                             |       0 |      100 |       0 |       0 |                                                                                                                 
  utils.ts                           |       0 |      100 |       0 |       0 | 5                                                                                                               
 src/lib/attribution                 |       0 |        0 |       0 |       0 |                                                                                                                 
  url-generator.ts                   |       0 |        0 |       0 |       0 | 15-164                                                                                                          
 src/lib/cache                       |   56.82 |     35.9 |      66 |    57.7 |                                                                                                                 
  advanced-ttl-manager.ts            |   76.69 |    53.48 |      80 |   76.76 | 109,111,120-121,126,128,134-135,220-248,284,301,352-353                                                         
  compression-utils.ts               |   64.22 |    47.05 |      70 |      64 | 90,114-117,146-147,168,183-186,193-196,213-214,231,236-238,262,288-289,334-345,365-381                          
  embedding-service.ts               |   17.46 |     3.84 |    9.09 |   18.33 | 31,43-193,214-228                                                                                               
  enhanced-redis-manager.ts          |   73.48 |    49.12 |      96 |   75.58 | 114-115,121-122,198-199,257-258,274-275,290-326,363-364,370-371,388-393,414,423,444-445,457,475-476,498,527,554 
  intelligent-cache-warmer.ts        |   71.89 |    36.17 |   82.14 |   71.83 | 124-125,173,207-209,222,265,375-380,402-408,421,440-441,457-517,558                                             
  optimization-handlers.ts           |       0 |        0 |       0 |       0 | 35-229                                                                                                          
  optimization-recommendations.ts    |       0 |        0 |       0 |       0 | 14-114                                                                                                          
  redis-cache.ts                     |   53.47 |    35.55 |   66.66 |   56.01 | 75-76,86-191,311-312,324-325,341-348,382-383,395-396,412-471,491,541,573-574,583,593,614,644-655                
  scan-utils.ts                      |    59.7 |     27.9 |      60 |   59.09 | 34-35,137-207                                                                                                   
 src/lib/feedback                    |    2.72 |        0 |    1.96 |    2.85 |                                                                                                                 
  feedback-store.ts                  |    6.31 |        0 |    4.16 |    6.97 | 29-217                                                                                                          
  feedback.test.ts                   |       0 |      100 |       0 |       0 | 13-306                                                                                                          
 src/lib/ingestion                   |       0 |        0 |       0 |       0 |                                                                                                                 
  content-normalizer.ts              |       0 |        0 |       0 |       0 | 33-316                                                                                                          
  crawl-scheduler.ts                 |       0 |        0 |       0 |       0 | 13-378                                                                                                          
  deduplication.ts                   |       0 |        0 |       0 |       0 | 23-524                                                                                                          
  local-processor.ts                 |       0 |        0 |       0 |       0 | 6-164                                                                                                           
  web-crawler.ts                     |       0 |        0 |       0 |       0 | 32-453                                                                                                          
 src/lib/ingestion/__tests__         |       0 |        0 |       0 |       0 |                                                                                                                 
  web-crawler.test.ts                |       0 |        0 |       0 |       0 | 10-331                                                                                                          
 src/lib/memory                      |   33.55 |    37.71 |    42.7 |   32.53 |                                                                                                                 
  mem0-client.ts                     |      77 |    68.96 |   88.88 |   79.31 | 88-114,219-220,277,302-303,306-307,317-318                                                                      
  mock-mem0-client.ts                |      40 |      100 |   28.57 |   33.33 | 19,35-83                                                                                                        
  pg-memory-client.ts                |       0 |        0 |       0 |       0 | 46-392                                                                                                          
  privacy-compliance.ts              |   98.57 |    89.65 |     100 |   98.46 | 79                                                                                                              
  privacy.ts                         |       0 |        0 |       0 |       0 | 7-54                                                                                                            
  redis-memory-client.ts             |       0 |        0 |       0 |       0 | 34-331                                                                                                          
  redis-memory-helpers.ts            |       0 |        0 |       0 |       0 | 10-124                                                                                                          
 src/lib/monitoring                  |       0 |        0 |       0 |       0 |                                                                                                                 
  performance-middleware.ts          |       0 |        0 |       0 |       0 | 20-324                                                                                                          
 src/lib/monitoring/alerts           |       0 |        0 |       0 |       0 |                                                                                                                 
  alert-manager.ts                   |       0 |        0 |       0 |       0 | 10-181                                                                                                          
  default-rules.ts                   |       0 |      100 |     100 |       0 | 7                                                                                                               
  metrics-collector.ts               |       0 |      100 |       0 |       0 | 11-36                                                                                                           
 src/lib/monitoring/dashboard        |       0 |        0 |       0 |       0 |                                                                                                                 
  performance-tracker.ts             |       0 |        0 |       0 |       0 | 7-95                                                                                                            
  status-calculator.ts               |       0 |        0 |       0 |       0 | 12-28                                                                                                           
  utils.ts                           |       0 |        0 |       0 |       0 | 17-125                                                                                                          
 src/lib/search                      |    12.6 |    12.92 |   10.67 |    12.5 |                                                                                                                 
  authority-search-adapter.ts        |       0 |        0 |       0 |       0 | 45-249                                                                                                          
  cached-search-orchestrator.ts      |       0 |        0 |       0 |       0 | 49-322                                                                                                          
  enhanced-authority-weighting.ts    |   92.15 |    69.69 |     100 |   91.83 | 47,53,146,154                                                                                                   
  error-handler.ts                   |       0 |        0 |       0 |       0 | 17-182                                                                                                          
  hybrid-search.ts                   |       0 |        0 |       0 |       0 | 39-133                                                                                                          
  query-classifier.ts                |       0 |        0 |       0 |       0 | 23-372                                                                                                          
  search-orchestrator.ts             |       0 |        0 |       0 |       0 | 43-120                                                                                                          
  search-utils.ts                    |       0 |        0 |       0 |       0 | 23-174                                                                                                          
  search-validation.ts               |       0 |        0 |       0 |       0 | 23-120                                                                                                          
 src/lib/security                    |   87.76 |    84.12 |   87.09 |   88.88 |                                                                                                                 
  api-keys.ts                        |      85 |    83.33 |   92.85 |   86.66 | 96-98,162,171-173,198-199,212                                                                                   
  input-sanitization.ts              |   91.83 |    95.83 |   81.81 |   91.66 | 83,153-156                                                                                                      
  rate-limiter.ts                    |   88.13 |    66.66 |   83.33 |   89.47 | 51,87,171-175                                                                                                   
 src/lib/weaviate                    |       0 |        0 |       0 |       0 |                                                                                                                 
  client.ts                          |       0 |        0 |       0 |       0 | 4-43                                                                                                            
  schema.ts                          |       0 |        0 |       0 |       0 | 4-130                                                                                                           
 src/types                           |    54.3 |    41.71 |   48.57 |   79.03 |                                                                                                                 
  api.ts                             |   42.25 |        0 |       0 |   76.92 | 439,443,446,449,452,455,462,472,483                                                                             
  chat.ts                            |   49.27 |        0 |   16.66 |   78.37 | 418,421,425,428,431,434,437,440                                                                                 
  feedback.ts                        |   52.38 |      100 |      25 |     100 |                                                                                                                 
  index.ts                           |   44.18 |        0 |       0 |   61.66 | 423,426,429,432,435,439-440,445-446,451-452,457-458,464-470,475-478,487,491                                     
  memory.ts                          |   43.58 |      100 |       0 |     100 |                                                                                                                 
  query-classification.ts            |      75 |      100 |     100 |     100 |                                                                                                                 
  rag.ts                             |   44.23 |        0 |       0 |   88.46 | 495,498,501                                                                                                     
  search.ts                          |    54.9 |        0 |      25 |   81.48 | 323,326,329,333,336                                                                                             
  source-attribution.ts              |      60 |      100 |     100 |     100 |                                                                                                                 
  utils.ts                           |   62.29 |    56.66 |   82.89 |   79.36 | 51,115-117,121-130,178,230-247,251-255,297-305,309-314,344-352,371-379,532                                      
-------------------------------------|---------|----------|---------|---------|-----------------------------------------------------------------------------------------------------------------

Test Suites: 1 failed, 16 passed, 17 total
Tests:       1 failed, 15 skipped, 273 passed, 289 total
Snapshots:   0 total
Time:        17.64 s
Ran all test suites.
Error: Process completed with exit code 1.
0s
0s
0s
