import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import logger from '../utils/logger';

// Store for tracking rate limit hits (for logging)
const rateLimitHits = new Map<string, number>();

// Helper to get client IP
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
};

// Generic rate limiter factory
const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  name: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: 'Too Many Requests',
      message: options.message || 'Too many requests, please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise use IP
      const userId = (req as any).userId;
      return userId || getClientIp(req);
    },
    handler: (req: Request, res: Response) => {
      const ip = getClientIp(req);
      const key = `${options.name}:${ip}`;

      // Track hits for logging
      const hits = (rateLimitHits.get(key) || 0) + 1;
      rateLimitHits.set(key, hits);

      // Log security event
      logger.warn('Rate limit exceeded', {
        limiter: options.name,
        ip,
        userId: (req as any).userId,
        path: req.path,
        method: req.method,
        hits,
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: options.message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      if (req.path === '/health' || req.path === '/health/stats') {
        return true;
      }
      return false;
    },
  });
};

// Global rate limiter - applies to all routes
export const globalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  name: 'global',
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});

// Auth rate limiter - stricter for login/register
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  name: 'auth',
  message: 'Too many authentication attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true, // Only count failed attempts
});

// API rate limiter - for authenticated API calls
export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  name: 'api',
  message: 'Too many API requests, please slow down.',
});

// Chat rate limiter - for AI chat endpoints
export const chatLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 chat messages per minute
  name: 'chat',
  message: 'Too many chat messages, please wait a moment.',
});

// Webhook rate limiter - for incoming webhooks
export const webhookLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 webhooks per minute
  name: 'webhook',
  message: 'Too many webhook requests.',
});

// Upload rate limiter - for file uploads
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  name: 'upload',
  message: 'Too many file uploads, please try again later.',
});

// Strict limiter for sensitive operations
export const strictLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  name: 'strict',
  message: 'Too many attempts for this operation, please try again later.',
});

// Export individual limiters for specific routes
export default {
  global: globalLimiter,
  auth: authLimiter,
  api: apiLimiter,
  chat: chatLimiter,
  webhook: webhookLimiter,
  upload: uploadLimiter,
  strict: strictLimiter,
};
