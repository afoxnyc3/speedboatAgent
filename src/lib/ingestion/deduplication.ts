/**
 * Content Deduplication Pipeline
 * SHA-256 based deduplication with source priority weighting
 */

import { createHash } from 'crypto';
import { z } from 'zod';
import { createWeaviateClient } from '../weaviate/client';
import { createDocumentHash } from '../search/search-utils';
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
  readonly canonicalDocument: Document;
  readonly duplicates: readonly Document[];
  readonly reason: 'exact_hash' | 'content_similarity' | 'url_similarity';
  readonly confidence: number;
}

export interface DeduplicationResult {
  readonly processed: number;
  readonly duplicatesFound: number;
  readonly duplicateGroups: readonly DuplicateGroup[];
  readonly canonicalDocuments: readonly Document[];
  readonly skippedDocuments: readonly Document[];
  readonly processingTime: number;
}

// Content similarity calculation interface
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
 * Content deduplication service
 */
class ContentDeduplicator {
  private readonly config: DeduplicationConfig;
  private readonly contentHashes: Map<string, Document>;
  private readonly urlHashes: Map<string, Document>;

  constructor(config: Partial<DeduplicationConfig> = {}) {
    this.config = { ...DEFAULT_DEDUP_CONFIG, ...config };
    this.contentHashes = new Map();
    this.urlHashes = new Map();
  }

  /**
   * Creates content hash using configured algorithm
   */
  private createContentHash(content: string): string {
    const normalizedContent = content.trim().toLowerCase();
    return createHash(this.config.hashAlgorithm)
      .update(normalizedContent)
      .digest('hex');
  }

  /**
   * Creates URL-based hash for web content
   */
  private createUrlHash(url: string): string {
    if (!url) return '';

    const normalizedUrl = url
      .toLowerCase()
      .replace(/\/$/, '') // Remove trailing slash
      .replace(/[?#].*$/, '') // Remove query params and fragments
      .replace(/\/index\.(html?|php)$/, ''); // Remove index files

    return createHash(this.config.hashAlgorithm)
      .update(normalizedUrl)
      .digest('hex');
  }

  /**
   * Calculates Jaccard similarity between two sets of words
   */
  private calculateJaccard(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Calculates cosine similarity using simple word frequency
   */
  private calculateCosine(text1: string, text2: string): number {
    const getWordFreq = (text: string) => {
      const words = text.toLowerCase().split(/\s+/);
      const freq: Record<string, number> = {};
      words.forEach(word => {
        freq[word] = (freq[word] || 0) + 1;
      });
      return freq;
    };

    const freq1 = getWordFreq(text1);
    const freq2 = getWordFreq(text2);
    const allWords = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const word of allWords) {
      const f1 = freq1[word] || 0;
      const f2 = freq2[word] || 0;
      dotProduct += f1 * f2;
      norm1 += f1 * f1;
      norm2 += f2 * f2;
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Calculates normalized Levenshtein distance (similarity)
   */
  private calculateLevenshtein(text1: string, text2: string): number {
    const maxLength = Math.max(text1.length, text2.length);
    if (maxLength === 0) return 1.0;

    const distance = this.levenshteinDistance(text1, text2);
    return 1 - (distance / maxLength);
  }

  /**
   * Computes Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculates comprehensive content similarity
   */
  private calculateContentSimilarity(doc1: Document, doc2: Document): ContentSimilarity {
    const jaccard = this.calculateJaccard(doc1.content, doc2.content);
    const cosine = this.calculateCosine(doc1.content, doc2.content);
    const levenshtein = this.calculateLevenshtein(doc1.content, doc2.content);

    // Combined similarity with weighted average
    const combined = (jaccard * 0.4) + (cosine * 0.4) + (levenshtein * 0.2);

    return { jaccard, cosine, levenshtein, combined };
  }

  /**
   * Determines winning document based on source priority
   */
  private selectCanonicalDocument(documents: Document[]): Document {
    if (documents.length === 1) return documents[0];

    // Sort by source priority, then by metadata quality
    return documents.sort((a, b) => {
      const aPriority = this.config.sourceWinners.indexOf(a.source);
      const bPriority = this.config.sourceWinners.indexOf(b.source);

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // If same source priority, prefer newer or larger content
      const aScore = a.priority * a.content.length * (a.metadata.lastModified?.getTime() || 0);
      const bScore = b.priority * b.content.length * (b.metadata.lastModified?.getTime() || 0);

      return bScore - aScore; // Descending
    })[0];
  }

  /**
   * Groups documents by exact content hash
   */
  private groupByExactHash(documents: Document[]): Map<string, Document[]> {
    const groups = new Map<string, Document[]>();

    for (const doc of documents) {
      if (doc.content.length < this.config.contentThreshold) {
        continue;
      }

      const hash = this.createContentHash(doc.content);
      if (!groups.has(hash)) {
        groups.set(hash, []);
      }
      groups.get(hash)!.push(doc);
    }

    return groups;
  }

  /**
   * Groups documents by URL similarity (for web content)
   */
  private groupByUrlSimilarity(documents: Document[]): Map<string, Document[]> {
    const groups = new Map<string, Document[]>();

    for (const doc of documents) {
      if (doc.source !== 'web' || !doc.metadata.url) {
        continue;
      }

      const hash = this.createUrlHash(doc.metadata.url);
      if (!groups.has(hash)) {
        groups.set(hash, []);
      }
      groups.get(hash)!.push(doc);
    }

    return groups;
  }

  /**
   * Finds near-duplicate documents using content similarity
   */
  private findNearDuplicates(
    documents: Document[],
    processedHashes: Set<string>
  ): DuplicateGroup[] {
    const duplicateGroups: DuplicateGroup[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < documents.length - 1; i++) {
      const doc1 = documents[i];
      const hash1 = this.createContentHash(doc1.content);

      if (processed.has(hash1) || processedHashes.has(hash1)) {
        continue;
      }

      const similarDocuments = [doc1];

      for (let j = i + 1; j < documents.length; j++) {
        const doc2 = documents[j];
        const hash2 = this.createContentHash(doc2.content);

        if (processed.has(hash2) || processedHashes.has(hash2)) {
          continue;
        }

        const similarity = this.calculateContentSimilarity(doc1, doc2);

        if (similarity.combined >= this.config.similarityThreshold) {
          similarDocuments.push(doc2);
          processed.add(hash2);
        }
      }

      if (similarDocuments.length > 1) {
        const canonical = this.selectCanonicalDocument(similarDocuments);
        const duplicates = similarDocuments.filter(doc => doc.id !== canonical.id);

        duplicateGroups.push({
          canonicalDocument: canonical,
          duplicates,
          reason: 'content_similarity',
          confidence: 0.9,
        });
      }

      processed.add(hash1);
    }

    return duplicateGroups;
  }

  /**
   * Main deduplication processing method
   */
  async deduplicate(documents: Document[]): Promise<DeduplicationResult> {
    const startTime = Date.now();
    const duplicateGroups: DuplicateGroup[] = [];
    const processedHashes = new Set<string>();
    let duplicatesFound = 0;

    // Step 1: Group by exact content hash
    const exactHashGroups = this.groupByExactHash(documents);

    for (const [hash, docs] of exactHashGroups) {
      if (docs.length > 1) {
        const canonical = this.selectCanonicalDocument(docs);
        const duplicates = docs.filter(doc => doc.id !== canonical.id);

        duplicateGroups.push({
          canonicalDocument: canonical,
          duplicates,
          reason: 'exact_hash',
          confidence: 1.0,
        });

        duplicatesFound += duplicates.length;
        processedHashes.add(hash);
      }
    }

    // Step 2: Group by URL similarity (web content only)
    const urlGroups = this.groupByUrlSimilarity(documents);

    for (const [hash, docs] of urlGroups) {
      if (docs.length > 1) {
        const contentHashes = docs.map(doc => this.createContentHash(doc.content));
        const uniqueContentHashes = new Set(contentHashes);

        if (uniqueContentHashes.size < docs.length) {
          const canonical = this.selectCanonicalDocument(docs);
          const duplicates = docs.filter(doc => doc.id !== canonical.id);

          duplicateGroups.push({
            canonicalDocument: canonical,
            duplicates,
            reason: 'url_similarity',
            confidence: 0.85,
          });

          duplicatesFound += duplicates.length;
          processedHashes.add(hash);
        }
      }
    }

    // Step 3: Find near-duplicates using content similarity
    const remainingDocs = documents.filter(doc => {
      const hash = this.createContentHash(doc.content);
      return !processedHashes.has(hash) && doc.content.length >= this.config.contentThreshold;
    });

    const nearDuplicateGroups = this.findNearDuplicates(remainingDocs, processedHashes);
    duplicateGroups.push(...nearDuplicateGroups);
    duplicatesFound += nearDuplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0);

    // Build final results
    const allDuplicateIds = new Set(
      duplicateGroups.flatMap(group => group.duplicates.map(doc => doc.id))
    );

    const canonicalDocuments = documents.filter(doc => !allDuplicateIds.has(doc.id));
    const skippedDocuments = documents.filter(doc =>
      doc.content.length < this.config.contentThreshold
    );

    const processingTime = Date.now() - startTime;

    return {
      processed: documents.length,
      duplicatesFound,
      duplicateGroups,
      canonicalDocuments,
      skippedDocuments,
      processingTime,
    };
  }

  /**
   * Checks if document exists in Weaviate by content hash
   */
  async checkExistingDocument(document: Document): Promise<Document | null> {
    const client = createWeaviateClient();
    const contentHash = this.createContentHash(document.content);

    try {
      const query = client.graphql
        .get()
        .withClassName('Document')
        .withFields('id source filepath lastModified')
        .withWhere({
          operator: 'Equal',
          path: ['metadata', 'checksum'],
          valueString: contentHash,
        })
        .withLimit(1);

      const result = await query.do();

      if (result?.data?.Get?.Document?.length > 0) {
        const existingDoc = result.data.Get.Document[0];
        return {
          ...document,
          id: existingDoc.id,
          metadata: {
            ...document.metadata,
            checksum: contentHash,
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
  async batchDeduplicate(documents: Document[]): Promise<DeduplicationResult> {
    if (documents.length <= this.config.batchSize) {
      return this.deduplicate(documents);
    }

    const allResults: DeduplicationResult[] = [];

    for (let i = 0; i < documents.length; i += this.config.batchSize) {
      const batch = documents.slice(i, i + this.config.batchSize);
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
let deduplicatorInstance: ContentDeduplicator | null = null;

/**
 * Gets or creates content deduplicator singleton
 */
export function getContentDeduplicator(
  config?: Partial<DeduplicationConfig>
): ContentDeduplicator {
  if (!deduplicatorInstance) {
    deduplicatorInstance = new ContentDeduplicator(config);
  }
  return deduplicatorInstance;
}

/**
 * Convenience function for deduplicating document arrays
 */
export async function deduplicateDocuments(
  documents: Document[],
  config?: Partial<DeduplicationConfig>
): Promise<DeduplicationResult> {
  const deduplicator = getContentDeduplicator(config);
  return deduplicator.batchDeduplicate(documents);
}

/**
 * Convenience function for checking document existence
 */
export async function checkDocumentExists(
  document: Document,
  config?: Partial<DeduplicationConfig>
): Promise<Document | null> {
  const deduplicator = getContentDeduplicator(config);
  return deduplicator.checkExistingDocument(document);
}

export type { ContentDeduplicator };