/**
 * Search Query Utilities
 * Functions for processing and analyzing search queries
 */

import type {
  ProcessedQuery,
  SearchFilters
} from '../../types/search';
import type { QueryType } from '../../types/query-classification';

/**
 * Processes raw query into structured format
 */
export function processQuery(
  originalQuery: string,
  queryType?: QueryType,
  filters?: SearchFilters
): ProcessedQuery {
  const processed = originalQuery.trim().toLowerCase();
  const tokens = processed.split(/\s+/);

  return {
    original: originalQuery,
    processed,
    tokens,
    queryType,
    entities: [],
    filters
  };
}

/**
 * Extract entities from query (simple implementation)
 */
export function extractQueryEntities(query: string): Array<{
  text: string;
  type: 'function' | 'class' | 'file' | 'variable' | 'technology' | 'concept';
  confidence: number;
}> {
  const entities: Array<{
    text: string;
    type: 'function' | 'class' | 'file' | 'variable' | 'technology' | 'concept';
    confidence: number;
  }> = [];

  // Technology patterns
  const techPatterns = {
    technology: [
      /\b(react|vue|angular|typescript|javascript|python|java|go|rust|node|express|fastapi|django)\b/gi,
      /\b(redis|postgresql|mysql|mongodb|elasticsearch|weaviate|openai|gpt|claude)\b/gi,
      /\b(docker|kubernetes|aws|azure|gcp|vercel|netlify|github)\b/gi
    ],
    function: [
      /\b\w+\(\)/g, // functionName()
      /\bfunction\s+\w+/gi,
      /\bconst\s+\w+\s*=/gi,
      /\blet\s+\w+\s*=/gi
    ],
    class: [
      /\bclass\s+\w+/gi,
      /\b[A-Z]\w*(?:Component|Service|Manager|Handler|Controller)\b/g
    ],
    file: [
      /\b\w+\.(ts|tsx|js|jsx|py|java|go|rs|md|json|yaml|yml)\b/gi,
      /\b[a-z-]+\.config\.(ts|js)\b/gi
    ]
  };

  Object.entries(techPatterns).forEach(([type, patterns]) => {
    patterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        matches.forEach(match => {
          entities.push({
            text: match.trim(),
            type: type as any,
            confidence: 0.8
          });
        });
      }
    });
  });

  // Remove duplicates and sort by confidence
  const uniqueEntities = entities.filter((entity, index, self) =>
    index === self.findIndex(e => e.text === entity.text && e.type === entity.type)
  );

  return uniqueEntities.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Analyze query intent and complexity
 */
export function analyzeQueryIntent(query: string): {
  intent: 'search' | 'question' | 'command' | 'definition' | 'example' | 'troubleshooting';
  complexity: 'simple' | 'moderate' | 'complex';
  confidence: number;
  indicators: string[];
} {
  const lowerQuery = query.toLowerCase();
  const indicators: string[] = [];

  // Intent patterns
  let intent: 'search' | 'question' | 'command' | 'definition' | 'example' | 'troubleshooting' = 'search';
  let confidence = 0.5;

  if (/^(what|how|why|when|where|who)\s/i.test(query)) {
    intent = 'question';
    confidence = 0.9;
    indicators.push('question word');
  } else if (/\b(show|find|get|list|display)\s/i.test(query)) {
    intent = 'command';
    confidence = 0.8;
    indicators.push('command verb');
  } else if (/\b(what is|define|definition|meaning of)\s/i.test(query)) {
    intent = 'definition';
    confidence = 0.9;
    indicators.push('definition request');
  } else if (/\b(example|sample|demo|tutorial|guide)\s/i.test(query)) {
    intent = 'example';
    confidence = 0.8;
    indicators.push('example request');
  } else if (/\b(error|bug|issue|problem|fix|solve|debug)\s/i.test(query)) {
    intent = 'troubleshooting';
    confidence = 0.8;
    indicators.push('problem indicator');
  }

  // Complexity analysis
  const tokens = query.split(/\s+/);
  const hasMultipleConcepts = tokens.length > 6;
  const hasComplexTerms = /\b(integration|architecture|implementation|configuration|optimization)\b/i.test(query);
  const hasMultipleQuestions = query.includes('?') && query.split('?').length > 2;

  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
  if (hasMultipleQuestions || (hasMultipleConcepts && hasComplexTerms)) {
    complexity = 'complex';
    indicators.push('multiple concepts');
  } else if (hasMultipleConcepts || hasComplexTerms) {
    complexity = 'moderate';
    indicators.push('moderate complexity');
  }

  return {
    intent,
    complexity,
    confidence,
    indicators
  };
}

/**
 * Generate query variations for improved search coverage
 */
export function generateQueryVariations(originalQuery: string): string[] {
  const variations: string[] = [originalQuery];
  const tokens = originalQuery.toLowerCase().split(/\s+/);

  // Synonym replacements
  const synonyms: Record<string, string[]> = {
    'function': ['method', 'procedure', 'routine'],
    'class': ['component', 'object', 'type'],
    'error': ['bug', 'issue', 'problem', 'exception'],
    'fix': ['solve', 'resolve', 'repair'],
    'create': ['make', 'build', 'generate'],
    'delete': ['remove', 'destroy', 'eliminate'],
    'update': ['modify', 'change', 'edit'],
    'get': ['fetch', 'retrieve', 'obtain'],
    'set': ['assign', 'configure', 'establish'],
    'handle': ['process', 'manage', 'deal with']
  };

  // Generate variations with synonyms
  tokens.forEach((token, index) => {
    if (synonyms[token]) {
      synonyms[token].forEach(synonym => {
        const newTokens = [...tokens];
        newTokens[index] = synonym;
        variations.push(newTokens.join(' '));
      });
    }
  });

  // Generate partial queries (remove less important words)
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'how', 'what', 'why', 'when', 'where'];
  const importantTokens = tokens.filter(token => !stopWords.includes(token) && token.length > 2);

  if (importantTokens.length > 1 && importantTokens.length < tokens.length) {
    variations.push(importantTokens.join(' '));
  }

  // Generate expanded queries with common technical suffixes
  const technicalSuffixes = ['api', 'sdk', 'library', 'framework', 'tutorial', 'documentation', 'guide'];
  if (tokens.length <= 3) {
    technicalSuffixes.forEach(suffix => {
      if (!originalQuery.toLowerCase().includes(suffix)) {
        variations.push(`${originalQuery} ${suffix}`);
      }
    });
  }

  // Remove duplicates and empty variations
  return Array.from(new Set(variations.filter(v => v.trim().length > 0)));
}

/**
 * Validate query for potential issues
 */
export function validateQuery(query: string): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
  score: number;
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 1.0;

  // Length checks
  if (query.length < 3) {
    issues.push('Query too short');
    suggestions.push('Try adding more descriptive words');
    score -= 0.5;
  } else if (query.length > 200) {
    issues.push('Query too long');
    suggestions.push('Try to be more concise and specific');
    score -= 0.2;
  }

  // Character checks
  if (/[^\w\s\-_.,?!()]/g.test(query)) {
    issues.push('Contains special characters that might affect search');
    suggestions.push('Consider removing special characters');
    score -= 0.1;
  }

  // Repetition checks
  const tokens = query.toLowerCase().split(/\s+/);
  const uniqueTokens = new Set(tokens);
  if (tokens.length > uniqueTokens.size * 1.5) {
    issues.push('Contains repetitive words');
    suggestions.push('Remove duplicate words for better results');
    score -= 0.2;
  }

  // Empty or meaningless query checks
  const meaningfulTokens = tokens.filter(token =>
    token.length > 2 &&
    !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all'].includes(token)
  );

  if (meaningfulTokens.length === 0) {
    issues.push('Query lacks meaningful content');
    suggestions.push('Add specific technical terms or concepts');
    score -= 0.7;
  }

  // Provide positive feedback for good queries
  if (issues.length === 0) {
    suggestions.push('Query looks good for search');
  }

  return {
    isValid: score >= 0.3,
    issues,
    suggestions,
    score: Math.max(0, score)
  };
}

/**
 * Normalize query for consistent processing
 */
export function normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/[^\w\s\-_.]/g, '') // Remove special characters except common ones
    .replace(/\b(how to|how do i|can you|please)\b/gi, '') // Remove common question prefixes
    .trim();
}