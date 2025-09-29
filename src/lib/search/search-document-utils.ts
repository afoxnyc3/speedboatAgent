/**
 * Search Document Utilities
 * Functions for document processing, hashing, and content analysis
 */

import { createHash } from 'crypto';
import type {
  Document,
  DocumentSource,
  DocumentLanguage
} from '../../types/search';

/**
 * Creates MD5 hash for document content deduplication
 */
export function createDocumentHash(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

/**
 * Generates search suggestions based on document content
 */
export function generateSearchSuggestions(
  query: string,
  documents: Document[]
): string[] {
  const topDocs = documents.slice(0, 3);
  const keywords = new Set<string>();

  topDocs.forEach(doc => {
    const words = doc.content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    words.slice(0, 5).forEach(word => keywords.add(word));
  });

  return Array.from(keywords)
    .slice(0, 3)
    .filter(keyword => !query.toLowerCase().includes(keyword))
    .map(keyword => `${query} ${keyword}`);
}

/**
 * Counts documents by source type
 */
export function countDocumentsBySource(
  documents: Document[]
): Record<DocumentSource, number> {
  return documents.reduce(
    (counts, doc) => {
      counts[doc.source]++;
      return counts;
    },
    { github: 0, web: 0, local: 0 } as Record<DocumentSource, number>
  );
}

/**
 * Counts documents by language type
 */
export function countDocumentsByLanguage(
  documents: Document[]
): Record<DocumentLanguage, number> {
  return documents.reduce(
    (counts, doc) => {
      counts[doc.language]++;
      return counts;
    },
    {
      typescript: 0, javascript: 0, markdown: 0, json: 0,
      yaml: 0, text: 0, python: 0, other: 0
    } as Record<DocumentLanguage, number>
  );
}

/**
 * Calculates min and max scores from document array
 */
export function calculateScoreRange(documents: Document[]): {
  maxScore: number;
  minScore: number;
} {
  if (documents.length === 0) {
    return { maxScore: 0, minScore: 0 };
  }

  const scores = documents.map(d => d.score);
  return {
    maxScore: Math.max(...scores),
    minScore: Math.min(...scores)
  };
}

/**
 * Extract keywords from document content for analysis
 */
export function extractKeywords(content: string, maxKeywords: number = 10): string[] {
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3)
    .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word));

  const wordFreq = words.reduce((freq, word) => {
    freq[word] = (freq[word] || 0) + 1;
    return freq;
  }, {} as Record<string, number>);

  return Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Calculate document similarity score based on content overlap
 */
export function calculateDocumentSimilarity(doc1: Document, doc2: Document): number {
  const keywords1 = new Set(extractKeywords(doc1.content, 20));
  const keywords2 = new Set(extractKeywords(doc2.content, 20));

  const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
  const union = new Set([...keywords1, ...keywords2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Group documents by similarity threshold
 */
export function groupDocumentsBySimilarity(
  documents: Document[],
  threshold: number = 0.3
): Document[][] {
  const groups: Document[][] = [];
  const processed = new Set<string>();

  for (const doc of documents) {
    if (processed.has(doc.id)) continue;

    const group = [doc];
    processed.add(doc.id);

    for (const otherDoc of documents) {
      if (processed.has(otherDoc.id)) continue;

      const similarity = calculateDocumentSimilarity(doc, otherDoc);
      if (similarity >= threshold) {
        group.push(otherDoc);
        processed.add(otherDoc.id);
      }
    }

    groups.push(group);
  }

  return groups;
}