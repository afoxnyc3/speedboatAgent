/**
 * E2E Tests for Chat Streaming API
 * Tests critical chat functionality with streaming responses for demo
 */

import { test, expect } from '@playwright/test';
import {
  DEMO_CHAT_MESSAGES,
  PERFORMANCE_THRESHOLDS,
  ResponseValidator,
  MockDataGenerator,
  TestEnvironment
} from './fixtures/test-data';

test.describe('Chat Streaming API E2E Tests', () => {
  test.beforeAll(async () => {
    // Ensure the application is ready
    const isReady = await TestEnvironment.waitForService('http://localhost:3000/api/health');
    expect(isReady).toBe(true);
    await TestEnvironment.setupTestData();
  });

  test.afterAll(async () => {
    await TestEnvironment.cleanupTestData();
  });

  test('POST /api/chat/stream - Basic streaming chat works', async ({ request }) => {
    const chatRequest = MockDataGenerator.generateChatRequest({
      message: "What is this project about?"
    });

    const startTime = Date.now();
    const response = await request.post('/api/chat/stream', {
      data: chatRequest
    });

    expect(response.status()).toBe(200);

    // Check that streaming headers are present
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/plain');

    // Check performance headers
    const searchTime = response.headers()['x-search-time'];
    const contextUsed = response.headers()['x-context-used'];
    const parallelProcessing = response.headers()['x-parallel-processing'];

    expect(searchTime).toBeDefined();
    expect(contextUsed).toBeDefined();
    expect(parallelProcessing).toBe('true');

    // Verify we get a response within reasonable time
    const responseInitiationTime = Date.now() - startTime;
    expect(responseInitiationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.chatStreamInitiation);

    // Get response body as text (streaming content)
    const responseText = await response.text();
    expect(responseText.length).toBeGreaterThan(0);
  });

  test.describe('Demo Chat Messages', () => {
    DEMO_CHAT_MESSAGES.forEach((testMessage) => {
      test(`Chat: ${testMessage.description}`, async ({ request }) => {
        const chatRequest = MockDataGenerator.generateChatRequest({
          message: testMessage.message
        });

        const response = await request.post('/api/chat/stream', {
          data: chatRequest
        });

        expect(response.status()).toBe(200);

        const responseText = await response.text();
        expect(responseText.length).toBeGreaterThan(0);

        // Check that response contains some expected keywords
        const responseContent = responseText.toLowerCase();
        const foundKeywords = testMessage.expectedKeywords.filter(keyword =>
          responseContent.includes(keyword.toLowerCase())
        );

        // At least one expected keyword should be present
        expect(foundKeywords.length).toBeGreaterThan(0);
      });
    });
  });

  test('Chat with session continuity', async ({ request }) => {
    const sessionId = TestEnvironment.generateSessionId();
    const conversationId = `conv-${Date.now()}`;

    // First message in conversation
    const firstMessage = MockDataGenerator.generateChatRequest({
      message: "What technologies are used in this project?",
      sessionId,
      conversationId
    });

    const firstResponse = await request.post('/api/chat/stream', {
      data: firstMessage
    });

    expect(firstResponse.status()).toBe(200);
    const firstResponseText = await firstResponse.text();
    expect(firstResponseText.length).toBeGreaterThan(0);

    // Follow-up message in same conversation
    const followUpMessage = MockDataGenerator.generateChatRequest({
      message: "Can you tell me more about the caching strategy?",
      sessionId,
      conversationId
    });

    const followUpResponse = await request.post('/api/chat/stream', {
      data: followUpMessage
    });

    expect(followUpResponse.status()).toBe(200);
    const followUpResponseText = await followUpResponse.text();
    expect(followUpResponseText.length).toBeGreaterThan(0);

    // Check that context is being used
    const contextUsed = followUpResponse.headers()['x-context-used'];
    // Context may or may not be used depending on memory service availability
    expect(['true', 'false']).toContain(contextUsed);
  });

  test('Chat response includes performance metadata', async ({ request }) => {
    const chatRequest = MockDataGenerator.generateChatRequest({
      message: "Tell me about the search functionality"
    });

    const response = await request.post('/api/chat/stream', {
      data: chatRequest
    });

    expect(response.status()).toBe(200);

    // Check performance headers
    const searchTime = response.headers()['x-search-time'];
    const contextUsed = response.headers()['x-context-used'];
    const parallelProcessing = response.headers()['x-parallel-processing'];

    expect(searchTime).toBeDefined();
    expect(parseInt(searchTime!)).toBeGreaterThan(0);
    expect(parseInt(searchTime!)).toBeLessThan(PERFORMANCE_THRESHOLDS.searchResponseTime);

    expect(contextUsed).toBeDefined();
    expect(['true', 'false']).toContain(contextUsed);

    expect(parallelProcessing).toBe('true');
  });

  test('Chat handles long queries efficiently', async ({ request }) => {
    const longMessage = "This is a very long message that contains multiple questions about the project. " +
      "Can you tell me about the architecture, the technologies used, how the search works, " +
      "what the performance characteristics are, how caching is implemented, and what the " +
      "overall goal of this RAG agent system is? I want to understand all aspects.";

    const chatRequest = MockDataGenerator.generateChatRequest({
      message: longMessage
    });

    const startTime = Date.now();
    const response = await request.post('/api/chat/stream', {
      data: chatRequest
    });
    const responseTime = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.chatStreamInitiation);

    const responseText = await response.text();
    expect(responseText.length).toBeGreaterThan(100); // Should have substantial response
  });

  test.describe('Error Handling', () => {
    test('Empty message returns validation error', async ({ request }) => {
      const chatRequest = MockDataGenerator.generateChatRequest({
        message: ""
      });

      const response = await request.post('/api/chat/stream', {
        data: chatRequest
      });

      expect(response.status()).toBe(500);

      const responseText = await response.text();
      const errorData = JSON.parse(responseText);
      expect(errorData.error).toBeDefined();
    });

    test('Invalid JSON body returns parse error', async ({ request }) => {
      const response = await request.post('/api/chat/stream', {
        data: "{ invalid json",
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(500);
    });

    test('Missing message field returns validation error', async ({ request }) => {
      const response = await request.post('/api/chat/stream', {
        data: { sessionId: "test" } // Missing required message field
      });

      expect(response.status()).toBe(500);

      const responseText = await response.text();
      const errorData = JSON.parse(responseText);
      expect(errorData.error).toBeDefined();
    });

    test('Extremely long message is handled gracefully', async ({ request }) => {
      const veryLongMessage = "x".repeat(10000); // 10KB message

      const chatRequest = MockDataGenerator.generateChatRequest({
        message: veryLongMessage
      });

      const response = await request.post('/api/chat/stream', {
        data: chatRequest
      });

      // Should either succeed or return appropriate error
      expect([200, 400, 413]).toContain(response.status());

      if (response.status() === 200) {
        const responseText = await response.text();
        expect(responseText.length).toBeGreaterThan(0);
      }
    });
  });

  test('Chat performance under concurrent requests', async ({ request }) => {
    const concurrentRequests = 3; // Fewer concurrent requests for streaming
    const chatRequest = MockDataGenerator.generateChatRequest({
      message: "Concurrent chat test message"
    });

    const startTime = Date.now();

    const promises = Array(concurrentRequests).fill(null).map((_, index) =>
      request.post('/api/chat/stream', {
        data: {
          ...chatRequest,
          sessionId: `${chatRequest.sessionId}-${index}` // Unique sessions
        }
      })
    );

    const responses = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });

    // Average response time should be reasonable
    const avgResponseTime = totalTime / concurrentRequests;
    expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.chatStreamInitiation * 2);
  });

  test('Chat with different session configurations', async ({ request }) => {
    // Test with minimal session data
    const minimalRequest = {
      message: "Test message with minimal session data"
    };

    const minimalResponse = await request.post('/api/chat/stream', {
      data: minimalRequest
    });

    expect(minimalResponse.status()).toBe(200);

    // Test with full session data
    const fullRequest = MockDataGenerator.generateChatRequest({
      message: "Test message with full session data"
    });

    const fullResponse = await request.post('/api/chat/stream', {
      data: fullRequest
    });

    expect(fullResponse.status()).toBe(200);

    // Both should work
    const minimalText = await minimalResponse.text();
    const fullText = await fullResponse.text();

    expect(minimalText.length).toBeGreaterThan(0);
    expect(fullText.length).toBeGreaterThan(0);
  });

  test('Chat maintains consistent response quality', async ({ request }) => {
    const testQueries = [
      "What is the main purpose of this application?",
      "How does the search functionality work?",
      "What are the key features?"
    ];

    for (const query of testQueries) {
      const chatRequest = MockDataGenerator.generateChatRequest({
        message: query
      });

      const response = await request.post('/api/chat/stream', {
        data: chatRequest
      });

      expect(response.status()).toBe(200);

      const responseText = await response.text();
      expect(responseText.length).toBeGreaterThan(50); // Reasonable response length
      expect(responseText).not.toContain('error'); // No error messages in response
    }
  });
});