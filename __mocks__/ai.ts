/**
 * AI SDK Mock
 * Prevents all real AI SDK calls in tests
 */

/**
 * Mock embed function for embedding generation
 * Returns a mock 1024-dimensional embedding vector
 */
export const embed = jest.fn().mockResolvedValue({
  embedding: new Array(1024).fill(0.01),
  usage: {
    tokens: 10,
    promptTokens: 10,
    completionTokens: 0
  }
});

/**
 * Mock generateObject function for structured output generation
 * Used by query classifier for query classification
 * Uses mockResolvedValue so tests can override with their own mocks
 */
export const generateObject = jest.fn().mockResolvedValue({
  object: {
    type: 'technical',
    confidence: 0.9,
    reasoning: 'Mock classification for testing'
  },
  usage: {
    tokens: 100,
    promptTokens: 50,
    completionTokens: 50
  },
  finishReason: 'stop'
});

/**
 * Mock generateText function for text generation
 */
export const generateText = jest.fn().mockResolvedValue({
  text: 'Mock generated text',
  usage: {
    tokens: 50,
    promptTokens: 25,
    completionTokens: 25
  },
  finishReason: 'stop'
});

/**
 * Mock streamText function for streaming responses
 */
export const streamText = jest.fn().mockReturnValue({
  textStream: (async function* () {
    yield 'Mock ';
    yield 'streamed ';
    yield 'text';
  })(),
  text: Promise.resolve('Mock streamed text'),
  usage: Promise.resolve({
    tokens: 50,
    promptTokens: 25,
    completionTokens: 25
  }),
  finishReason: Promise.resolve('stop')
});

// Export default object for compatibility
export default {
  embed,
  generateObject,
  generateText,
  streamText
};