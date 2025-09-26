/**
 * Cache Compression Utilities
 * Implements intelligent compression for large cache entries
 */

import { createHash } from 'crypto';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface CompressionOptions {
  threshold: number; // Compress if larger than this (bytes)
  level: number;     // Compression level 1-9
  contentType: 'embedding' | 'search' | 'text' | 'json';
}

export interface CompressedEntry {
  data: string;
  compressed: boolean;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: 'gzip' | 'none';
  contentType: string;
  timestamp: Date;
}

/**
 * Intelligent cache compression manager
 */
export class CacheCompressionManager {
  private readonly defaultOptions: Record<string, CompressionOptions> = {
    embedding: {
      threshold: 1024,  // 1KB threshold for embeddings
      level: 6,         // Balanced compression
      contentType: 'embedding'
    },
    search: {
      threshold: 2048,  // 2KB threshold for search results
      level: 4,         // Faster compression for search results
      contentType: 'search'
    },
    text: {
      threshold: 512,   // 512B threshold for text
      level: 9,         // Maximum compression for text
      contentType: 'text'
    },
    json: {
      threshold: 1024,  // 1KB threshold for JSON
      level: 7,         // Good compression for structured data
      contentType: 'json'
    }
  };

  /**
   * Compress cache entry if beneficial
   */
  async compressEntry(
    data: any,
    contentType: keyof typeof this.defaultOptions = 'json'
  ): Promise<CompressedEntry> {
    const options = this.defaultOptions[contentType];
    const serialized = this.serializeData(data, contentType);
    const originalSize = Buffer.byteLength(serialized, 'utf8');

    // Only compress if above threshold
    if (originalSize < options.threshold) {
      return {
        data: serialized,
        compressed: false,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1.0,
        algorithm: 'none',
        contentType,
        timestamp: new Date()
      };
    }

    try {
      const buffer = Buffer.from(serialized, 'utf8');
      const compressed = await gzipAsync(buffer, { level: options.level });
      const compressedSize = compressed.length;
      const compressionRatio = originalSize / compressedSize;

      // Only use compression if it provides meaningful benefit (>10% reduction)
      if (compressionRatio < 1.1) {
        return {
          data: serialized,
          compressed: false,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1.0,
          algorithm: 'none',
          contentType,
          timestamp: new Date()
        };
      }

      return {
        data: compressed.toString('base64'),
        compressed: true,
        originalSize,
        compressedSize,
        compressionRatio,
        algorithm: 'gzip',
        contentType,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Compression error:', error);

      // Fallback to uncompressed
      return {
        data: serialized,
        compressed: false,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1.0,
        algorithm: 'none',
        contentType,
        timestamp: new Date()
      };
    }
  }

  /**
   * Decompress cache entry
   */
  async decompressEntry(entry: CompressedEntry): Promise<any> {
    if (!entry.compressed) {
      return this.deserializeData(entry.data, entry.contentType);
    }

    try {
      const compressedBuffer = Buffer.from(entry.data, 'base64');
      const decompressed = await gunzipAsync(compressedBuffer);
      const decompressedData = decompressed.toString('utf8');

      return this.deserializeData(decompressedData, entry.contentType);

    } catch (error) {
      console.error('Decompression error:', error);
      throw new Error(`Failed to decompress cache entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Serialize data based on content type
   */
  private serializeData(data: any, contentType: string): string {
    switch (contentType) {
      case 'embedding':
        // Special handling for embeddings - float array optimization
        if (Array.isArray(data) && typeof data[0] === 'number') {
          return this.serializeFloatArray(data);
        }
        return JSON.stringify(data);

      case 'search':
        // Search results - remove unnecessary fields
        return JSON.stringify(this.optimizeSearchData(data));

      case 'text':
        return typeof data === 'string' ? data : JSON.stringify(data);

      case 'json':
      default:
        return JSON.stringify(data);
    }
  }

  /**
   * Deserialize data based on content type
   */
  private deserializeData(data: string, contentType: string): any {
    switch (contentType) {
      case 'embedding':
        // Try to parse as optimized float array first
        if (data.startsWith('FLOATS:')) {
          return this.deserializeFloatArray(data);
        }
        return JSON.parse(data);

      case 'search':
      case 'json':
        return JSON.parse(data);

      case 'text':
        return data;

      default:
        return JSON.parse(data);
    }
  }

  /**
   * Optimize float array serialization for embeddings
   */
  private serializeFloatArray(floats: number[]): string {
    // Convert to fixed precision to reduce size
    const fixedFloats = floats.map(f => Math.round(f * 100000) / 100000);
    return `FLOATS:${fixedFloats.join(',')}`;
  }

  /**
   * Deserialize optimized float array
   */
  private deserializeFloatArray(data: string): number[] {
    const floatString = data.replace('FLOATS:', '');
    return floatString.split(',').map(s => parseFloat(s));
  }

  /**
   * Optimize search result data for caching
   */
  private optimizeSearchData(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.optimizeSearchData(item));
    }

    if (typeof data === 'object' && data !== null) {
      const optimized: any = {};

      for (const [key, value] of Object.entries(data)) {
        // Skip certain fields that can be reconstructed or are not essential
        if (key === 'embedding' || key === 'rawVector' || key === '_additional') {
          continue;
        }

        // Truncate very long content for caching
        if (key === 'content' && typeof value === 'string' && value.length > 5000) {
          optimized[key] = value.slice(0, 5000) + '...';
          optimized.contentTruncated = true;
          continue;
        }

        optimized[key] = this.optimizeSearchData(value);
      }

      return optimized;
    }

    return data;
  }

  /**
   * Calculate compression statistics
   */
  getCompressionStats(entries: CompressedEntry[]): {
    totalEntries: number;
    compressedEntries: number;
    compressionRate: number;
    totalSaved: number;
    avgCompressionRatio: number;
    sizeDistribution: Record<string, number>;
  } {
    if (entries.length === 0) {
      return {
        totalEntries: 0,
        compressedEntries: 0,
        compressionRate: 0,
        totalSaved: 0,
        avgCompressionRatio: 1.0,
        sizeDistribution: {}
      };
    }

    const compressedEntries = entries.filter(e => e.compressed).length;
    const totalSaved = entries.reduce((sum, e) => sum + (e.originalSize - e.compressedSize), 0);
    const avgCompressionRatio = entries.reduce((sum, e) => sum + e.compressionRatio, 0) / entries.length;

    // Size distribution analysis
    const sizeDistribution: Record<string, number> = {
      'small (<1KB)': 0,
      'medium (1-10KB)': 0,
      'large (10-100KB)': 0,
      'xlarge (>100KB)': 0
    };

    entries.forEach(entry => {
      const sizeKB = entry.originalSize / 1024;
      if (sizeKB < 1) sizeDistribution['small (<1KB)']++;
      else if (sizeKB < 10) sizeDistribution['medium (1-10KB)']++;
      else if (sizeKB < 100) sizeDistribution['large (10-100KB)']++;
      else sizeDistribution['xlarge (>100KB)']++;
    });

    return {
      totalEntries: entries.length,
      compressedEntries,
      compressionRate: compressedEntries / entries.length,
      totalSaved,
      avgCompressionRatio,
      sizeDistribution
    };
  }

  /**
   * Estimate memory savings from compression
   */
  estimateMemorySavings(
    avgEntrySize: number,
    entryCount: number,
    compressionRatio: number = 2.5
  ): {
    originalSize: number;
    compressedSize: number;
    savings: number;
    savingsPercent: number;
  } {
    const originalSize = avgEntrySize * entryCount;
    const compressedSize = originalSize / compressionRatio;
    const savings = originalSize - compressedSize;

    return {
      originalSize,
      compressedSize,
      savings,
      savingsPercent: (savings / originalSize) * 100
    };
  }

  /**
   * Adaptive compression threshold based on cache pressure
   */
  getAdaptiveThreshold(
    contentType: keyof typeof this.defaultOptions,
    memoryPressure: number
  ): number {
    const baseThreshold = this.defaultOptions[contentType].threshold;

    // Lower threshold under memory pressure
    if (memoryPressure > 0.8) {
      return Math.round(baseThreshold * 0.5);
    } else if (memoryPressure > 0.6) {
      return Math.round(baseThreshold * 0.7);
    } else if (memoryPressure < 0.3) {
      return Math.round(baseThreshold * 1.5);
    }

    return baseThreshold;
  }
}

// Singleton instance
let compressionManager: CacheCompressionManager | null = null;

/**
 * Get singleton compression manager instance
 */
export function getCompressionManager(): CacheCompressionManager {
  if (!compressionManager) {
    compressionManager = new CacheCompressionManager();
  }
  return compressionManager;
}

/**
 * Utility function to estimate cache entry size
 */
export function estimateEntrySize(data: any): number {
  const serialized = typeof data === 'string' ? data : JSON.stringify(data);
  return Buffer.byteLength(serialized, 'utf8');
}

/**
 * Quick compression check without actual compression
 */
export function shouldCompress(
  data: any,
  contentType: keyof CacheCompressionManager['defaultOptions'] = 'json'
): boolean {
  const manager = getCompressionManager();
  const size = estimateEntrySize(data);
  const threshold = manager['defaultOptions'][contentType].threshold;

  return size >= threshold;
}