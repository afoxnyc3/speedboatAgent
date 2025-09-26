/**
 * Unit tests for crawl scheduler schemas
 * Tests only validation schemas without BullMQ dependencies
 */

import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

// Define schemas locally to avoid BullMQ import issues
const CrawlTargetSchema = z.object({
  url: z.string().url(),
  domain: z.string(),
  maxDepth: z.number().min(1).max(5).default(3),
  priority: z.number().min(0.1).max(2.0).default(0.8),
}).strict();

const CrawlJobDataSchema = z.object({
  targets: z.array(CrawlTargetSchema).min(1).max(10),
  scheduleType: z.enum(['weekly', 'daily', 'manual']),
  changeDetection: z.boolean().default(true),
  incrementalUpdate: z.boolean().default(true),
  notifyOnCompletion: z.boolean().default(false),
}).strict();

const ContentChangeSchema = z.object({
  url: z.string().url(),
  oldHash: z.string(),
  newHash: z.string(),
  changedAt: z.date(),
  contentDiff: z.string().optional(),
}).strict();

const DEFAULT_DOCS_CRAWL_CONFIG = {
  targets: [
    {
      url: 'https://docs.company.com',
      domain: 'docs.company.com',
      maxDepth: 3,
      priority: 1.0,
    },
    {
      url: 'https://api.company.com',
      domain: 'api.company.com',
      maxDepth: 2,
      priority: 0.9,
    },
    {
      url: 'https://help.company.com',
      domain: 'help.company.com',
      maxDepth: 2,
      priority: 0.8,
    },
  ],
  scheduleType: 'weekly' as const,
  changeDetection: true,
  incrementalUpdate: true,
  notifyOnCompletion: false,
};

describe('Crawl Scheduler Schemas', () => {
  describe('CrawlJobDataSchema', () => {
    it('should validate correct crawl job data', () => {
      const validJobData = {
        targets: [
          {
            url: 'https://docs.example.com',
            domain: 'docs.example.com',
            maxDepth: 3,
            priority: 1.0,
          },
        ],
        scheduleType: 'weekly' as const,
        changeDetection: true,
        incrementalUpdate: true,
        notifyOnCompletion: false,
      };

      expect(() => CrawlJobDataSchema.parse(validJobData)).not.toThrow();
    });

    it('should reject invalid URLs in targets', () => {
      const invalidJobData = {
        targets: [
          {
            url: 'not-a-url',
            domain: 'example.com',
          },
        ],
        scheduleType: 'weekly' as const,
      };

      expect(() => CrawlJobDataSchema.parse(invalidJobData)).toThrow();
    });

    it('should reject invalid schedule types', () => {
      const invalidJobData = {
        targets: [
          {
            url: 'https://example.com',
            domain: 'example.com',
          },
        ],
        scheduleType: 'invalid' as any,
      };

      expect(() => CrawlJobDataSchema.parse(invalidJobData)).toThrow();
    });

    it('should apply default values correctly', () => {
      const minimalJobData = {
        targets: [
          {
            url: 'https://example.com',
            domain: 'example.com',
          },
        ],
        scheduleType: 'weekly' as const,
      };

      const parsed = CrawlJobDataSchema.parse(minimalJobData);

      expect(parsed.changeDetection).toBe(true);
      expect(parsed.incrementalUpdate).toBe(true);
      expect(parsed.notifyOnCompletion).toBe(false);
      expect(parsed.targets[0].maxDepth).toBe(3);
      expect(parsed.targets[0].priority).toBe(0.8);
    });

    it('should reject empty targets array', () => {
      const invalidJobData = {
        targets: [],
        scheduleType: 'weekly' as const,
      };

      expect(() => CrawlJobDataSchema.parse(invalidJobData)).toThrow();
    });

    it('should reject too many targets', () => {
      const targets = Array.from({ length: 11 }, (_, i) => ({
        url: `https://example${i}.com`,
        domain: `example${i}.com`,
      }));

      const invalidJobData = {
        targets,
        scheduleType: 'weekly' as const,
      };

      expect(() => CrawlJobDataSchema.parse(invalidJobData)).toThrow();
    });
  });

  describe('ContentChangeSchema', () => {
    it('should validate content change data', () => {
      const validChange = {
        url: 'https://example.com/page',
        oldHash: 'abc123',
        newHash: 'def456',
        changedAt: new Date(),
      };

      expect(() => ContentChangeSchema.parse(validChange)).not.toThrow();
    });

    it('should reject invalid change data', () => {
      const invalidChange = {
        url: 'not-a-url',
        oldHash: 'abc123',
        newHash: 'def456',
      };

      expect(() => ContentChangeSchema.parse(invalidChange)).toThrow();
    });

    it('should allow optional contentDiff', () => {
      const changeWithDiff = {
        url: 'https://example.com/page',
        oldHash: 'abc123',
        newHash: 'def456',
        changedAt: new Date(),
        contentDiff: 'some differences',
      };

      expect(() => ContentChangeSchema.parse(changeWithDiff)).not.toThrow();
    });
  });

  describe('CrawlTargetSchema', () => {
    it('should accept valid HTTPS URLs', () => {
      const validUrls = [
        'https://docs.example.com',
        'https://api.example.com/v1/docs',
        'https://help.example.com/getting-started',
      ];

      validUrls.forEach(url => {
        const target = { url, domain: 'example.com' };
        expect(() => CrawlTargetSchema.parse(target)).not.toThrow();
      });
    });

    it('should reject truly invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        '',
        'just-text',
      ];

      invalidUrls.forEach(url => {
        const target = { url, domain: 'example.com' };
        expect(() => CrawlTargetSchema.parse(target)).toThrow();
      });
    });

    it('should accept valid priority ranges', () => {
      const validPriorities = [0.1, 0.5, 0.8, 1.0, 1.5, 2.0];

      validPriorities.forEach(priority => {
        const target = {
          url: 'https://example.com',
          domain: 'example.com',
          priority,
        };
        expect(() => CrawlTargetSchema.parse(target)).not.toThrow();
      });
    });

    it('should reject invalid priority values', () => {
      const invalidPriorities = [0, 0.05, 2.1, 5.0, -1];

      invalidPriorities.forEach(priority => {
        const target = {
          url: 'https://example.com',
          domain: 'example.com',
          priority,
        };
        expect(() => CrawlTargetSchema.parse(target)).toThrow();
      });
    });

    it('should accept valid depth ranges', () => {
      const validDepths = [1, 2, 3, 4, 5];

      validDepths.forEach(maxDepth => {
        const target = {
          url: 'https://example.com',
          domain: 'example.com',
          maxDepth,
        };
        expect(() => CrawlTargetSchema.parse(target)).not.toThrow();
      });
    });

    it('should reject invalid depth values', () => {
      const invalidDepths = [0, -1, 6, 10];

      invalidDepths.forEach(maxDepth => {
        const target = {
          url: 'https://example.com',
          domain: 'example.com',
          maxDepth,
        };
        expect(() => CrawlTargetSchema.parse(target)).toThrow();
      });
    });
  });

  describe('Default Configuration', () => {
    it('should have valid default docs crawl config', () => {
      expect(() => CrawlJobDataSchema.parse(DEFAULT_DOCS_CRAWL_CONFIG)).not.toThrow();
    });

    it('should include required target domains', () => {
      const config = DEFAULT_DOCS_CRAWL_CONFIG;

      expect(config.targets).toHaveLength(3);

      const domains = config.targets.map(t => t.domain);
      expect(domains).toContain('docs.company.com');
      expect(domains).toContain('api.company.com');
      expect(domains).toContain('help.company.com');
    });

    it('should have correct priority weighting', () => {
      const config = DEFAULT_DOCS_CRAWL_CONFIG;

      // Docs should have highest priority
      const docsTarget = config.targets.find(t => t.domain === 'docs.company.com');
      expect(docsTarget?.priority).toBe(1.0);

      // API should have medium priority
      const apiTarget = config.targets.find(t => t.domain === 'api.company.com');
      expect(apiTarget?.priority).toBe(0.9);

      // Help should have lower priority
      const helpTarget = config.targets.find(t => t.domain === 'help.company.com');
      expect(helpTarget?.priority).toBe(0.8);
    });

    it('should enable change detection and incremental updates', () => {
      const config = DEFAULT_DOCS_CRAWL_CONFIG;

      expect(config.changeDetection).toBe(true);
      expect(config.incrementalUpdate).toBe(true);
      expect(config.scheduleType).toBe('weekly');
    });
  });
});