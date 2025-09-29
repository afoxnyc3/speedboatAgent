/**
 * Jest Test Setup - Global Polyfills and Mocks
 * Comprehensive test environment configuration
 */

// 1) Mock fetch globally for all tests
(global as any).fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
  headers: new Map()
});

// Mock other Web APIs
(global as any).Headers = class MockHeaders extends Map {
  constructor(init?: any) {
    super();
    if (init && typeof init === 'object') {
      Object.entries(init).forEach(([key, value]) => this.set(key, value));
    }
  }
};

(global as any).Request = class MockRequest {
  constructor(public url: string, public options: any = {}) {}
  headers = new (global as any).Headers();
};

(global as any).Response = class MockResponse {
  constructor(public body: any, public init: any = {}) {}
  ok = true;
  status = 200;
  headers = new (global as any).Headers();
  json = jest.fn().mockResolvedValue({});
  text = jest.fn().mockResolvedValue('');
};

// 2) TextEncoder/TextDecoder polyfill
import { TextEncoder, TextDecoder } from 'util';
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder as any;

// 3) Environment setup
process.env.NODE_ENV = 'test';

// Mock environment variables for testing
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.WEAVIATE_HOST = 'https://test-weaviate.com';
process.env.WEAVIATE_API_KEY = 'test-weaviate-key';
process.env.UPSTASH_REDIS_URL = 'https://test-redis.upstash.io';
process.env.UPSTASH_REDIS_TOKEN = 'test-redis-token';

// 4) Fail fast on unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UnhandledRejection in Jest:', err);
  throw err;
});

// 5) Global console error suppression for known test warnings
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

// 6) AbortController timeout polyfill
if (typeof AbortSignal !== 'undefined' && !AbortSignal.timeout) {
  AbortSignal.timeout = function(delay: number) {
    const controller = new AbortController();
    // Don't actually abort in tests to avoid interference
    return controller.signal;
  };
}