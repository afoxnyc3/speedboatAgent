/**
 * Search Response Utilities
 * Functions for formatting and processing search responses
 */

import type { Document } from '../../types/search';

/**
 * Filters documents based on include content flag
 */
export function filterDocumentContent(
  documents: Document[],
  includeContent: boolean,
  includeEmbedding: boolean
): Document[] {
  return documents.map(doc => ({
    ...doc,
    content: includeContent ? doc.content : '',
    embedding: includeEmbedding ? doc.embedding : undefined
  }));
}

/**
 * Creates performance headers for search response
 */
export function createPerformanceHeaders(
  queryId: string,
  searchTime: number,
  totalTime: number,
  cacheHit: boolean,
  totalResults: number
): Headers {
  return new Headers({
    'X-Query-ID': queryId,
    'X-Search-Time-Ms': searchTime.toString(),
    'X-Total-Time-Ms': totalTime.toString(),
    'X-Cache-Hit': cacheHit.toString(),
    'X-Results-Count': totalResults.toString()
  });
}

/**
 * Format search results with metadata for API responses
 */
export function formatSearchResponse<T extends Document>(
  documents: T[],
  metadata: {
    queryId: string;
    searchTime: number;
    totalResults: number;
    cacheHit: boolean;
  },
  options: {
    includeContent?: boolean;
    includeEmbedding?: boolean;
    maxResults?: number;
  } = {}
): {
  documents: T[];
  metadata: typeof metadata;
  headers: Headers;
} {
  const {
    includeContent = true,
    includeEmbedding = false,
    maxResults
  } = options;

  let processedDocuments = filterDocumentContent(
    documents,
    includeContent,
    includeEmbedding
  ) as T[];

  if (maxResults && maxResults > 0) {
    processedDocuments = processedDocuments.slice(0, maxResults);
  }

  const headers = createPerformanceHeaders(
    metadata.queryId,
    metadata.searchTime,
    metadata.searchTime, // Use searchTime as total time if not provided separately
    metadata.cacheHit,
    metadata.totalResults
  );

  return {
    documents: processedDocuments,
    metadata,
    headers
  };
}

/**
 * Create streaming response helper for search results
 */
export function createStreamingSearchResponse(
  documents: Document[],
  onDocument?: (doc: Document, index: number) => void,
  onComplete?: (totalCount: number) => void
): AsyncIterable<Document> {
  return {
    async *[Symbol.asyncIterator]() {
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        onDocument?.(doc, i);
        yield doc;
      }
      onComplete?.(documents.length);
    }
  };
}

/**
 * Calculate response size estimation for performance monitoring
 */
export function estimateResponseSize(
  documents: Document[],
  includeContent: boolean = true,
  includeEmbedding: boolean = false
): {
  totalSizeBytes: number;
  averageSizeBytes: number;
  contentSizeBytes: number;
  metadataSizeBytes: number;
} {
  let totalSize = 0;
  let contentSize = 0;
  let metadataSize = 0;

  documents.forEach(doc => {
    // Estimate content size
    if (includeContent && doc.content) {
      const contentBytes = new TextEncoder().encode(doc.content).length;
      contentSize += contentBytes;
      totalSize += contentBytes;
    }

    // Estimate metadata size (JSON serialized)
    const metadataStr = JSON.stringify({
      id: doc.id,
      filepath: doc.filepath,
      url: doc.metadata.url,
      source: doc.source,
      language: doc.language,
      score: doc.score,
      metadata: doc.metadata
    });
    const metadataBytes = new TextEncoder().encode(metadataStr).length;
    metadataSize += metadataBytes;
    totalSize += metadataBytes;

    // Estimate embedding size if included
    if (includeEmbedding && doc.embedding) {
      // Typical embedding is array of floats, estimate 8 bytes per float
      totalSize += doc.embedding.length * 8;
    }
  });

  return {
    totalSizeBytes: totalSize,
    averageSizeBytes: documents.length > 0 ? totalSize / documents.length : 0,
    contentSizeBytes: contentSize,
    metadataSizeBytes: metadataSize
  };
}