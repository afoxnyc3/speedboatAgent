import '@testing-library/jest-dom';

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-api-key';

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});