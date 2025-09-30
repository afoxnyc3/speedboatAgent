/**
 * Crypto Mock
 * Provides test doubles for crypto functions
 */

export const randomUUID = jest.fn().mockReturnValue('test-uuid-123');

// Mock createHash for hash generation (used by query classifier and deduplication)
export const createHash = jest.fn().mockReturnValue({
  update: jest.fn().mockReturnThis(),
  digest: jest.fn().mockReturnValue('mock-hash-digest')
});