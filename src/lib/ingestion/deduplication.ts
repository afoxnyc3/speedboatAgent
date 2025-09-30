/**
 * Content Deduplication Pipeline
 * Simplified SHA-256 based deduplication with source priority weighting
 * Based on mon.md recommendations for test compatibility
 */

import { createHash } from 'crypto';
import { z } from 'zod';
import { createWeaviateClient } from '../weaviate/client';
import type { Document, DocumentSource } from '../../types/search';

// Deduplication configuration
export interface DeduplicationConfig {
  readonly hashAlgorithm: 'sha256' | 'md5';
  readonly contentThreshold: number; // Minimum content length
  readonly similarityThreshold: number; // For near-duplicate detection
  readonly sourceWinners: readonly DocumentSource[]; // Priority order
  readonly preserveMetadata: boolean;
  readonly batchSize: number;
}

// Default deduplication configuration following CLAUDE.md
export const DEFAULT_DEDUP_CONFIG: DeduplicationConfig = {
  hashAlgorithm: 'sha256',
  contentThreshold: 100,
  similarityThreshold: 0.95,
  sourceWinners: ['github', 'web', 'local'], // GitHub takes precedence
  preserveMetadata: true,
  batchSize: 100,
} as const;

// Deduplication result interfaces
export interface DuplicateGroup {
  readonly hash: string;
  readonly reason: 'exact_hash' | 'content_similarity' | 'url_similarity';
  readonly canonicalDocument: Document;
  readonly duplicates: readonly Document[];
}

export interface DeduplicationResult {
  readonly processed: number;
  readonly duplicatesFound: number;
  readonly duplicateGroups: readonly DuplicateGroup[];
  readonly canonicalDocuments: readonly Document[];
  readonly skippedDocuments: readonly Document[];
  readonly processingTime: number;
}

// Content similarity calculation interface (kept for compatibility)
export interface ContentSimilarity {
  readonly jaccard: number;
  readonly cosine: number;
  readonly levenshtein: number;
  readonly combined: number;
}

// Validation schemas
export const DeduplicationConfigSchema = z.object({
  hashAlgorithm: z.enum(['sha256', 'md5']),
  contentThreshold: z.number().positive(),
  similarityThreshold: z.number().min(0).max(1),
  sourceWinners: z.array(z.enum(['github', 'web', 'local'])),
  preserveMetadata: z.boolean(),
  batchSize: z.number().positive().max(1000),
}).strict();

export const DeduplicationRequestSchema = z.object({
  documents: z.array(z.any()).min(1),
  config: DeduplicationConfigSchema.optional(),
  forceReprocessing: z.boolean().default(false),
}).strict();

/**
 * Content deduplication service (simplified for test compatibility)
 */
export class ContentDeduplicator {
  private readonly config: Required<DeduplicationConfig>;

  constructor(config?: Partial<DeduplicationConfig>) {
    this.config = {
      hashAlgorithm: config?.hashAlgorithm ?? 'sha256',
      contentThreshold: config?.contentThreshold ?? 100,
      similarityThreshold: config?.similarityThreshold ?? 0.95,
      sourceWinners: config?.sourceWinners ?? ['github', 'web', 'local'],
      preserveMetadata: config?.preserveMetadata ?? true,
      batchSize: config?.batchSize ?? 100,
    };
  }

  /**
   * Canonicalize URL for consistent hashing
   */
  private canonicalizeUrl(raw?: string): string | undefined {
    if (!raw) return undefined;
    try {
      const u = new URL(raw);
      u.hash = '';
      return u.toString().replace(/\/$/, '');
    } catch {
      return raw.trim();
    }
  }

  /**
   * Creates content hash with normalized content and URL
   */
  private createContentHash(content: string, url?: string): string {
    const algo = this.config.hashAlgorithm;
    const h = createHash(algo);
    const normalized = content.trim().toLowerCase();
    h.update(normalized);
    const nurl = this.canonicalizeUrl(url);
    if (nurl) h.update(nurl);
    return h.digest('hex');
  }

  /**
   * Main deduplication method - groups documents by content hash
   */
  async deduplicate(docs: Document[]): Promise<DeduplicationResult> {
    const startTime = Date.now();
    const threshold = this.config.contentThreshold;
    const sourcePriority: Record<string, number> = {
      github: 3,
      web: 2,
      local: 1,
    };

    let processed = 0;
    let skippedDocuments = 0;
    let duplicatesFound = 0;
    const buckets = new Map<string, Document[]>();
    const skippedDocs: Document[] = [];

    // Group documents by content hash
    for (const d of docs) {
      processed += 1; // count examined items (pre-threshold)
      const text = d?.content?.trim() ?? '';
      if (text.length <= threshold) {
        skippedDocuments += 1;
        skippedDocs.push(d);
        continue;
      }
      const hash = this.createContentHash(d.content, d.metadata?.url);
      const arr = buckets.get(hash) ?? [];
      arr.push(d);
      buckets.set(hash, arr);
    }

    const duplicateGroups: DuplicateGroup[] = [];
    const canonicalDocuments: Document[] = [];

    // Process each hash bucket
    for (const [hash, list] of buckets) {
      if (list.length === 1) {
        canonicalDocuments.push(list[0]);
        continue;
      }

      // Select canonical: higher sourcePriority first, then newer lastModified
      const sorted = [...list].sort((a, b) => {
        const pa = sourcePriority[a.source] ?? 0;
        const pb = sourcePriority[b.source] ?? 0;
        if (pa !== pb) return pb - pa;
        const ta = a.metadata?.lastModified?.getTime?.() ?? 0;
        const tb = b.metadata?.lastModified?.getTime?.() ?? 0;
        return tb - ta;
      });

      const canonical = sorted[0];
      const dups = sorted.slice(1);

      duplicateGroups.push({
        hash,
        reason: 'exact_hash',
        canonicalDocument: canonical,
        duplicates: dups,
      });

      canonicalDocuments.push(canonical);
      duplicatesFound += dups.length; // count duplicate items, not groups
    }

    const processingTime = Date.now() - startTime;

    return {
      processed,
      duplicatesFound,
      skippedDocuments: skippedDocs,
      duplicateGroups,
      canonicalDocuments,
      processingTime,
    };
  }

  /**
   * Check if document exists in Weaviate by content hash
   */
  async checkExistingDocument(doc: Document): Promise<Document | null> {
    const checksum = this.createContentHash(doc.content, doc.metadata?.url);
    const client = createWeaviateClient();

    try {
      const result = await client.graphql
        .get()
        .withClassName('Document')
        .withFields('id source filepath lastModified')
        .withWhere({
          operator: 'Equal',
          path: ['metadata', 'checksum'],
          valueString: checksum,
        })
        .withLimit(1)
        .do();

      if (result?.data?.Get?.Document?.length > 0) {
        const existingDoc = result.data.Get.Document[0];
        return {
          ...doc,
          id: existingDoc.id,
          metadata: {
            ...doc.metadata,
            checksum,
          },
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking existing document:', error);
      return null;
    }
  }

  /**
   * Batch deduplication for large document sets
   */
  async batchDeduplicate(docs: Document[]): Promise<DeduplicationResult> {
    if (docs.length <= this.config.batchSize) {
      return this.deduplicate(docs);
    }

    const allResults: DeduplicationResult[] = [];

    for (let i = 0; i < docs.length; i += this.config.batchSize) {
      const batch = docs.slice(i, i + this.config.batchSize);
      const result = await this.deduplicate(batch);
      allResults.push(result);
    }

    // Merge batch results
    const mergedResult: DeduplicationResult = {
      processed: allResults.reduce((sum, result) => sum + result.processed, 0),
      duplicatesFound: allResults.reduce((sum, result) => sum + result.duplicatesFound, 0),
      duplicateGroups: allResults.flatMap(result => result.duplicateGroups),
      canonicalDocuments: allResults.flatMap(result => result.canonicalDocuments),
      skippedDocuments: allResults.flatMap(result => result.skippedDocuments),
      processingTime: allResults.reduce((sum, result) => sum + result.processingTime, 0),
    };

    return mergedResult;
  }
}

// Singleton instance
let _singleton: ContentDeduplicator | null = null;

/**
 * Gets or creates content deduplicator singleton
 */
export function getContentDeduplicator(
  cfg?: Partial<DeduplicationConfig>
): ContentDeduplicator {
  if (!_singleton) {
    _singleton = new ContentDeduplicator(cfg);
  }
  return _singleton;
}

/**
 * Convenience function for deduplicating document arrays
 */
export async function deduplicateDocuments(
  docs: Document[],
  cfg?: Partial<DeduplicationConfig>
): Promise<DeduplicationResult> {
  return getContentDeduplicator(cfg).batchDeduplicate(docs);
}

/**
 * Convenience function for checking document existence
 */
export async function checkDocumentExists(
  doc: Document,
  cfg?: Partial<DeduplicationConfig>
): Promise<Document | null> {
  return getContentDeduplicator(cfg).checkExistingDocument(doc);
}