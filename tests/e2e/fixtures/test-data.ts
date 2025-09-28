/**
 * Test Data Setup for E2E Tests
 * Provides consistent test data and utilities for demo scenarios
 */

export interface TestSearchQuery {
  query: string;
  expectedResultCount: number;
  expectedSources: string[];
  description: string;
}

export interface TestChatMessage {
  message: string;
  expectedKeywords: string[];
  description: string;
}

/**
 * Search test queries that should work consistently in demo
 */
export const DEMO_SEARCH_QUERIES: TestSearchQuery[] = [
  {
    query: "How do I set up the development environment?",
    expectedResultCount: 3,
    expectedSources: ["README.md", "DEVELOPMENT"],
    description: "Development setup documentation query"
  },
  {
    query: "What is the project architecture?",
    expectedResultCount: 2,
    expectedSources: ["CLAUDE.md", "architecture"],
    description: "Architecture overview query"
  },
  {
    query: "How does caching work?",
    expectedResultCount: 2,
    expectedSources: ["cache", "redis"],
    description: "Cache implementation query"
  },
  {
    query: "API authentication",
    expectedResultCount: 1,
    expectedSources: ["auth", "api"],
    description: "Authentication documentation query"
  }
];

/**
 * Chat messages for testing streaming responses
 */
export const DEMO_CHAT_MESSAGES: TestChatMessage[] = [
  {
    message: "What is this project about?",
    expectedKeywords: ["RAG", "agent", "knowledge", "assistant"],
    description: "Project overview question"
  },
  {
    message: "How do I run the tests?",
    expectedKeywords: ["npm", "test", "jest", "coverage"],
    description: "Testing instructions question"
  },
  {
    message: "What technologies are used?",
    expectedKeywords: ["Next.js", "TypeScript", "OpenAI", "Weaviate"],
    description: "Technology stack question"
  },
  {
    message: "How does the search work?",
    expectedKeywords: ["hybrid", "vector", "search", "embeddings"],
    description: "Search functionality question"
  }
];

/**
 * Expected performance thresholds for monitoring
 */
export const PERFORMANCE_THRESHOLDS = {
  searchResponseTime: 3000, // 3 seconds max
  chatStreamInitiation: 2000, // 2 seconds to start streaming
  monitoringEndpointTime: 1000, // 1 second for monitoring endpoints
  healthCheckTime: 500, // 500ms for health checks
  costCalculationTime: 1000, // 1 second for cost calculations
};

/**
 * Rate limiting test configuration
 */
export const RATE_LIMIT_CONFIG = {
  maxRequests: 10,
  timeWindow: 60000, // 1 minute
  testBurstSize: 15, // Requests to trigger rate limiting
};

/**
 * Error scenarios for testing
 */
export const ERROR_SCENARIOS = {
  invalidSearchQuery: {
    query: "", // Empty query should fail validation
    expectedStatus: 400,
    expectedError: "query is required"
  },
  invalidChatMessage: {
    message: "", // Empty message should fail validation
    expectedStatus: 400,
    expectedError: "Message is required"
  },
  malformedJson: {
    body: "{ invalid json",
    expectedStatus: 400,
    expectedError: "Invalid JSON"
  }
};

/**
 * Creates a consistent test environment setup
 */
export class TestEnvironment {
  static async waitForService(url: string, timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Service not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return false;
  }

  static async setupTestData(): Promise<void> {
    // In a real implementation, this might:
    // - Seed test data in Weaviate
    // - Setup test cache entries
    // - Initialize memory contexts
    console.log('Setting up test data for E2E tests...');
  }

  static async cleanupTestData(): Promise<void> {
    // Cleanup any test-specific data
    console.log('Cleaning up test data after E2E tests...');
  }

  static generateSessionId(): string {
    return `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateUserId(): string {
    return `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Utilities for validating API responses
 */
export class ResponseValidator {
  static validateSearchResponse(response: any): boolean {
    return (
      response &&
      typeof response === 'object' &&
      Array.isArray(response.results) &&
      response.metadata &&
      typeof response.metadata.searchTime === 'number' &&
      typeof response.metadata.queryId === 'string'
    );
  }

  static validateChatStreamChunk(chunk: string): boolean {
    // Validate that chunk contains expected streaming data format
    return chunk.length > 0 && (
      chunk.startsWith('data: ') ||
      chunk.includes('"content":') ||
      chunk.includes('"delta":')
    );
  }

  static validateMonitoringResponse(response: any): boolean {
    return (
      response &&
      typeof response === 'object' &&
      response.timestamp &&
      typeof response.totalCost === 'number' &&
      Array.isArray(response.services) &&
      Array.isArray(response.alerts)
    );
  }

  static validateHealthResponse(response: any): boolean {
    return (
      response &&
      typeof response === 'object' &&
      typeof response.status === 'string' &&
      response.timestamp &&
      response.uptime
    );
  }
}

/**
 * Mock data generators for consistent testing
 */
export class MockDataGenerator {
  static generateSearchRequest(overrides: Partial<any> = {}) {
    return {
      query: "test query",
      limit: 10,
      offset: 0,
      includeContent: true,
      includeEmbedding: false,
      timeout: 5000,
      ...overrides
    };
  }

  static generateChatRequest(overrides: Partial<any> = {}) {
    return {
      message: "test message",
      sessionId: TestEnvironment.generateSessionId(),
      userId: TestEnvironment.generateUserId(),
      conversationId: `conv-${Date.now()}`,
      ...overrides
    };
  }
}