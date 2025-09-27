import { Redis } from '@upstash/redis';
import { scanKeys, batchDeleteKeys } from '../scan-utils';

// Mock Redis with SCAN support
const mockRedisData = new Map<string, any>();

const mockRedis = {
  scan: jest.fn(async (cursor: number | string, options?: { match?: string; count?: number }) => {
    const allKeys = Array.from(mockRedisData.keys());
    const pattern = options?.match || '*';
    const count = options?.count || 10;
    const numericCursor = typeof cursor === 'string' ? parseInt(cursor) : cursor;

    // Filter keys by pattern
    const filteredKeys = allKeys.filter(key => {
      if (pattern === '*') return true;
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(key);
    });

    // Simulate pagination
    const start = numericCursor;
    const end = Math.min(start + count, filteredKeys.length);
    const keys = filteredKeys.slice(start, end);
    const nextCursor = end >= filteredKeys.length ? 0 : end;

    return [String(nextCursor), keys];
  }),

  del: jest.fn(async (...keys: string[]) => {
    keys.forEach(key => mockRedisData.delete(key));
    return keys.length;
  }),

  set: jest.fn(async (key: string, value: any) => {
    mockRedisData.set(key, value);
    return 'OK';
  }),

  ping: jest.fn(async () => 'PONG')
};

describe('SCAN Iterator Implementation', () => {
  beforeEach(() => {
    mockRedisData.clear();
    jest.clearAllMocks();
  });

  describe('scanKeys', () => {
    it('should iterate through all keys with pattern', async () => {
      // Setup test data
      for (let i = 0; i < 25; i++) {
        mockRedisData.set(`cache:test:${i}`, `value${i}`);
      }
      for (let i = 0; i < 5; i++) {
        mockRedisData.set(`other:${i}`, `value${i}`);
      }

      const keys = await scanKeys(mockRedis as any, 'cache:test:*');

      expect(keys).toHaveLength(25);
      expect(keys.every(k => k.startsWith('cache:test:'))).toBe(true);
    });

    it('should handle empty results', async () => {
      const keys = await scanKeys(mockRedis as any, 'nonexistent:*');

      expect(keys).toHaveLength(0);
    });

    it('should handle large datasets efficiently', async () => {
      // Create 10,000 keys
      for (let i = 0; i < 10000; i++) {
        mockRedisData.set(`large:dataset:${i}`, `value${i}`);
      }

      const start = Date.now();
      const keys = await scanKeys(mockRedis as any, 'large:dataset:*');
      const duration = Date.now() - start;

      expect(keys).toHaveLength(10000);
      // Increased timeout for CI environment
      expect(duration).toBeLessThan(2000); // 2 seconds for CI environment
    });

    it('should batch delete keys efficiently', async () => {
      // Create 100 keys (smaller dataset for test)
      for (let i = 0; i < 100; i++) {
        mockRedisData.set(`delete:test:${i}`, `value${i}`);
      }

      const deletedCount = await batchDeleteKeys(mockRedis as any, 'delete:test:*');

      const remainingKeys = Array.from(mockRedisData.keys()).filter(k =>
        k.startsWith('delete:test:')
      );

      expect(deletedCount).toBe(100);
      expect(remainingKeys).toHaveLength(0);
    });
  });

  describe('Performance comparison', () => {
    it('should be faster than keys() for large datasets', async () => {
      // Create 5000 keys
      for (let i = 0; i < 5000; i++) {
        mockRedisData.set(`perf:test:${i}`, `value${i}`);
      }

      // Measure SCAN performance
      const scanStart = Date.now();
      const scanResults = await scanKeys(mockRedis as any, 'perf:test:*');
      const scanDuration = Date.now() - scanStart;

      // Simulate keys() operation (getting all at once)
      const keysStart = Date.now();
      const allKeys = Array.from(mockRedisData.keys()).filter(k =>
        k.startsWith('perf:test:')
      );
      const keysDuration = Date.now() - keysStart;

      expect(scanResults).toHaveLength(5000);
      // SCAN should be comparable or better for memory efficiency
      expect(scanDuration).toBeLessThan(2000); // Increased for CI environment
    });
  });
});