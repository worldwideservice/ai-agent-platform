/**
 * Webhook Queue Worker
 *
 * Processes Kommo webhooks from Redis queue
 * Can be run as separate process or integrated into main app
 *
 * Usage:
 * - As separate process: npx tsx src/workers/webhook.worker.ts
 * - Integrated: import and call startWebhookWorkers()
 */

import { Job } from 'bullmq';
import { initRedis, closeRedis } from '../config/redis';
import {
  initWebhookQueue,
  startWebhookWorker,
  closeQueues,
  WebhookJobData,
} from '../services/webhook-queue.service';
import { processWebhookAsync } from '../controllers/kommo';

// Track if running as standalone
const isStandalone = require.main === module;

/**
 * Process a single webhook job
 */
async function processWebhookJob(job: Job<WebhookJobData>): Promise<void> {
  const { payload, receivedAt } = job.data;

  console.log(`🔄 Processing webhook job ${job.id}`);
  console.log(`   Received at: ${receivedAt}`);
  console.log(`   Payload keys: ${Object.keys(payload).join(', ')}`);

  // Calculate processing delay
  const delay = Date.now() - new Date(receivedAt).getTime();
  console.log(`   Queue delay: ${delay}ms`);

  // Process the webhook using existing logic
  await processWebhookAsync(payload);

  console.log(`✅ Webhook job ${job.id} processed successfully`);
}

/**
 * Start webhook workers
 * Call this from main app to enable queue processing
 */
export async function startWebhookWorkers(): Promise<boolean> {
  console.log('🚀 Starting webhook workers...');

  // Initialize Redis
  const redisOk = await initRedis();
  if (!redisOk) {
    console.log('⚠️ Redis not available - workers not started');
    return false;
  }

  // Initialize queue
  const queueOk = await initWebhookQueue();
  if (!queueOk) {
    console.log('⚠️ Queue initialization failed - workers not started');
    return false;
  }

  // Start worker
  const workerOk = await startWebhookWorker(processWebhookJob);
  if (!workerOk) {
    console.log('⚠️ Worker start failed');
    return false;
  }

  console.log('✅ Webhook workers started successfully');
  console.log('   Concurrency: 5 parallel jobs');
  console.log('   Rate limit: 10 jobs/second');

  return true;
}

/**
 * Graceful shutdown
 */
export async function stopWebhookWorkers(): Promise<void> {
  console.log('🛑 Stopping webhook workers...');
  await closeQueues();
  await closeRedis();
  console.log('👋 Webhook workers stopped');
}

// Run as standalone worker if executed directly
if (isStandalone) {
  console.log('='.repeat(50));
  console.log('   Webhook Worker - Standalone Mode');
  console.log('='.repeat(50));

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n📴 Received SIGINT, shutting down...');
    await stopWebhookWorkers();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n📴 Received SIGTERM, shutting down...');
    await stopWebhookWorkers();
    process.exit(0);
  });

  // Start workers
  startWebhookWorkers()
    .then(ok => {
      if (!ok) {
        console.error('❌ Failed to start workers');
        process.exit(1);
      }
      console.log('🎯 Worker running, waiting for jobs...');
    })
    .catch(err => {
      console.error('❌ Worker error:', err);
      process.exit(1);
    });
}

export default {
  startWebhookWorkers,
  stopWebhookWorkers,
};
