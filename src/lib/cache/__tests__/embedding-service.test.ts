import { EmbeddingService } from '../embedding-service';

jest.mock('@ai-sdk/openai', () => ({
  openai: {
    embedding: jest.fn((model: string) => ({ model }))
  }
}));

const mockCacheManager = {
  isAvailable: jest.fn(),
  getEmbedding: jest.fn(),
  setEmbedding: jest.fn(),
  clearAll: jest.fn(),
  getCacheMetrics: jest.fn()
};

jest.mock('../redis-cache', () => ({
  getCacheManager: jest.fn(() => mockCacheManager),
  createCacheContext: jest.fn(() => 'mock-context')
}));

jest.mock('ai', () => ({
  embed: jest.fn()
}));

import { embed } from 'ai';

const mockEmbed = embed as jest.MockedFunction<typeof embed>;

const mockMetrics = {
  hits: 0,
  misses: 0,
  hitRate: 0,
  totalRequests: 0,
  cacheSize: 0,
  lastUpdated: new Date()
};

describe('EmbeddingService', () => {
  const service = new EmbeddingService();
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();

    mockCacheManager.isAvailable.mockReturnValue(true);
    mockCacheManager.getEmbedding.mockResolvedValue(null);
    mockCacheManager.setEmbedding.mockResolvedValue(true);
    mockCacheManager.getCacheMetrics.mockReturnValue({ embedding: mockMetrics });

    mockEmbed.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
    consoleWarnSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('returns cached embedding when available', async () => {
    const cachedEmbedding = {
      embedding: [0.1, 0.2, 0.3],
      model: 'text-embedding-3-large',
      dimensions: 1024,
      cached: true,
      timestamp: new Date()
    };

    mockCacheManager.getEmbedding.mockResolvedValueOnce(cachedEmbedding);

    const result = await service.generateEmbedding('cached query');

    expect(result.cached).toBe(true);
    expect(result.embedding).toEqual(cachedEmbedding.embedding);
    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it('generates embeddings and caches the result when not cached', async () => {
    const embedding = [0.5, 0.6, 0.7];
    mockEmbed.mockResolvedValueOnce({ embedding });

    const result = await service.generateEmbedding('fresh query');

    expect(result.cached).toBe(false);
    expect(result.embedding).toEqual(embedding);
    expect(mockCacheManager.setEmbedding).toHaveBeenCalledWith(
      'fresh query',
      embedding,
      'text-embedding-3-large',
      'mock-context'
    );
  });

  it('parses JSON string responses from provider', async () => {
    const embedding = [0.9, 1.0, 1.1];
    mockEmbed.mockResolvedValueOnce(JSON.stringify({ embedding }));

    const result = await service.generateEmbedding('json response');

    expect(result.embedding).toEqual(embedding);
    expect(mockCacheManager.setEmbedding).toHaveBeenCalledWith(
      'json response',
      embedding,
      'text-embedding-3-large',
      'mock-context'
    );
  });

  it('throws descriptive error for invalid JSON payloads', async () => {
    mockEmbed.mockResolvedValueOnce('invalid-json');

    await expect(service.generateEmbedding('bad json')).rejects.toThrow(
      'Failed to generate embedding: Invalid JSON response from embedding provider'
    );

    expect(mockCacheManager.setEmbedding).not.toHaveBeenCalled();
  });

  it('throws descriptive error for invalid embedding payloads', async () => {
    mockEmbed.mockResolvedValueOnce({ embedding: ['invalid'] });

    await expect(service.generateEmbedding('bad payload')).rejects.toThrow(
      'Failed to generate embedding: Invalid embedding payload from provider'
    );

    expect(mockCacheManager.setEmbedding).not.toHaveBeenCalled();
  });
});
