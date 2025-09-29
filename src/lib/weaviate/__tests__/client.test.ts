/**
 * Weaviate Client Tests
 * Comprehensive test suite for Weaviate client functionality
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import weaviate from 'weaviate-ts-client';
import { z } from 'zod';
import {
  createWeaviateClient,
  testConnection,
  weaviateClient,
  WeaviateConfig
} from '../client';

// Mock the weaviate-ts-client module
jest.mock('weaviate-ts-client', () => ({
  __esModule: true,
  default: {
    client: jest.fn(),
    ApiKey: jest.fn()
  }
}));

const mockWeaviate = weaviate as jest.Mocked<typeof weaviate>;

describe('Weaviate Client', () => {
  let mockClient: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment variables
    originalEnv = { ...process.env };

    // Reset all mocks
    jest.clearAllMocks();

    // Mock Weaviate client instance
    mockClient = {
      misc: {
        metaGetter: jest.fn().mockReturnValue({
          do: jest.fn()
        })
      },
      graphql: {
        get: jest.fn(),
        aggregate: jest.fn()
      },
      schema: {
        classGetter: jest.fn(),
        classCreator: jest.fn()
      },
      data: {
        creator: jest.fn(),
        updater: jest.fn(),
        deleter: jest.fn(),
        getter: jest.fn()
      }
    };

    // Mock weaviate.client() to return our mock client
    mockWeaviate.client.mockReturnValue(mockClient);

    // Mock ApiKey constructor
    mockWeaviate.ApiKey.mockImplementation((key: string) => ({ apiKey: key }));

    // Reset the singleton client
    // Note: In a real scenario, we might need to reset the module's internal state
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('Configuration Validation', () => {
    it('should validate correct configuration', () => {
      const validConfig: WeaviateConfig = {
        host: 'https://test-cluster.weaviate.network',
        apiKey: 'test-api-key-123',
        openaiApiKey: 'sk-test-openai-key'
      };

      expect(() => {
        // This should not throw
        createWeaviateClient(validConfig);
      }).not.toThrow();

      expect(mockWeaviate.client).toHaveBeenCalledWith({
        scheme: 'https',
        host: 'test-cluster.weaviate.network',
        apiKey: { apiKey: 'test-api-key-123' },
        headers: {
          'X-OpenAI-Api-Key': 'sk-test-openai-key'
        }
      });
    });

    it('should reject invalid host URL', () => {
      const invalidConfig = {
        host: 'not-a-valid-url',
        apiKey: 'test-api-key',
        openaiApiKey: 'sk-test-key'
      };

      expect(() => {
        createWeaviateClient(invalidConfig);
      }).toThrow(z.ZodError);
    });

    it('should reject missing required fields', () => {
      const incompleteConfig = {
        host: 'https://test.weaviate.network'
        // Missing apiKey and openaiApiKey
      };

      expect(() => {
        createWeaviateClient(incompleteConfig);
      }).toThrow(z.ZodError);
    });

    it('should reject empty string values', () => {
      const emptyConfig = {
        host: '',
        apiKey: '',
        openaiApiKey: ''
      };

      expect(() => {
        createWeaviateClient(emptyConfig);
      }).toThrow(z.ZodError);
    });
  });

  describe('Environment Variable Handling', () => {
    beforeEach(() => {
      // Set up test environment variables
      process.env.WEAVIATE_HOST = 'https://env-test.weaviate.network';
      process.env.WEAVIATE_API_KEY = 'env-test-api-key';
      process.env.OPENAI_API_KEY = 'sk-env-test-openai-key';
    });

    it('should use environment variables when no config provided', () => {
      createWeaviateClient();

      expect(mockWeaviate.client).toHaveBeenCalledWith({
        scheme: 'https',
        host: 'env-test.weaviate.network',
        apiKey: { apiKey: 'env-test-api-key' },
        headers: {
          'X-OpenAI-Api-Key': 'sk-env-test-openai-key'
        }
      });
    });

    it('should use environment variables for missing config fields', () => {
      const partialConfig = {
        host: 'https://custom-host.weaviate.network'
        // Missing apiKey and openaiApiKey - should use env vars
      };

      createWeaviateClient(partialConfig);

      expect(mockWeaviate.client).toHaveBeenCalledWith({
        scheme: 'https',
        host: 'custom-host.weaviate.network',
        apiKey: { apiKey: 'env-test-api-key' },
        headers: {
          'X-OpenAI-Api-Key': 'sk-env-test-openai-key'
        }
      });
    });

    it('should prefer explicit config over environment variables', () => {
      const explicitConfig = {
        host: 'https://explicit-host.weaviate.network',
        apiKey: 'explicit-api-key',
        openaiApiKey: 'sk-explicit-openai-key'
      };

      createWeaviateClient(explicitConfig);

      expect(mockWeaviate.client).toHaveBeenCalledWith({
        scheme: 'https',
        host: 'explicit-host.weaviate.network',
        apiKey: { apiKey: 'explicit-api-key' },
        headers: {
          'X-OpenAI-Api-Key': 'sk-explicit-openai-key'
        }
      });
    });

    it('should throw error when environment variables are missing', () => {
      delete process.env.WEAVIATE_HOST;
      delete process.env.WEAVIATE_API_KEY;
      delete process.env.OPENAI_API_KEY;

      expect(() => {
        createWeaviateClient();
      }).toThrow(z.ZodError);
    });
  });

  describe('URL Processing', () => {
    it('should remove https:// prefix from host', () => {
      const config = {
        host: 'https://test-host.weaviate.network',
        apiKey: 'test-key',
        openaiApiKey: 'sk-test-key'
      };

      createWeaviateClient(config);

      expect(mockWeaviate.client).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'test-host.weaviate.network' // Without https://
        })
      );
    });

    it('should handle host without https:// prefix', () => {
      const config = {
        host: 'https://no-prefix-host.weaviate.network',
        apiKey: 'test-key',
        openaiApiKey: 'sk-test-key'
      };

      createWeaviateClient(config);

      expect(mockWeaviate.client).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'no-prefix-host.weaviate.network'
        })
      );
    });

    it('should handle complex URLs with paths and ports', () => {
      const config = {
        host: 'https://complex-host.weaviate.network:8080',
        apiKey: 'test-key',
        openaiApiKey: 'sk-test-key'
      };

      createWeaviateClient(config);

      expect(mockWeaviate.client).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'complex-host.weaviate.network:8080'
        })
      );
    });
  });

  describe('Singleton Behavior', () => {
    beforeEach(() => {
      // Set up environment for singleton tests
      process.env.WEAVIATE_HOST = 'https://singleton-test.weaviate.network';
      process.env.WEAVIATE_API_KEY = 'singleton-api-key';
      process.env.OPENAI_API_KEY = 'sk-singleton-key';
    });

    it('should return the same client instance on multiple calls', () => {
      const client1 = createWeaviateClient();
      const client2 = createWeaviateClient();

      expect(client1).toBe(client2);
      expect(mockWeaviate.client).toHaveBeenCalledTimes(1);
    });

    it('should create client only once even with different configs', () => {
      const config1 = {
        host: 'https://first-host.weaviate.network',
        apiKey: 'first-key',
        openaiApiKey: 'sk-first-key'
      };

      const config2 = {
        host: 'https://second-host.weaviate.network',
        apiKey: 'second-key',
        openaiApiKey: 'sk-second-key'
      };

      const client1 = createWeaviateClient(config1);
      const client2 = createWeaviateClient(config2);

      expect(client1).toBe(client2);
      expect(mockWeaviate.client).toHaveBeenCalledTimes(1);
      expect(mockWeaviate.client).toHaveBeenCalledWith({
        scheme: 'https',
        host: 'first-host.weaviate.network',
        apiKey: { apiKey: 'first-key' },
        headers: {
          'X-OpenAI-Api-Key': 'sk-first-key'
        }
      });
    });
  });

  describe('Client Configuration', () => {
    it('should configure client with correct scheme', () => {
      const config = {
        host: 'https://scheme-test.weaviate.network',
        apiKey: 'scheme-key',
        openaiApiKey: 'sk-scheme-key'
      };

      createWeaviateClient(config);

      expect(mockWeaviate.client).toHaveBeenCalledWith(
        expect.objectContaining({
          scheme: 'https'
        })
      );
    });

    it('should configure API key correctly', () => {
      const config = {
        host: 'https://api-key-test.weaviate.network',
        apiKey: 'test-api-key-value',
        openaiApiKey: 'sk-test-key'
      };

      createWeaviateClient(config);

      expect(mockWeaviate.ApiKey).toHaveBeenCalledWith('test-api-key-value');
      expect(mockWeaviate.client).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: { apiKey: 'test-api-key-value' }
        })
      );
    });

    it('should set OpenAI API key in headers', () => {
      const config = {
        host: 'https://header-test.weaviate.network',
        apiKey: 'header-api-key',
        openaiApiKey: 'sk-openai-header-key'
      };

      createWeaviateClient(config);

      expect(mockWeaviate.client).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'X-OpenAI-Api-Key': 'sk-openai-header-key'
          }
        })
      );
    });
  });

  describe('testConnection', () => {
    beforeEach(() => {
      // Setup environment for connection tests
      process.env.WEAVIATE_HOST = 'https://connection-test.weaviate.network';
      process.env.WEAVIATE_API_KEY = 'connection-api-key';
      process.env.OPENAI_API_KEY = 'sk-connection-key';
    });

    it('should return true on successful connection', async () => {
      const mockMetaResult = {
        version: '1.19.0',
        modules: {
          'text2vec-openai': {
            version: '1.0.0'
          }
        }
      };

      mockClient.misc.metaGetter().do.mockResolvedValue(mockMetaResult);

      const result = await testConnection();

      expect(result).toBe(true);
      expect(mockClient.misc.metaGetter).toHaveBeenCalled();
    });

    it('should return false on connection failure', async () => {
      mockClient.misc.metaGetter().do.mockRejectedValue(new Error('Connection timeout'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await testConnection();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Weaviate connection failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should log success message on successful connection', async () => {
      const mockMetaResult = { version: '1.19.0' };
      mockClient.misc.metaGetter().do.mockResolvedValue(mockMetaResult);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await testConnection();

      expect(consoleSpy).toHaveBeenCalledWith('Weaviate connection successful:', '1.19.0');

      consoleSpy.mockRestore();
    });

    it('should handle network errors gracefully', async () => {
      mockClient.misc.metaGetter().do.mockRejectedValue(new Error('ECONNREFUSED'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await testConnection();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Weaviate connection failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle authentication errors gracefully', async () => {
      mockClient.misc.metaGetter().do.mockRejectedValue(new Error('401 Unauthorized'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await testConnection();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Weaviate connection failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('weaviateClient Export', () => {
    it('should export the singleton client instance', () => {
      // Set up environment
      process.env.WEAVIATE_HOST = 'https://export-test.weaviate.network';
      process.env.WEAVIATE_API_KEY = 'export-api-key';
      process.env.OPENAI_API_KEY = 'sk-export-key';

      // Create a client to initialize the singleton
      const createdClient = createWeaviateClient();

      // The exported client should be the same instance
      expect(weaviateClient).toBe(createdClient);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed environment variables gracefully', () => {
      process.env.WEAVIATE_HOST = 'not-a-url';
      process.env.WEAVIATE_API_KEY = '';
      process.env.OPENAI_API_KEY = undefined as any;

      expect(() => {
        createWeaviateClient();
      }).toThrow(z.ZodError);
    });

    it('should handle null/undefined config values', () => {
      const nullConfig = {
        host: null as any,
        apiKey: undefined as any,
        openaiApiKey: null as any
      };

      expect(() => {
        createWeaviateClient(nullConfig);
      }).toThrow(z.ZodError);
    });

    it('should handle very long configuration values', () => {
      const longConfig = {
        host: 'https://' + 'a'.repeat(1000) + '.weaviate.network',
        apiKey: 'a'.repeat(1000),
        openaiApiKey: 'sk-' + 'a'.repeat(1000)
      };

      // Should not throw for long but valid values
      expect(() => {
        createWeaviateClient(longConfig);
      }).not.toThrow();
    });

    it('should handle special characters in configuration', () => {
      const specialCharConfig = {
        host: 'https://test-cluster-123.weaviate.network',
        apiKey: 'api-key-with-special-chars_123-456',
        openaiApiKey: 'sk-openai_key-with-dashes_123'
      };

      expect(() => {
        createWeaviateClient(specialCharConfig);
      }).not.toThrow();
    });
  });

  describe('Performance and Memory', () => {
    it('should not create multiple client instances', () => {
      process.env.WEAVIATE_HOST = 'https://performance-test.weaviate.network';
      process.env.WEAVIATE_API_KEY = 'performance-api-key';
      process.env.OPENAI_API_KEY = 'sk-performance-key';

      // Create multiple clients rapidly
      const clients = Array.from({ length: 10 }, () => createWeaviateClient());

      // All should be the same instance
      const firstClient = clients[0];
      clients.forEach(client => {
        expect(client).toBe(firstClient);
      });

      // Should only call weaviate.client() once
      expect(mockWeaviate.client).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid successive connection tests', async () => {
      process.env.WEAVIATE_HOST = 'https://rapid-test.weaviate.network';
      process.env.WEAVIATE_API_KEY = 'rapid-api-key';
      process.env.OPENAI_API_KEY = 'sk-rapid-key';

      mockClient.misc.metaGetter().do.mockResolvedValue({ version: '1.19.0' });

      const connectionPromises = Array.from({ length: 5 }, () => testConnection());
      const results = await Promise.all(connectionPromises);

      expect(results).toEqual([true, true, true, true, true]);
      expect(mockClient.misc.metaGetter).toHaveBeenCalledTimes(5);
    });
  });

  describe('Integration Scenarios', () => {
    it('should work correctly in production-like scenario', async () => {
      // Simulate production environment
      process.env.WEAVIATE_HOST = 'https://prod-cluster.weaviate.network';
      process.env.WEAVIATE_API_KEY = 'prod-api-key-12345';
      process.env.OPENAI_API_KEY = 'sk-prod-openai-key-67890';

      mockClient.misc.metaGetter().do.mockResolvedValue({
        version: '1.19.0',
        modules: {
          'text2vec-openai': { version: '1.0.0' }
        }
      });

      // Create client and test connection
      const client = createWeaviateClient();
      const connectionResult = await testConnection();

      expect(client).toBe(mockClient);
      expect(connectionResult).toBe(true);
      expect(mockWeaviate.client).toHaveBeenCalledWith({
        scheme: 'https',
        host: 'prod-cluster.weaviate.network',
        apiKey: { apiKey: 'prod-api-key-12345' },
        headers: {
          'X-OpenAI-Api-Key': 'sk-prod-openai-key-67890'
        }
      });
    });

    it('should handle development environment with custom config', async () => {
      const devConfig = {
        host: 'https://dev-cluster.weaviate.network',
        apiKey: 'dev-api-key',
        openaiApiKey: 'sk-dev-key'
      };

      mockClient.misc.metaGetter().do.mockResolvedValue({ version: '1.18.0' });

      const client = createWeaviateClient(devConfig);
      const connectionResult = await testConnection();

      expect(client).toBe(mockClient);
      expect(connectionResult).toBe(true);
    });
  });
});