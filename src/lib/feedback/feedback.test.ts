import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import {
  createFeedbackId,
  type Feedback,
  type FeedbackListOptions,
  FEEDBACK_CONSTANTS,
} from '@/types/feedback';
import { createMessageId, createConversationId } from '../../types/chat';
import { FeedbackFileStore } from './feedback-store';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  access: jest.fn(),
  mkdir: jest.fn(),
}));

describe('FeedbackFileStore', () => {
  let store: FeedbackFileStore;
  const testDataDir = './test-data/feedback';
  const testFilePath = path.join(testDataDir, 'feedback.json');

  const mockFeedback: Feedback = {
    id: createFeedbackId('test-feedback-1'),
    type: 'thumbs_up',
    category: 'accuracy',
    messageId: createMessageId('msg-123'),
    conversationId: createConversationId('conv-456'),
    timestamp: new Date('2025-01-01T12:00:00Z'),
    context: {
      query: 'What is TypeScript?',
      response: 'TypeScript is a typed superset of JavaScript.',
      sources: ['file1.ts', 'file2.md'],
      responseTime: 1500,
      memoryUsed: true,
      modelUsed: 'gpt-4',
    },
    comment: 'Very helpful response!',
    metadata: {
      userAgent: 'Mozilla/5.0',
      version: '1.0.0',
    },
  };

  beforeEach(() => {
    store = new FeedbackFileStore(testDataDir);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('save', () => {
    it('should save feedback successfully', async () => {
      const mockReadFile = jest.mocked(fs.readFile);
      const mockWriteFile = jest.mocked(fs.writeFile);
      const mockAccess = jest.mocked(fs.access);

      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockRejectedValue({ code: 'ENOENT' });
      mockWriteFile.mockResolvedValue(undefined);

      const result = await store.save(mockFeedback);

      expect(result.success).toBe(true);
      expect(result.feedbackId).toBe(mockFeedback.id);
      expect(mockWriteFile).toHaveBeenCalledWith(
        testFilePath,
        JSON.stringify([mockFeedback], null, 2),
        'utf-8'
      );
    });

    it('should append to existing feedback', async () => {
      const existingFeedback = { ...mockFeedback, id: createFeedbackId('existing-1') };
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
      const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;

      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify([existingFeedback]));
      mockWriteFile.mockResolvedValue(undefined);

      const result = await store.save(mockFeedback);

      expect(result.success).toBe(true);
      expect(mockWriteFile).toHaveBeenCalledWith(
        testFilePath,
        JSON.stringify([existingFeedback, mockFeedback], null, 2),
        'utf-8'
      );
    });

    it('should handle save errors gracefully', async () => {
      const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockRejectedValue(new Error('Read error'));

      const result = await store.save(mockFeedback);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to save feedback');
    });
  });

  describe('get', () => {
    it('should retrieve feedback by id', async () => {
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(JSON.stringify([mockFeedback]));

      const result = await store.get(mockFeedback.id);

      expect(result).toEqual(mockFeedback);
    });

    it('should return null for non-existent feedback', async () => {
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(JSON.stringify([mockFeedback]));

      const result = await store.get(createFeedbackId('non-existent'));

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    const feedbackList = [
      mockFeedback,
      {
        ...mockFeedback,
        id: createFeedbackId('test-2'),
        type: 'thumbs_down' as const,
        timestamp: new Date('2025-01-02T12:00:00Z'),
      },
      {
        ...mockFeedback,
        id: createFeedbackId('test-3'),
        type: 'thumbs_up' as const,
        category: 'relevance' as const,
        timestamp: new Date('2025-01-03T12:00:00Z'),
      },
    ];

    beforeEach(() => {
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(JSON.stringify(feedbackList));
    });

    it('should list all feedback', async () => {
      const result = await store.list();

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(createFeedbackId('test-3')); // Most recent first
    });

    it('should filter by type', async () => {
      const options: FeedbackListOptions = {
        type: 'thumbs_down',
      };

      const result = await store.list(options);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('thumbs_down');
    });

    it('should filter by category', async () => {
      const options: FeedbackListOptions = {
        category: 'relevance',
      };

      const result = await store.list(options);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('relevance');
    });

    it('should filter by date range', async () => {
      const options: FeedbackListOptions = {
        startDate: new Date('2025-01-02T00:00:00Z'),
        endDate: new Date('2025-01-02T23:59:59Z'),
      };

      const result = await store.list(options);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(createFeedbackId('test-2'));
    });

    it('should apply pagination', async () => {
      const options: FeedbackListOptions = {
        limit: 2,
        offset: 1,
      };

      const result = await store.list(options);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(createFeedbackId('test-2'));
    });

    it('should respect max limit', async () => {
      const options: FeedbackListOptions = {
        limit: FEEDBACK_CONSTANTS.MAX_LIST_LIMIT + 100,
      };

      const result = await store.list(options);

      expect(result.length).toBeLessThanOrEqual(FEEDBACK_CONSTANTS.MAX_LIST_LIMIT);
    });
  });

  describe('analyze', () => {
    const analyticsData = [
      { ...mockFeedback, type: 'thumbs_up' as const },
      { ...mockFeedback, id: createFeedbackId('2'), type: 'thumbs_up' as const },
      {
        ...mockFeedback,
        id: createFeedbackId('3'),
        type: 'thumbs_down' as const,
        category: 'accuracy' as const,
        comment: 'Incorrect information',
      },
      {
        ...mockFeedback,
        id: createFeedbackId('4'),
        type: 'thumbs_down' as const,
        category: 'relevance' as const,
        comment: 'Not relevant to my query',
      },
      {
        ...mockFeedback,
        id: createFeedbackId('5'),
        type: 'thumbs_down' as const,
        category: 'relevance' as const,
        comment: 'Wrong context',
      },
    ];

    beforeEach(() => {
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(JSON.stringify(analyticsData));
    });

    it('should calculate analytics correctly', async () => {
      const result = await store.analyze();

      expect(result.totalFeedback).toBe(5);
      expect(result.thumbsUp).toBe(2);
      expect(result.thumbsDown).toBe(3);
      expect(result.satisfactionRate).toBeCloseTo(0.4, 2); // 2/(2+3)
    });

    it('should identify top issues', async () => {
      const result = await store.analyze();

      expect(result.topIssues).toHaveLength(2);
      expect(result.topIssues[0].category).toBe('relevance');
      expect(result.topIssues[0].count).toBe(2);
      expect(result.topIssues[0].percentage).toBeCloseTo(66.67, 1); // 2/3
      expect(result.topIssues[0].examples).toContain('Not relevant to my query');
    });

    it('should handle empty feedback gracefully', async () => {
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(JSON.stringify([]));

      const result = await store.analyze();

      expect(result.totalFeedback).toBe(0);
      expect(result.satisfactionRate).toBe(0);
      expect(result.topIssues).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('should delete feedback by id', async () => {
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;

      mockReadFile.mockResolvedValue(JSON.stringify([mockFeedback]));
      mockWriteFile.mockResolvedValue(undefined);

      const result = await store.delete(mockFeedback.id);

      expect(result).toBe(true);
      expect(mockWriteFile).toHaveBeenCalledWith(
        testFilePath,
        JSON.stringify([], null, 2),
        'utf-8'
      );
    });

    it('should return false for non-existent feedback', async () => {
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

      mockReadFile.mockResolvedValue(JSON.stringify([mockFeedback]));

      const result = await store.delete(createFeedbackId('non-existent'));

      expect(result).toBe(false);
    });
  });
});