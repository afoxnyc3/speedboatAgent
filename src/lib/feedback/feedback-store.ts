import fs from 'fs/promises';
import path from 'path';
import {
  type Feedback,
  type FeedbackStore,
  type FeedbackResponse,
  type FeedbackListOptions,
  type FeedbackAnalytics,
  type FeedbackAnalysisOptions,
  type FeedbackId,
  type FeedbackIssue,
  FEEDBACK_CONSTANTS,
} from '@/types/feedback';

/**
 * File-based feedback storage implementation
 * In production, this would be replaced with a database
 */
export class FeedbackFileStore implements FeedbackStore {
  private readonly dataDir: string;
  private readonly filePath: string;

  constructor(dataDir = './data/feedback') {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, 'feedback.json');
  }

  async save(feedback: Feedback): Promise<FeedbackResponse> {
    try {
      await this.ensureDataDir();
      const feedbackList = await this.loadFeedback();
      feedbackList.push(feedback);
      await this.saveFeedback(feedbackList);

      return {
        success: true,
        feedbackId: feedback.id,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to save feedback:', error);
      return {
        success: false,
        error: 'Failed to save feedback',
        timestamp: new Date(),
      };
    }
  }

  async get(id: FeedbackId): Promise<Feedback | null> {
    try {
      const feedbackList = await this.loadFeedback();
      return feedbackList.find(f => f.id === id) || null;
    } catch (error) {
      console.error('Failed to get feedback:', error);
      return null;
    }
  }

  async list(options?: FeedbackListOptions): Promise<readonly Feedback[]> {
    try {
      const feedbackList = await this.loadFeedback();
      let filtered = [...feedbackList];

      if (options?.conversationId) {
        filtered = filtered.filter(f => f.conversationId === options.conversationId);
      }

      if (options?.type) {
        filtered = filtered.filter(f => f.type === options.type);
      }

      if (options?.category) {
        filtered = filtered.filter(f => f.category === options.category);
      }

      if (options?.startDate) {
        filtered = filtered.filter(f => new Date(f.timestamp) >= options.startDate!);
      }

      if (options?.endDate) {
        filtered = filtered.filter(f => new Date(f.timestamp) <= options.endDate!);
      }

      // Sort by timestamp descending
      filtered.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Apply pagination
      const offset = options?.offset || 0;
      const limit = Math.min(
        options?.limit || FEEDBACK_CONSTANTS.DEFAULT_LIST_LIMIT,
        FEEDBACK_CONSTANTS.MAX_LIST_LIMIT
      );

      return filtered.slice(offset, offset + limit);
    } catch (error) {
      console.error('Failed to list feedback:', error);
      return [];
    }
  }

  async analyze(options?: FeedbackAnalysisOptions): Promise<FeedbackAnalytics> {
    try {
      const feedbackList = await this.loadFeedback();

      const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = options?.endDate || new Date();

      const filtered = feedbackList.filter(f => {
        const timestamp = new Date(f.timestamp);
        return timestamp >= startDate && timestamp <= endDate;
      });

      const thumbsUp = filtered.filter(f => f.type === 'thumbs_up').length;
      const thumbsDown = filtered.filter(f => f.type === 'thumbs_down').length;
      const total = filtered.length;

      // Calculate satisfaction rate
      const satisfactionRate = total > 0 ? thumbsUp / (thumbsUp + thumbsDown) : 0;

      // Identify top issues
      const issueCategories: Record<string, FeedbackIssue> = {};

      filtered
        .filter(f => f.type === 'thumbs_down' && f.category)
        .forEach(f => {
          const category = f.category!;
          if (!issueCategories[category]) {
            issueCategories[category] = {
              category,
              count: 0,
              percentage: 0,
              examples: [],
            };
          }
          issueCategories[category].count++;
          if (f.comment && issueCategories[category].examples.length < 3) {
            issueCategories[category].examples.push(f.comment);
          }
        });

      // Calculate percentages
      const negativeTotal = thumbsDown || 1;
      Object.values(issueCategories).forEach(issue => {
        issue.percentage = (issue.count / negativeTotal) * 100;
      });

      // Sort by count and get top issues
      const topIssues = Object.values(issueCategories)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalFeedback: total,
        thumbsUp,
        thumbsDown,
        satisfactionRate,
        topIssues,
        periodStart: startDate,
        periodEnd: endDate,
      };
    } catch (error) {
      console.error('Failed to analyze feedback:', error);
      return {
        totalFeedback: 0,
        thumbsUp: 0,
        thumbsDown: 0,
        satisfactionRate: 0,
        topIssues: [],
        periodStart: new Date(),
        periodEnd: new Date(),
      };
    }
  }

  async delete(id: FeedbackId): Promise<boolean> {
    try {
      const feedbackList = await this.loadFeedback();
      const filtered = feedbackList.filter(f => f.id !== id);

      if (filtered.length === feedbackList.length) {
        return false; // Nothing was deleted
      }

      await this.saveFeedback(filtered);
      return true;
    } catch (error) {
      console.error('Failed to delete feedback:', error);
      return false;
    }
  }

  // Private helper methods
  private async ensureDataDir(): Promise<void> {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  private async loadFeedback(): Promise<Feedback[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  private async saveFeedback(feedbackList: Feedback[]): Promise<void> {
    await fs.writeFile(this.filePath, JSON.stringify(feedbackList, null, 2), 'utf-8');
  }
}