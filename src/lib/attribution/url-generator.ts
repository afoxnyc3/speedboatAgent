/**
 * URL Generator for Source Attribution
 * Creates deep links to source files with line number anchors
 */

import type { GitHubMetadata, SourceLocation } from '../../types/source-attribution';

/**
 * Generates GitHub URL with line number anchors
 */
export function generateGitHubUrl(
  metadata: GitHubMetadata,
  location: SourceLocation
): string {
  const { owner, repo, branch, commit } = metadata;
  const ref = commit || branch;
  const path = location.filepath.replace(/^\//, '');

  const baseUrl = `https://github.com/${owner}/${repo}/blob/${ref}/${path}`;

  if (location.startLine === location.endLine) {
    return `${baseUrl}#L${location.startLine}`;
  }

  return `${baseUrl}#L${location.startLine}-L${location.endLine}`;
}

/**
 * Generates GitHub permalink using commit SHA
 */
export function generateGitHubPermalink(
  metadata: GitHubMetadata,
  location: SourceLocation
): string {
  if (!metadata.commit) {
    return generateGitHubUrl(metadata, location);
  }

  const { owner, repo, commit } = metadata;
  const path = location.filepath.replace(/^\//, '');

  const baseUrl = `https://github.com/${owner}/${repo}/blob/${commit}/${path}`;

  if (location.startLine === location.endLine) {
    return `${baseUrl}#L${location.startLine}`;
  }

  return `${baseUrl}#L${location.startLine}-L${location.endLine}`;
}

/**
 * Generates GitHub raw content URL
 */
export function generateGitHubRawUrl(
  metadata: GitHubMetadata,
  filepath: string
): string {
  const { owner, repo, branch, commit } = metadata;
  const ref = commit || branch;
  const path = filepath.replace(/^\//, '');

  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
}

/**
 * Generates GitHub edit URL
 */
export function generateGitHubEditUrl(
  metadata: GitHubMetadata,
  filepath: string
): string {
  const { owner, repo, branch } = metadata;
  const path = filepath.replace(/^\//, '');

  return `https://github.com/${owner}/${repo}/edit/${branch}/${path}`;
}

/**
 * Extracts GitHub metadata from repository URL
 */
export function extractGitHubMetadata(
  repoUrl: string,
  branch: string = 'main',
  commit?: string
): GitHubMetadata | null {
  const githubRegex = /github\.com[\/:]([^\/]+)\/([^\/\.]+)/;
  const match = repoUrl.match(githubRegex);

  if (!match) {
    return null;
  }

  const [, owner, repo] = match;

  return {
    owner,
    repo: repo.replace(/\.git$/, ''),
    branch,
    commit,
    permalink: '',
    editUrl: '',
    rawUrl: '',
  };
}

/**
 * Formats line reference for display
 */
export function formatLineReference(location: SourceLocation): string {
  if (location.startLine === location.endLine) {
    return `L${location.startLine}`;
  }

  return `L${location.startLine}-${location.endLine}`;
}

/**
 * Creates a shortened path for display
 */
export function shortenPath(filepath: string, maxLength: number = 50): string {
  if (filepath.length <= maxLength) {
    return filepath;
  }

  const parts = filepath.split('/');
  if (parts.length <= 2) {
    return `...${filepath.slice(-maxLength + 3)}`;
  }

  const filename = parts[parts.length - 1];
  const parentDir = parts[parts.length - 2];

  if (`${parentDir}/${filename}`.length <= maxLength) {
    return `.../${parentDir}/${filename}`;
  }

  return `.../${filename}`;
}

/**
 * Determines file type from path
 */
export function getFileType(filepath: string): 'code' | 'doc' | 'config' | 'test' {
  const lowercasePath = filepath.toLowerCase();

  if (lowercasePath.includes('.test.') || lowercasePath.includes('.spec.')) {
    return 'test';
  }

  if (lowercasePath.endsWith('.md') || lowercasePath.endsWith('.mdx')) {
    return 'doc';
  }

  if (
    lowercasePath.endsWith('.json') ||
    lowercasePath.endsWith('.yaml') ||
    lowercasePath.endsWith('.yml') ||
    lowercasePath.endsWith('.toml') ||
    lowercasePath.endsWith('.env')
  ) {
    return 'config';
  }

  return 'code';
}