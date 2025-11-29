/**
 * Redis Configuration for BullMQ
 * Supports both local Redis and Upstash (serverless Redis)
 *
 * Configuration options (in order of priority):
 * 1. REDIS_URL - Full Redis URL (rediss://default:password@host:port)
 * 2. UPSTASH_REDIS_URL - Upstash Redis URL (rediss://...)
 * 3. UPSTASH_REDIS_HOST + UPSTASH_REDIS_PORT + UPSTASH_REDIS_PASSWORD
 *
 * For Upstash, get these from: https://console.upstash.com
 * Navigate to your database -> "Redis" tab -> Copy connection details
 */

import Redis from 'ioredis';

// Note: Retries are handled by BullMQ job options, not at Redis connection level
// const REDIS_MAX_RETRIES = 3;

// Parse Redis URL or use Upstash config
function getRedisConfig() {
  // Priority 1: Full REDIS_URL (works with any Redis including Upstash)
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      const useTls = url.protocol === 'rediss:';

      return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        username: url.username || 'default',
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false,
        lazyConnect: true,
        // TLS for Upstash (rediss://)
        ...(useTls ? { tls: { rejectUnauthorized: false } } : {}),
      };
    } catch (err) {
      console.error('❌ Invalid REDIS_URL format:', err);
    }
  }

  // Priority 2: Individual Upstash config
  if (process.env.UPSTASH_REDIS_HOST && process.env.UPSTASH_REDIS_PASSWORD) {
    return {
      host: process.env.UPSTASH_REDIS_HOST,
      port: parseInt(process.env.UPSTASH_REDIS_PORT || '6379'),
      password: process.env.UPSTASH_REDIS_PASSWORD,
      username: 'default',
      tls: { rejectUnauthorized: false }, // Upstash requires TLS
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      lazyConnect: true,
    };
  }

  // Priority 3: Local Redis (development)
  if (process.env.NODE_ENV === 'development' && process.env.LOCAL_REDIS === 'true') {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    };
  }

  // No Redis configured
  return null;
}

// Singleton Redis connection
let redisConnection: Redis | null = null;
let isRedisEnabled = false;

/**
 * Get or create Redis connection
 */
export function getRedisConnection(): Redis | null {
  if (!isRedisEnabled) {
    return null;
  }

  if (redisConnection) {
    return redisConnection;
  }

  const config = getRedisConfig();
  if (!config) {
    return null;
  }

  redisConnection = new Redis(config);

  redisConnection.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  redisConnection.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
  });

  redisConnection.on('close', () => {
    console.log('📴 Redis connection closed');
  });

  return redisConnection;
}

/**
 * Initialize Redis connection
 */
export async function initRedis(): Promise<boolean> {
  // Check if Redis is configured
  const config = getRedisConfig();
  if (!config) {
    console.log('⚠️ Redis not configured - running in sync mode (without queue)');
    console.log('   To enable queue mode, set one of:');
    console.log('   - REDIS_URL=rediss://default:password@host:port');
    console.log('   - UPSTASH_REDIS_URL=rediss://default:password@host:port');
    console.log('   - UPSTASH_REDIS_HOST + UPSTASH_REDIS_PASSWORD');
    isRedisEnabled = false;
    return false;
  }

  // Mark as enabled before connecting (needed for getRedisConnection)
  isRedisEnabled = true;

  try {
    const connection = getRedisConnection();
    if (!connection) {
      isRedisEnabled = false;
      return false;
    }

    // Connect and test
    await connection.connect();
    await connection.ping();
    console.log('✅ Redis connection verified');
    console.log(`   Host: ${config.host}:${config.port}`);
    return true;
  } catch (error: any) {
    console.error('❌ Redis connection failed:', error.message);
    console.log('⚠️ Falling back to sync mode (without queue)');
    isRedisEnabled = false;
    redisConnection = null;
    return false;
  }
}

/**
 * Check if Redis is enabled and connected
 */
export function isRedisAvailable(): boolean {
  return isRedisEnabled && redisConnection !== null;
}

/**
 * Get Redis config for BullMQ
 * Returns null if Redis is not configured
 */
export function getRedisConfigForBullMQ(): ReturnType<typeof getRedisConfig> {
  if (!isRedisEnabled) {
    return null;
  }
  return getRedisConfig();
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
    isRedisEnabled = false;
    console.log('👋 Redis disconnected');
  }
}

export default {
  getRedisConnection,
  initRedis,
  isRedisAvailable,
  getRedisConfigForBullMQ,
  closeRedis,
};
