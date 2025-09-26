/**
 * Web Crawl Scheduling Automation
 * Weekly crawl automation with change detection and incremental updates
 */

import { Queue, Worker, Job } from 'bullmq';
import { createHash } from 'crypto';
import { z } from 'zod';
import { getWebCrawler, WebCrawlRequest, WebCrawlResult } from './web-crawler';
import { createWeaviateClient } from '../weaviate/client';

// Redis connection for BullMQ
const redisConnection = {
  host: process.env.UPSTASH_REDIS_URL?.replace('redis://', '').split('@')[1]?.split(':')[0],
  port: parseInt(process.env.UPSTASH_REDIS_URL?.split(':')[3] || '6379'),
  password: process.env.UPSTASH_REDIS_TOKEN,
};

// Job data schemas
export const CrawlJobDataSchema = z.object({
  targets: z.array(z.object({
    url: z.string().url(),
    domain: z.string(),
    maxDepth: z.number().default(3),
    priority: z.number().default(0.8),
  })),
  scheduleType: z.enum(['weekly', 'daily', 'manual']),
  changeDetection: z.boolean().default(true),
  incrementalUpdate: z.boolean().default(true),
  notifyOnCompletion: z.boolean().default(false),
}).strict();

export const ContentChangeSchema = z.object({
  url: z.string().url(),
  oldHash: z.string(),
  newHash: z.string(),
  changedAt: z.date(),
  contentDiff: z.string().optional(),
}).strict();

export type CrawlJobData = z.infer<typeof CrawlJobDataSchema>;
export type ContentChange = z.infer<typeof ContentChangeSchema>;

// Job result interface
export interface CrawlJobResult {
  success: boolean;
  crawlResults: WebCrawlResult[];
  changesDetected: ContentChange[];
  documentsUpdated: number;
  executionTime: number;
  errors: string[];
}

/**
 * Content change detection service
 */
class ChangeDetectionService {
  private readonly client = createWeaviateClient();

  /**
   * Gets stored content hash for URL
   */
  async getStoredContentHash(url: string): Promise<string | null> {
    try {
      const result = await this.client.graphql
        .get()
        .withClassName('Document')
        .withFields('metadata { checksum }')
        .withWhere({
          operator: 'Equal',
          path: ['url'],
          valueString: url,
        })
        .withLimit(1)
        .do();

      const documents = result?.data?.Get?.Document;
      return documents?.[0]?.metadata?.checksum || null;
    } catch (error) {
      console.error(`Error getting stored hash for ${url}:`, error);
      return null;
    }
  }

  /**
   * Calculates content hash
   */
  calculateContentHash(content: string): string {
    return createHash('sha256').update(content.trim()).digest('hex');
  }

  /**
   * Detects content changes for a URL
   */
  async detectChange(url: string, newContent: string): Promise<ContentChange | null> {
    const oldHash = await this.getStoredContentHash(url);
    const newHash = this.calculateContentHash(newContent);

    if (!oldHash || oldHash === newHash) {
      return null; // No change detected
    }

    return {
      url,
      oldHash,
      newHash,
      changedAt: new Date(),
    };
  }

  /**
   * Batch change detection for multiple URLs
   */
  async detectChanges(results: WebCrawlResult[]): Promise<ContentChange[]> {
    const changes: ContentChange[] = [];

    for (const result of results) {
      if (!result.success) continue;

      for (const page of result.pages) {
        const change = await this.detectChange(page.url, page.content);
        if (change) {
          changes.push(change);
        }
      }
    }

    return changes;
  }
}

/**
 * Web crawl scheduler with automation capabilities
 */
export class CrawlScheduler {
  private readonly crawlQueue: Queue<CrawlJobData>;
  private readonly worker: Worker<CrawlJobData, CrawlJobResult>;
  private readonly changeDetector: ChangeDetectionService;

  constructor() {
    this.crawlQueue = new Queue<CrawlJobData>('web-crawl-queue', {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });

    this.changeDetector = new ChangeDetectionService();

    // Create worker to process crawl jobs
    this.worker = new Worker<CrawlJobData, CrawlJobResult>(
      'web-crawl-queue',
      this.processCrawlJob.bind(this),
      {
        connection: redisConnection,
        concurrency: 2, // Limit concurrent crawls
      }
    );

    this.worker.on('completed', (job, result) => {
      console.log(`✅ Crawl job ${job.id} completed:`, {
        documentsUpdated: result.documentsUpdated,
        changesDetected: result.changesDetected.length,
        executionTime: result.executionTime,
      });
    });

    this.worker.on('failed', (job, err) => {
      console.error(`❌ Crawl job ${job?.id} failed:`, err.message);
    });
  }

  /**
   * Processes individual crawl job
   */
  private async processCrawlJob(job: Job<CrawlJobData>): Promise<CrawlJobResult> {
    const startTime = Date.now();
    const { targets, changeDetection, incrementalUpdate } = job.data;

    try {
      console.log(`🕷️ Starting crawl job ${job.id} for ${targets.length} targets`);

      // Execute web crawl
      const crawler = getWebCrawler();
      const crawlRequest: WebCrawlRequest = {
        targets,
        forceRecrawl: !incrementalUpdate,
      };

      const crawlResults = await crawler.crawl(crawlRequest);

      // Detect changes if enabled
      let changesDetected: ContentChange[] = [];
      if (changeDetection) {
        changesDetected = await this.changeDetector.detectChanges(crawlResults);
      }

      // Count successful document updates
      const documentsUpdated = crawlResults.reduce(
        (total, result) => total + result.documentsCreated,
        0
      );

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        crawlResults,
        changesDetected,
        documentsUpdated,
        executionTime,
        errors: [],
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        crawlResults: [],
        changesDetected: [],
        documentsUpdated: 0,
        executionTime,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Schedules weekly crawl job
   */
  async scheduleWeeklyCrawl(jobData: CrawlJobData): Promise<string> {
    const validatedData = CrawlJobDataSchema.parse(jobData);

    const job = await this.crawlQueue.add(
      'weekly-crawl',
      validatedData,
      {
        repeat: {
          pattern: '0 2 * * 0', // Every Sunday at 2 AM
        },
        jobId: `weekly-crawl-${Date.now()}`,
      }
    );

    return job.id!;
  }

  /**
   * Schedules immediate crawl job
   */
  async scheduleImmediateCrawl(jobData: CrawlJobData): Promise<string> {
    const validatedData = CrawlJobDataSchema.parse({
      ...jobData,
      scheduleType: 'manual',
    });

    const job = await this.crawlQueue.add('immediate-crawl', validatedData);
    return job.id!;
  }

  /**
   * Gets job status and results
   */
  async getJobStatus(jobId: string): Promise<{
    status: string;
    progress: number;
    result?: CrawlJobResult;
    error?: string;
  }> {
    const job = await this.crawlQueue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    const progress = job.progress || 0;

    if (state === 'completed') {
      return {
        status: 'completed',
        progress: 100,
        result: job.returnvalue,
      };
    }

    if (state === 'failed') {
      return {
        status: 'failed',
        progress: 0,
        error: job.failedReason,
      };
    }

    return {
      status: state,
      progress: typeof progress === 'number' ? progress : 0,
    };
  }

  /**
   * Lists all scheduled jobs
   */
  async listScheduledJobs(): Promise<Array<{
    id: string;
    name: string;
    data: CrawlJobData;
    nextRun?: Date;
    status: string;
  }>> {
    const jobs = await this.crawlQueue.getJobs(['waiting', 'delayed', 'active']);

    return jobs.map(job => ({
      id: job.id!,
      name: job.name,
      data: job.data,
      nextRun: job.opts.delay ? new Date(Date.now() + job.opts.delay) : undefined,
      status: 'scheduled',
    }));
  }

  /**
   * Cancels a scheduled job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.crawlQueue.getJob(jobId);
    if (!job) return false;

    await job.remove();
    return true;
  }

  /**
   * Health check for scheduler
   */
  async healthCheck(): Promise<boolean> {
    try {
      const waiting = await this.crawlQueue.getWaiting();
      return Array.isArray(waiting);
    } catch {
      return false;
    }
  }

  /**
   * Cleanup method
   */
  async cleanup(): Promise<void> {
    await this.worker.close();
    await this.crawlQueue.close();
  }
}

// Singleton instance
let schedulerInstance: CrawlScheduler | null = null;

/**
 * Gets or creates scheduler singleton
 */
export function getCrawlScheduler(): CrawlScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new CrawlScheduler();
  }
  return schedulerInstance;
}

/**
 * Default documentation crawl configuration
 */
export const DEFAULT_DOCS_CRAWL_CONFIG: CrawlJobData = {
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
  scheduleType: 'weekly',
  changeDetection: true,
  incrementalUpdate: true,
  notifyOnCompletion: false,
};