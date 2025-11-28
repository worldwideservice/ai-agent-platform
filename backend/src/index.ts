import 'dotenv/config';
import app from './app';
import { startWebhookWorkers, stopWebhookWorkers } from './workers/webhook.worker';
import subscriptionService from './services/subscription.service';

const PORT = process.env.PORT || 3001;

// Интервал проверки подписок (каждый час)
const SUBSCRIPTION_CHECK_INTERVAL = 60 * 60 * 1000; // 1 час
let subscriptionCheckInterval: NodeJS.Timeout | null = null;

// Функция для проверки истёкших подписок
async function checkExpiredSubscriptions() {
  try {
    const result = await subscriptionService.processExpiredSubscriptions();
    if (result.movedToGracePeriod > 0 || result.movedToExpired > 0 || result.expiredTrials > 0) {
      console.log(`📋 Subscription check: ${result.movedToGracePeriod} to grace period, ${result.movedToExpired} expired, ${result.expiredTrials} trials expired`);
    }
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
  }
}

// Initialize server and optional workers
async function startServer() {
  // Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
  });

  // Start webhook workers if Redis is configured
  const workersEnabled = await startWebhookWorkers();
  if (workersEnabled) {
    console.log('📦 Queue mode: ENABLED (Redis connected)');
  } else {
    console.log('📦 Queue mode: DISABLED (using sync processing)');
  }

  // Start subscription expiration checker
  await checkExpiredSubscriptions(); // Run immediately on startup
  subscriptionCheckInterval = setInterval(checkExpiredSubscriptions, SUBSCRIPTION_CHECK_INTERVAL);
  console.log('⏰ Subscription checker: ENABLED (every hour)');

  console.log('');
  console.log('='.repeat(50));
  console.log('   Server ready for connections');
  console.log('='.repeat(50));

  return server;
}

// Start the server
startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n👋 ${signal} signal received: shutting down gracefully...`);

  // Stop subscription checker
  if (subscriptionCheckInterval) {
    clearInterval(subscriptionCheckInterval);
    subscriptionCheckInterval = null;
  }

  try {
    await stopWebhookWorkers();
  } catch (err) {
    console.error('Error stopping workers:', err);
  }

  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
