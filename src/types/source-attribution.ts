/**
 * Source Attribution Types
 * Enhanced types for tracking document sources with line-level precision
 */

import { z } from 'zod';
import type { DocumentSource } from './search';

// Source location with line-level precision
export interface SourceLocation {
  readonly filepath: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly startColumn?: number;
  readonly endColumn?: number;
  readonly snippet?: string;
}

// GitHub-specific metadata
export interface GitHubMetadata {
  readonly owner: string;
  readonly repo: string;
  readonly branch: string;
  readonly commit?: string;
  readonly permalink: string;
  readonly editUrl: string;
  readonly rawUrl: string;
}

// Web source metadata
export interface WebSourceMetadata {
  readonly domain: string;
  readonly crawledAt: Date;
  readonly lastModified?: Date;
  readonly canonicalUrl?: string;
  readonly title?: string;
  readonly description?: string;
}

// Enhanced source attribution
export interface SourceAttribution {
  readonly id: string;
  readonly source: DocumentSource;
  readonly location: SourceLocation;
  readonly authority: SourceAuthority;
  readonly metadata: GitHubMetadata | WebSourceMetadata;
  readonly relevanceScore: number;
  readonly confidence: number;
  readonly extractedAt: Date;
}

// Source authority levels
export type SourceAuthority = 'primary' | 'authoritative' | 'supplementary' | 'community';

// Authority configuration
export interface AuthorityConfig {
  readonly github: {
    readonly codebase: SourceAuthority;
    readonly documentation: SourceAuthority;
    readonly tests: SourceAuthority;
  };
  readonly web: {
    readonly official: SourceAuthority;
    readonly thirdParty: SourceAuthority;
    readonly community: SourceAuthority;
  };
}

// Source attribution with content
export interface AttributedContent extends SourceAttribution {
  readonly content: string;
  readonly summary?: string;
  readonly keywords: readonly string[];
  readonly language?: string;
  readonly codeType?: 'function' | 'class' | 'interface' | 'variable' | 'import';
}

// Citation format for UI display
export interface FormattedCitation {
  readonly displayTitle: string;
  readonly displayPath: string;
  readonly url: string;
  readonly lineReference?: string;
  readonly icon: 'github' | 'web' | 'code' | 'doc';
  readonly authorityBadge: {
    readonly label: string;
    readonly color: string;
    readonly priority: number;
  };
  readonly preview?: string;
}

// Validation schemas
export const SourceLocationSchema = z.object({
  filepath: z.string(),
  startLine: z.number().positive(),
  endLine: z.number().positive(),
  startColumn: z.number().positive().optional(),
  endColumn: z.number().positive().optional(),
  snippet: z.string().optional(),
}).strict();

export const GitHubMetadataSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  branch: z.string(),
  commit: z.string().optional(),
  permalink: z.string().url(),
  editUrl: z.string().url(),
  rawUrl: z.string().url(),
}).strict();

export const WebSourceMetadataSchema = z.object({
  domain: z.string(),
  crawledAt: z.date(),
  lastModified: z.date().optional(),
  canonicalUrl: z.string().url().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
}).strict();

export const SourceAuthoritySchema = z.enum(['primary', 'authoritative', 'supplementary', 'community']);

// Default authority configuration
export const DEFAULT_AUTHORITY_CONFIG: AuthorityConfig = {
  github: {
    codebase: 'primary',
    documentation: 'authoritative',
    tests: 'authoritative',
  },
  web: {
    official: 'authoritative',
    thirdParty: 'supplementary',
    community: 'community',
  },
} as const;

// Authority weights for ranking
export const AUTHORITY_WEIGHTS: Record<SourceAuthority, number> = {
  primary: 1.5,
  authoritative: 1.2,
  supplementary: 0.8,
  community: 0.6,
} as const;

// Authority display configuration
export const AUTHORITY_DISPLAY: Record<SourceAuthority, { label: string; color: string }> = {
  primary: { label: 'Primary Source', color: 'green' },
  authoritative: { label: 'Authoritative', color: 'blue' },
  supplementary: { label: 'Supplementary', color: 'yellow' },
  community: { label: 'Community', color: 'gray' },
} as const;