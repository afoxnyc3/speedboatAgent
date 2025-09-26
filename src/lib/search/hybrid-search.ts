/**
 * Hybrid Search Core Implementation
 * Production-ready Weaviate search with source weighting
 */

import { randomUUID } from 'crypto';
import { createWeaviateClient } from '../weaviate/client';
import {
  Document,
  DocumentSource,
  DocumentLanguage,
  createDocumentId,
  DEFAULT_SEARCH_CONFIG,
  type SearchConfig
} from '../../types/search';
import { createDocumentHash } from './search-utils';

export interface HybridSearchParams {
  readonly query: string;
  readonly config: typeof DEFAULT_SEARCH_CONFIG;
  readonly sourceWeights: { github: number; web: number };
  readonly limit: number;
  readonly offset: number;
}

export interface HybridSearchResult {
  readonly documents: Document[];
  readonly totalResults: number;
  readonly searchTime: number;
}

/**
 * Builds Weaviate hybrid query with proper field selection
 */
function buildHybridQuery(
  client: ReturnType<typeof createWeaviateClient>,
  params: HybridSearchParams
) {
  return client.graphql
    .get()
    .withClassName('Document')
    .withFields('content source filepath url language priority lastModified isCode isDocumentation fileType size _additional { score id }')
    .withHybrid({
      query: params.query,
      alpha: params.config.hybridWeights.vector,
      properties: ['content', 'filepath'],
      fusionType: 'relativeScoreFusion' as any
    })
    .withLimit(params.limit + params.offset)
    .withOffset(params.offset);
}

/**
 * Creates document metadata from flattened schema properties
 */
function createDocumentMetadata(doc: any, content: string) {
  return {
    size: doc.size || 0,
    wordCount: content.split(/\s+/).length,
    lines: content.split('\n').length,
    encoding: 'utf-8',
    mimeType: 'text/plain',
    tags: [],
    author: undefined,
    lastModified: doc.lastModified ? new Date(doc.lastModified) : new Date(),
    created: doc.lastModified ? new Date(doc.lastModified) : new Date(),
    version: undefined,
    branch: undefined,
    commit: undefined,
    url: doc.url,
    checksum: createDocumentHash(content)
  };
}

/**
 * Processes raw Weaviate document result into typed Document
 */
function processDocumentResult(
  doc: any,
  sourceWeights: { github: number; web: number }
): Document {
  const sourceWeight = sourceWeights[doc.source as DocumentSource] || 1.0;
  const priorityScore = doc.priority || 1.0;
  const baseScore = doc._additional?.score || 0;
  const finalScore = Math.min(baseScore * sourceWeight * priorityScore, 1.0);

  return {
    id: createDocumentId(doc._additional?.id || randomUUID()),
    content: doc.content || '',
    filepath: doc.filepath || '',
    language: (doc.language || 'other') as DocumentLanguage,
    source: (doc.source || 'local') as DocumentSource,
    score: finalScore,
    priority: priorityScore,
    metadata: createDocumentMetadata(doc, doc.content || '')
  };
}

/**
 * Performs hybrid search against Weaviate with source weighting
 */
export async function performHybridSearch(
  params: HybridSearchParams
): Promise<HybridSearchResult> {
  const startTime = Date.now();
  const client = createWeaviateClient();

  const hybridQuery = buildHybridQuery(client, params);
  const result = await hybridQuery.do();
  const searchTime = Date.now() - startTime;

  if (!result?.data?.Get?.Document) {
    return { documents: [], totalResults: 0, searchTime };
  }

  const documents = result.data.Get.Document
    .map((doc: any) => processDocumentResult(doc, params.sourceWeights))
    .filter((doc) => doc.score >= params.config.minScore)
    .sort((a, b) => b.score - a.score);

  return {
    documents,
    totalResults: documents.length,
    searchTime
  };
}

/**
 * Tests Weaviate connection health
 */
export async function testWeaviateConnection(): Promise<void> {
  const client = createWeaviateClient();
  await client.misc.metaGetter().do();
}