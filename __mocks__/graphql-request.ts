/**
 * GraphQL Request Mock
 * Prevents all real GraphQL/HTTP requests in tests
 */

export class GraphQLClient {
  constructor(..._args: any[]) {}

  request = jest.fn().mockResolvedValue({
    data: {
      Get: {
        Document: [
          {
            id: 'mock-doc-1',
            content: 'Mock document content for testing',
            source: 'github',
            filepath: '/mock/path.ts',
            url: 'https://github.com/mock/repo/file.ts',
            language: 'typescript',
            priority: 1.0,
            lastModified: '2023-01-01T00:00:00Z',
            isCode: true,
            isDocumentation: false,
            fileType: 'typescript',
            size: 1024,
            _additional: {
              score: 0.95,
              id: 'weaviate-mock-id'
            }
          }
        ]
      }
    }
  });
}

// Tagged template passthrough for gql`` literals
export const gql = (literals: TemplateStringsArray, ...expressions: any[]) =>
  literals.raw.join('');

export default GraphQLClient;