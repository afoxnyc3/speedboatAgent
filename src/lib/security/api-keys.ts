/**
 * API Key Management System
 * Support for multiple valid API keys with rotation
 */

import { z } from 'zod';

// API key configuration
export interface ApiKeyConfig {
  readonly validKeys: readonly string[];
  readonly hashKeys: boolean;
  readonly keyPrefix: string;
}

// API key validation result
export interface ApiKeyValidation {
  readonly valid: boolean;
  readonly keyId?: string;
  readonly error?: string;
}

// Configuration schema
export const ApiKeyConfigSchema = z.object({
  validKeys: z.array(z.string().min(32)).min(1).max(10),
  hashKeys: z.boolean(),
  keyPrefix: z.string().min(1).max(20),
}).strict();

/**
 * API Key Manager with rotation support
 */
export class ApiKeyManager {
  private readonly config: ApiKeyConfig;
  private readonly hashedKeys: Map<string, string>;
  private hashingReady: Promise<void>;

  constructor(config: Partial<ApiKeyConfig> = {}) {
    const defaultConfig: ApiKeyConfig = {
      validKeys: this.getKeysFromEnv(),
      hashKeys: true,
      keyPrefix: 'ak_',
    };

    this.config = { ...defaultConfig, ...config };
    ApiKeyConfigSchema.parse(this.config);

    // Pre-compute hashes for performance
    this.hashedKeys = new Map();
    this.hashingReady = this.initializeHashes();
  }

  /**
   * Initialize hash map with async hashing
   */
  private async initializeHashes(): Promise<void> {
    if (this.config.hashKeys) {
      for (let i = 0; i < this.config.validKeys.length; i++) {
        const key = this.config.validKeys[i];
        const hash = await this.hashKey(key);
        this.hashedKeys.set(hash, `key_${i + 1}`);
      }
    }
  }

  /**
   * Validate API key from request
   */
  async validateKey(providedKey: string): Promise<ApiKeyValidation> {
    if (!providedKey) {
      return {
        valid: false,
        error: 'API key required',
      };
    }

    // Wait for hash initialization
    await this.hashingReady;

    // Remove prefix if present
    const cleanKey = providedKey.startsWith(this.config.keyPrefix)
      ? providedKey.slice(this.config.keyPrefix.length)
      : providedKey;

    if (this.config.hashKeys) {
      const hash = await this.hashKey(cleanKey);
      const keyId = this.hashedKeys.get(hash);

      if (keyId) {
        return {
          valid: true,
          keyId,
        };
      }
    } else {
      // Direct comparison (not recommended for production)
      const keyIndex = this.config.validKeys.indexOf(cleanKey);
      if (keyIndex !== -1) {
        return {
          valid: true,
          keyId: `key_${keyIndex + 1}`,
        };
      }
    }

    return {
      valid: false,
      error: 'Invalid API key',
    };
  }

  /**
   * Extract API key from request headers
   */
  extractKeyFromHeaders(headers: Headers): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = headers.get('x-api-key');
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    return null;
  }

  /**
   * Generate new API key
   */
  generateKey(): string {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const key = Array.from(randomBytes, byte =>
      byte.toString(16).padStart(2, '0')
    ).join('');

    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Get current active key count
   */
  getKeyCount(): number {
    return this.config.validKeys.length;
  }

  /**
   * Hash API key using SHA-256 (Web Crypto API)
   */
  private async hashKey(key: string): Promise<string> {
    // Create encoder with proper fallback for Node.js environments
    let data: Uint8Array | Buffer;

    try {
      // Try to use TextEncoder if available
      const encoder = new TextEncoder();
      data = encoder.encode(key);
    } catch {
      // Fallback to Buffer for Node.js environments
      data = Buffer.from(key, 'utf8');
    }

    // Use Node.js crypto if Web Crypto is not available (test environment)
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      const { createHash } = await import('crypto');
      return createHash('sha256').update(data).digest('hex');
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Load API keys from environment variables
   */
  private getKeysFromEnv(): string[] {
    const keys: string[] = [];

    // Primary API key
    const primaryKey = process.env.API_KEY;
    if (primaryKey) {
      keys.push(primaryKey);
    }

    // Secondary/rotation keys
    for (let i = 1; i <= 5; i++) {
      const key = process.env[`API_KEY_${i}`];
      if (key) {
        keys.push(key);
      }
    }

    // If no keys configured, generate a default one for development
    if (keys.length === 0 && process.env.NODE_ENV === 'development') {
      console.warn('No API keys configured. Using development default.');
      keys.push('dev_default_key_please_change_in_production');
    }

    return keys;
  }
}

// Singleton instance
let apiKeyManagerInstance: ApiKeyManager | null = null;

/**
 * Get API key manager singleton
 */
export function getApiKeyManager(config?: Partial<ApiKeyConfig>): ApiKeyManager {
  if (!apiKeyManagerInstance) {
    apiKeyManagerInstance = new ApiKeyManager(config);
  }
  return apiKeyManagerInstance;
}

/**
 * Middleware helper for API key validation
 */
export async function validateApiKeyMiddleware(headers: Headers): Promise<ApiKeyValidation> {
  const manager = getApiKeyManager();
  const apiKey = manager.extractKeyFromHeaders(headers);

  if (!apiKey) {
    return {
      valid: false,
      error: 'API key required in Authorization header or X-API-Key header',
    };
  }

  return manager.validateKey(apiKey);
}

/**
 * Check if API key authentication is enabled
 */
export function isApiKeyAuthEnabled(): boolean {
  // Explicitly disabled takes precedence
  if (process.env.ENABLE_API_KEY_AUTH === 'false') {
    return false;
  }

  return process.env.NODE_ENV === 'production' ||
         process.env.ENABLE_API_KEY_AUTH === 'true';
}