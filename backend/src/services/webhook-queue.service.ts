/**
 * Webhook Queue Service
 * Handles async processing of Kommo webhooks using BullMQ
 *
 * Architecture:
 * 1. Webhook arrives → added to Redis queue → immediate 200 OK response
 * 2. Worker picks up job → processes webhook → sends AI response
 *
 * Benefits:
 * - Webhook response < 2 seconds (Kommo requirement)
 * - Parallel processing of multiple webhooks
 * - Automatic retries on failure
 * - Rate limiting built-in
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { isRedisAvailable, getRedisConfigForBullMQ } from '../config/redis';

// Queue names
export const WEBHOOK_QUEUE_NAME = 'kommo-webhooks';
export const AI_RESPONSE_QUEUE_NAME = 'ai-responses';

// Job types
export interface WebhookJobData {
  integrationId: string;
  agentId: string;
  payload: any;
  receivedAt: string;
  headers?: Record<string, string>;
}

export interface AIResponseJobData {
  integrationId: string;
  agentId: string;
  leadId: number;
  chatId: string;
  message: string;
  context?: any;
}

// Queue instances
let webhookQueue: Queue<WebhookJobData> | null = null;
let aiResponseQueue: Queue<AIResponseJobData> | null = null;
let webhookWorker: Worker<WebhookJobData> | null = null;
let aiResponseWorker: Worker<AIResponseJobData> | null = null;
let queueEvents: QueueEvents | null = null;

// Stats
const stats = {
  queued: 0,
  processed: 0,
  failed: 0,
  processingTime: [] as number[],
};

/**
 * Initialize webhook queue
 */
export async function initWebhookQueue(): Promise<boolean> {
  if (!isRedisAvailable()) {
    console.log('⚠️ Queue disabled - Redis not available');
    return false;
  }

  try {
    const redisConfig = getRedisConfigForBullMQ();

    // Create webhook queue
    webhookQueue = new Queue<WebhookJobData>(WEBHOOK_QUEUE_NAME, {
      connection: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          count: 1000, // Keep last 1000 completed jobs
          age: 24 * 3600, // Keep for 24 hours
        },
        removeOnFail: {
          count: 5000, // Keep last 5000 failed jobs
          age: 7 * 24 * 3600, // Keep for 7 days
        },
      },
    });

    // Create AI response queue with rate limiting
    aiResponseQueue = new Queue<AIResponseJobData>(AI_RESPONSE_QUEUE_NAME, {
      connection: redisConfig,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 2000,
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 3600,
        },
        removeOnFail: {
          count: 5000,
          age: 7 * 24 * 3600,
        },
      },
    });

    // Queue events for monitoring
    queueEvents = new QueueEvents(WEBHOOK_QUEUE_NAME, {
      connection: redisConfig,
    });

    queueEvents.on('completed', ({ jobId }) => {
      stats.processed++;
    });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      stats.failed++;
      console.error(`❌ Job ${jobId} failed:`, failedReason);
    });

    console.log('✅ Webhook queue initialized');
    return true;
  } catch (error: any) {
    console.error('❌ Failed to initialize webhook queue:', error.message);
    return false;
  }
}

/**
 * Add webhook to processing queue
 */
export async function enqueueWebhook(data: WebhookJobData): Promise<string | null> {
  if (!webhookQueue) {
    console.log('⚠️ Queue not available, processing synchronously');
    return null;
  }

  try {
    const job = await webhookQueue.add('process-webhook', data, {
      // Priority based on event type
      priority: getWebhookPriority(data.payload),
    });

    stats.queued++;
    console.log(`📥 Webhook queued: ${job.id}`);
    return job.id || null;
  } catch (error: any) {
    console.error('❌ Failed to queue webhook:', error.message);
    return null;
  }
}

/**
 * Add AI response to queue with rate limiting
 */
export async function enqueueAIResponse(data: AIResponseJobData): Promise<string | null> {
  if (!aiResponseQueue) {
    return null;
  }

  try {
    const job = await aiResponseQueue.add('generate-response', data);
    return job.id || null;
  } catch (error: any) {
    console.error('❌ Failed to queue AI response:', error.message);
    return null;
  }
}

/**
 * Get priority for webhook (lower = higher priority)
 */
function getWebhookPriority(payload: any): number {
  // Messages have highest priority
  if (payload.message?.add) return 1;
  // Talk events (chat state)
  if (payload.talk?.add || payload.talk?.update) return 2;
  // Lead updates
  if (payload.leads?.update) return 3;
  // Other events
  return 5;
}

/**
 * Start webhook worker
 */
export async function startWebhookWorker(
  processor: (job: Job<WebhookJobData>) => Promise<void>
): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const redisConfig = getRedisConfigForBullMQ();

    webhookWorker = new Worker<WebhookJobData>(
      WEBHOOK_QUEUE_NAME,
      async (job) => {
        const startTime = Date.now();
        console.log(`🔄 Processing webhook job ${job.id}...`);

        try {
          await processor(job);

          const duration = Date.now() - startTime;
          stats.processingTime.push(duration);

          // Keep only last 100 processing times for avg calculation
          if (stats.processingTime.length > 100) {
            stats.processingTime.shift();
          }

          console.log(`✅ Webhook job ${job.id} completed in ${duration}ms`);
        } catch (error: any) {
          console.error(`❌ Webhook job ${job.id} failed:`, error.message);
          throw error; // Rethrow to trigger retry
        }
      },
      {
        connection: redisConfig,
        concurrency: 5, // Process 5 webhooks in parallel
        limiter: {
          max: 10, // Max 10 jobs per duration
          duration: 1000, // Per second
        },
      }
    );

    webhookWorker.on('error', (err) => {
      console.error('❌ Webhook worker error:', err);
    });

    console.log('✅ Webhook worker started (concurrency: 5, rate: 10/sec)');
    return true;
  } catch (error: any) {
    console.error('❌ Failed to start webhook worker:', error.message);
    return false;
  }
}

/**
 * Start AI response worker with OpenRouter rate limiting
 */
export async function startAIResponseWorker(
  processor: (job: Job<AIResponseJobData>) => Promise<void>
): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const redisConfig = getRedisConfigForBullMQ();

    aiResponseWorker = new Worker<AIResponseJobData>(
      AI_RESPONSE_QUEUE_NAME,
      processor,
      {
        connection: redisConfig,
        concurrency: 3, // 3 parallel AI requests
        limiter: {
          max: 5, // Max 5 AI requests per second
          duration: 1000,
        },
      }
    );

    console.log('✅ AI Response worker started (concurrency: 3, rate: 5/sec)');
    return true;
  } catch (error: any) {
    console.error('❌ Failed to start AI response worker:', error.message);
    return false;
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  if (!webhookQueue) {
    return { enabled: false };
  }

  try {
    const [waiting, active, completed, failed] = await Promise.all([
      webhookQueue.getWaitingCount(),
      webhookQueue.getActiveCount(),
      webhookQueue.getCompletedCount(),
      webhookQueue.getFailedCount(),
    ]);

    const avgProcessingTime = stats.processingTime.length > 0
      ? Math.round(stats.processingTime.reduce((a, b) => a + b, 0) / stats.processingTime.length)
      : 0;

    return {
      enabled: true,
      queued: stats.queued,
      processed: stats.processed,
      failed: stats.failed,
      waiting,
      active,
      completed,
      avgProcessingTimeMs: avgProcessingTime,
    };
  } catch (error) {
    return { enabled: true, error: 'Failed to get stats' };
  }
}

/**
 * Check if queue is available
 */
export function isQueueAvailable(): boolean {
  return webhookQueue !== null;
}

/**
 * Close all queues and workers
 */
export async function closeQueues(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  if (webhookWorker) {
    closePromises.push(webhookWorker.close());
  }
  if (aiResponseWorker) {
    closePromises.push(aiResponseWorker.close());
  }
  if (queueEvents) {
    closePromises.push(queueEvents.close());
  }
  if (webhookQueue) {
    closePromises.push(webhookQueue.close());
  }
  if (aiResponseQueue) {
    closePromises.push(aiResponseQueue.close());
  }

  await Promise.all(closePromises);

  webhookQueue = null;
  aiResponseQueue = null;
  webhookWorker = null;
  aiResponseWorker = null;
  queueEvents = null;

  console.log('👋 Queues closed');
}

export default {
  initWebhookQueue,
  enqueueWebhook,
  enqueueAIResponse,
  startWebhookWorker,
  startAIResponseWorker,
  getQueueStats,
  isQueueAvailable,
  closeQueues,
};
