/**
 * Weaviate Client Mock
 * Prevents all real Weaviate API calls in tests
 */

const mockQuery = {
  withClassName: jest.fn().mockReturnThis(),
  withFields: jest.fn().mockReturnThis(),
  withHybrid: jest.fn().mockReturnThis(),
  withLimit: jest.fn().mockReturnThis(),
  withOffset: jest.fn().mockReturnThis(),
  withWhere: jest.fn().mockReturnThis(),
  do: jest.fn().mockResolvedValue({
    data: {
      Get: {
        Document: []  // Empty by default - tests configure specific responses
      }
    }
  })
};

const mockClient = {
  graphql: {
    get: jest.fn().mockReturnValue(mockQuery)
  },
  misc: {
    metaGetter: jest.fn().mockReturnValue({
      do: jest.fn().mockResolvedValue({ version: '1.0.0' })
    })
  }
};

// Mock the main weaviate default export
export default {
  client: jest.fn().mockReturnValue(mockClient),
  ApiKey: jest.fn().mockImplementation((key: string) => ({ apiKey: key })),
  // Add other required Weaviate exports as needed
};

// Mock named exports
export const client = jest.fn().mockReturnValue(mockClient);
export const ApiKey = jest.fn().mockImplementation((key: string) => ({ apiKey: key }));