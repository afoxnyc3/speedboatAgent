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
    .withFields([
      'content', 'source', 'filepath', 'language', 'priority', 'lastModified',
      'metadata { size wordCount lines encoding mimeType tags author created version branch commit url checksum }',
      '_additional { score id }'
    ])
    .withHybrid({
      query: params.query,
      alpha: params.config.hybridWeights.vector,
      properties: ['content', 'filepath'],
      fusionType: 'relativeScoreFusion'
    })
    .withLimit(params.limit + params.offset)
    .withOffset(params.offset)
    .withWhere({
      operator: 'GreaterThan',
      path: ['_additional', 'score'],
      valueNumber: params.config.minScore
    });
}

/**
 * Creates document metadata from raw data
 */
function createDocumentMetadata(rawMetadata: any, content: string) {
  return {
    size: rawMetadata?.size || 0,
    wordCount: rawMetadata?.wordCount || 0,
    lines: rawMetadata?.lines || 1,
    encoding: rawMetadata?.encoding || 'utf-8',
    mimeType: rawMetadata?.mimeType || 'text/plain',
    tags: rawMetadata?.tags || [],
    author: rawMetadata?.author,
    lastModified: rawMetadata?.lastModified ? new Date(rawMetadata.lastModified) : new Date(),
    created: rawMetadata?.created ? new Date(rawMetadata.created) : new Date(),
    version: rawMetadata?.version,
    branch: rawMetadata?.branch,
    commit: rawMetadata?.commit,
    url: rawMetadata?.url,
    checksum: rawMetadata?.checksum || createDocumentHash(content)
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
    metadata: createDocumentMetadata(doc.metadata, doc.content || '')
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