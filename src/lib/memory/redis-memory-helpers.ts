/**
 * Redis Memory Helper Functions
 * Extracted from redis-memory-client.ts to reduce file size
 */

import type { MemoryItem } from '../../types/memory';

export function extractTopics(memories: readonly MemoryItem[]): string[] {
  // Simple topic extraction - in production, use NLP
  const topics = new Set<string>();

  for (const memory of memories) {
    const words = memory.content.toLowerCase().split(/\s+/);
    // Extract potential topics (words longer than 5 chars)
    words.filter(w => w.length > 5).forEach(w => topics.add(w));
  }

  return Array.from(topics).slice(0, 10);
}

export function extractPreferences(memories: readonly MemoryItem[]): Record<string, unknown> {
  const preferences: Record<string, unknown> = {};

  for (const memory of memories) {
    if (memory.category === 'preference' && memory.metadata) {
      Object.assign(preferences, memory.metadata);
    }
  }

  return preferences;
}

export function determineStage(memories: readonly MemoryItem[]): 'initial' | 'exploring' | 'deep' {
  if (memories.length < 3) return 'initial';
  if (memories.length < 10) return 'exploring';
  return 'deep';
}

