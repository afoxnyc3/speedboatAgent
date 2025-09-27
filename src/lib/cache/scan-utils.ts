import { Redis } from '@upstash/redis';

/**
 * Scan all keys matching a pattern using Redis SCAN
 * Non-blocking operation that works efficiently with large datasets
 * @param client Redis client
 * @param pattern Pattern to match (e.g., "prefix:*")
 * @param batchSize Number of keys to fetch per SCAN operation
 * @returns Array of matching keys
 */
export async function scanKeys(
  client: Redis,
  pattern: string = '*',
  batchSize: number = 100
): Promise<string[]> {
  const keys: string[] = [];
  let cursor = 0;

  do {
    try {
      const result = await client.scan(cursor, {
        match: pattern,
        count: batchSize
      });

      // Handle both array and object response formats
      const [nextCursor, batch] = Array.isArray(result)
        ? result
        : [result.cursor, result.keys || []];

      keys.push(...batch);
      cursor = typeof nextCursor === 'string' ? parseInt(nextCursor) : nextCursor;
    } catch (error) {
      console.error('Error during SCAN operation:', error);
      break;
    }
  } while (cursor !== 0);

  return keys;
}

/**
 * Delete all keys matching a pattern in batches
 * Non-blocking operation that deletes in chunks
 * @param client Redis client
 * @param pattern Pattern to match
 * @param scanBatchSize Keys to scan per iteration
 * @param deleteBatchSize Keys to delete per batch
 * @returns Number of deleted keys
 */
export async function batchDeleteKeys(
  client: Redis,
  pattern: string,
  scanBatchSize: number = 100,
  deleteBatchSize: number = 50
): Promise<number> {
  let totalDeleted = 0;
  let cursor = 0;

  do {
    try {
      const result = await client.scan(cursor, {
        match: pattern,
        count: scanBatchSize
      });

      const [nextCursor, batch] = Array.isArray(result)
        ? result
        : [result.cursor, result.keys || []];

      if (batch.length > 0) {
        // Delete in smaller chunks to avoid blocking
        for (let i = 0; i < batch.length; i += deleteBatchSize) {
          const chunk = batch.slice(i, i + deleteBatchSize);
          if (chunk.length > 0) {
            await client.del(...chunk);
            totalDeleted += chunk.length;
          }
        }
      }

      cursor = typeof nextCursor === 'string' ? parseInt(nextCursor) : nextCursor;
    } catch (error) {
      console.error('Error during batch delete:', error);
      break;
    }
  } while (cursor !== 0);

  return totalDeleted;
}

/**
 * Count keys matching a pattern without loading them all into memory
 * @param client Redis client
 * @param pattern Pattern to match
 * @param batchSize Keys to scan per iteration
 * @returns Count of matching keys
 */
export async function countKeys(
  client: Redis,
  pattern: string = '*',
  batchSize: number = 100
): Promise<number> {
  let count = 0;
  let cursor = 0;

  do {
    try {
      const result = await client.scan(cursor, {
        match: pattern,
        count: batchSize
      });

      const [nextCursor, batch] = Array.isArray(result)
        ? result
        : [result.cursor, result.keys || []];

      count += batch.length;
      cursor = typeof nextCursor === 'string' ? parseInt(nextCursor) : nextCursor;
    } catch (error) {
      console.error('Error during count operation:', error);
      break;
    }
  } while (cursor !== 0);

  return count;
}

/**
 * Stream keys matching a pattern with a callback
 * Useful for processing large sets of keys without loading all into memory
 * @param client Redis client
 * @param pattern Pattern to match
 * @param callback Function to process each batch of keys
 * @param batchSize Keys to scan per iteration
 */
export async function streamKeys(
  client: Redis,
  pattern: string,
  callback: (keys: string[]) => Promise<void>,
  batchSize: number = 100
): Promise<void> {
  let cursor = 0;

  do {
    try {
      const result = await client.scan(cursor, {
        match: pattern,
        count: batchSize
      });

      const [nextCursor, batch] = Array.isArray(result)
        ? result
        : [result.cursor, result.keys || []];

      if (batch.length > 0) {
        await callback(batch);
      }

      cursor = typeof nextCursor === 'string' ? parseInt(nextCursor) : nextCursor;
    } catch (error) {
      console.error('Error during stream operation:', error);
      break;
    }
  } while (cursor !== 0);
}

/**
 * Get a sample of keys matching a pattern
 * Useful for debugging or getting a preview of keys
 * @param client Redis client
 * @param pattern Pattern to match
 * @param limit Maximum number of keys to return
 * @returns Array of sample keys
 */
export async function sampleKeys(
  client: Redis,
  pattern: string = '*',
  limit: number = 10
): Promise<string[]> {
  const keys: string[] = [];
  let cursor = 0;

  do {
    try {
      const result = await client.scan(cursor, {
        match: pattern,
        count: Math.min(limit, 100)
      });

      const [nextCursor, batch] = Array.isArray(result)
        ? result
        : [result.cursor, result.keys || []];

      keys.push(...batch);
      cursor = typeof nextCursor === 'string' ? parseInt(nextCursor) : nextCursor;

      if (keys.length >= limit) {
        return keys.slice(0, limit);
      }
    } catch (error) {
      console.error('Error during sample operation:', error);
      break;
    }
  } while (cursor !== 0);

  return keys;
}