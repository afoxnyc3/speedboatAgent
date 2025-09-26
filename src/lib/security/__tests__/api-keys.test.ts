/**
 * API Keys Tests
 * Test API key management and validation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ApiKeyManager, validateApiKeyMiddleware, isApiKeyAuthEnabled } from '../api-keys';

describe('ApiKeyManager', () => {
  let apiKeyManager: ApiKeyManager;

  beforeEach(() => {
    // Set up test environment
    process.env.API_KEY = 'test_primary_key_12345678901234567890';
    process.env.API_KEY_1 = 'test_secondary_key_12345678901234567890';
    process.env.NODE_ENV = 'test';

    apiKeyManager = new ApiKeyManager();
  });

  afterEach(() => {
    delete process.env.API_KEY;
    delete process.env.API_KEY_1;
    delete process.env.ENABLE_API_KEY_AUTH;
  });

  describe('validateKey', () => {
    it('should validate correct API key', async () => {
      const result = await apiKeyManager.validateKey('test_primary_key_12345678901234567890');

      expect(result.valid).toBe(true);
      expect(result.keyId).toBe('key_1');
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid API key', async () => {
      const result = await apiKeyManager.validateKey('invalid_key');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
      expect(result.keyId).toBeUndefined();
    });

    it('should reject empty API key', async () => {
      const result = await apiKeyManager.validateKey('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key required');
    });

    it('should handle prefixed API keys', async () => {
      const result = await apiKeyManager.validateKey('ak_test_primary_key_12345678901234567890');

      expect(result.valid).toBe(true);
      expect(result.keyId).toBe('key_1');
    });

    it('should validate secondary API keys', async () => {
      const result = await apiKeyManager.validateKey('test_secondary_key_12345678901234567890');

      expect(result.valid).toBe(true);
      expect(result.keyId).toBe('key_2');
    });
  });

  describe('extractKeyFromHeaders', () => {
    it('should extract key from Authorization header', () => {
      const headers = new Headers({
        authorization: 'Bearer test_key_123',
      });

      const key = apiKeyManager.extractKeyFromHeaders(headers);

      expect(key).toBe('test_key_123');
    });

    it('should extract key from X-API-Key header', () => {
      const headers = new Headers({
        'x-api-key': 'test_key_456',
      });

      const key = apiKeyManager.extractKeyFromHeaders(headers);

      expect(key).toBe('test_key_456');
    });

    it('should prefer Authorization header over X-API-Key', () => {
      const headers = new Headers({
        authorization: 'Bearer auth_key',
        'x-api-key': 'api_key',
      });

      const key = apiKeyManager.extractKeyFromHeaders(headers);

      expect(key).toBe('auth_key');
    });

    it('should return null when no API key is present', () => {
      const headers = new Headers();

      const key = apiKeyManager.extractKeyFromHeaders(headers);

      expect(key).toBeNull();
    });

    it('should handle malformed Authorization header', () => {
      const headers = new Headers({
        authorization: 'Basic dGVzdA==', // Not Bearer
      });

      const key = apiKeyManager.extractKeyFromHeaders(headers);

      expect(key).toBeNull();
    });
  });

  describe('generateKey', () => {
    it('should generate valid API key with prefix', () => {
      const key = apiKeyManager.generateKey();

      expect(key).toMatch(/^ak_[a-f0-9]{64}$/);
    });

    it('should generate unique keys', () => {
      const key1 = apiKeyManager.generateKey();
      const key2 = apiKeyManager.generateKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('getKeyCount', () => {
    it('should return correct number of configured keys', () => {
      const count = apiKeyManager.getKeyCount();

      expect(count).toBe(2); // Primary + secondary key
    });
  });

  describe('configuration validation', () => {
    it('should reject invalid configuration', () => {
      expect(() => {
        new ApiKeyManager({
          validKeys: ['short'], // Too short (< 32 chars)
          hashKeys: true,
          keyPrefix: 'ak_',
        });
      }).toThrow();
    });

    it('should accept valid configuration', () => {
      expect(() => {
        new ApiKeyManager({
          validKeys: ['valid_key_with_32_characters_min'],
          hashKeys: false,
          keyPrefix: 'test_',
        });
      }).not.toThrow();
    });
  });
});

describe('validateApiKeyMiddleware', () => {
  beforeEach(() => {
    process.env.API_KEY = 'test_middleware_key_12345678901234567890';
  });

  afterEach(() => {
    delete process.env.API_KEY;
  });

  it('should validate request with correct API key', async () => {
    const headers = new Headers({
      authorization: 'Bearer test_middleware_key_12345678901234567890',
    });

    const result = await validateApiKeyMiddleware(headers);

    expect(result.valid).toBe(true);
    expect(result.keyId).toBe('key_1');
  });

  it('should reject request without API key', async () => {
    const headers = new Headers();

    const result = await validateApiKeyMiddleware(headers);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('API key required');
  });

  it('should reject request with invalid API key', async () => {
    const headers = new Headers({
      'x-api-key': 'invalid_key',
    });

    const result = await validateApiKeyMiddleware(headers);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid API key');
  });
});

describe('isApiKeyAuthEnabled', () => {
  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.ENABLE_API_KEY_AUTH;
  });

  it('should return true in production', () => {
    process.env.NODE_ENV = 'production';

    const enabled = isApiKeyAuthEnabled();

    expect(enabled).toBe(true);
  });

  it('should return false in development by default', () => {
    process.env.NODE_ENV = 'development';

    const enabled = isApiKeyAuthEnabled();

    expect(enabled).toBe(false);
  });

  it('should return true when explicitly enabled', () => {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_API_KEY_AUTH = 'true';

    const enabled = isApiKeyAuthEnabled();

    expect(enabled).toBe(true);
  });

  it('should return false when explicitly disabled', () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_API_KEY_AUTH = 'false';

    const enabled = isApiKeyAuthEnabled();

    expect(enabled).toBe(false);
  });
});