import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.WEAVIATE_HOST = 'https://test-weaviate.com';
process.env.WEAVIATE_API_KEY = 'test-weaviate-key';
process.env.UPSTASH_REDIS_URL = 'https://test-redis.upstash.io';
process.env.UPSTASH_REDIS_TOKEN = 'test-redis-token';

// Mock global Request and Response for Next.js API routes
global.Request = class Request {
  constructor(input, init = {}) {
    this.url = input;
    this.method = init.method || 'GET';
    this.headers = new Map(Object.entries(init.headers || {}));
    this.body = init.body;
  }

  async json() {
    return JSON.parse(this.body || '{}');
  }

  async text() {
    return this.body || '';
  }
};

global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.headers = new Map(Object.entries(init.headers || {}));
  }

  json() {
    return JSON.parse(this.body);
  }

  text() {
    return this.body;
  }
};

// Mock Headers class
global.Headers = class Headers extends Map {
  constructor(init = {}) {
    super();
    if (init && typeof init === 'object') {
      Object.entries(init).forEach(([key, value]) => this.set(key, value));
    }
  }

  get(key) {
    return super.get(key.toLowerCase());
  }

  set(key, value) {
    return super.set(key.toLowerCase(), value);
  }

  has(key) {
    return super.has(key.toLowerCase());
  }

  delete(key) {
    return super.delete(key.toLowerCase());
  }
};

// Mock crypto for Node.js environment
global.crypto = require('crypto').webcrypto || {
  randomUUID: () => require('crypto').randomUUID(),
  subtle: {}
};

// Suppress console errors in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});