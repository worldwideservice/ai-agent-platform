import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Custom error classes
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;
  details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(
      `External service error: ${service}`,
      502,
      'EXTERNAL_SERVICE_ERROR',
      { service, originalError: originalError?.message }
    );
  }
}

export class DatabaseError extends AppError {
  constructor(operation: string, originalError?: Error) {
    super(
      `Database error during ${operation}`,
      500,
      'DATABASE_ERROR',
      { operation, originalError: originalError?.message }
    );
  }
}

// Error response interface
interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: any;
  stack?: string;
  requestId?: string;
}

// Generate request ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Main error handler middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Generate request ID for tracking
  const requestId = generateRequestId();

  // Determine if it's an operational error
  const isOperational = err instanceof AppError && err.isOperational;

  // Get status code
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  // Build error response
  const errorResponse: ErrorResponse = {
    error: getErrorName(statusCode),
    message: isOperational ? err.message : 'An unexpected error occurred',
    requestId,
  };

  // Add error code if available
  if (err instanceof AppError && err.code) {
    errorResponse.code = err.code;
  }

  // Add details in development or for validation errors
  if (
    err instanceof AppError &&
    err.details &&
    (process.env.NODE_ENV === 'development' || err instanceof ValidationError)
  ) {
    errorResponse.details = err.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  // Log the error
  const logData = {
    requestId,
    statusCode,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: (req as any).userId,
    userAgent: req.get('user-agent'),
    error: {
      name: err.name,
      message: err.message,
      code: err instanceof AppError ? err.code : undefined,
      stack: err.stack,
    },
  };

  if (statusCode >= 500) {
    logger.error('Server error', logData);
  } else if (statusCode >= 400) {
    logger.warn('Client error', logData);
  }

  // Send response
  res.status(statusCode).json(errorResponse);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  const requestId = generateRequestId();

  logger.warn('Route not found', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    requestId,
  });
};

// Async handler wrapper to catch async errors
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Helper to get error name from status code
function getErrorName(statusCode: number): string {
  const errorNames: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };

  return errorNames[statusCode] || 'Error';
}

// Prisma error handler
export const handlePrismaError = (error: any): AppError => {
  // Prisma unique constraint violation
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    return new ConflictError(`A record with this ${field} already exists`);
  }

  // Prisma record not found
  if (error.code === 'P2025') {
    return new NotFoundError('Record');
  }

  // Prisma foreign key constraint
  if (error.code === 'P2003') {
    return new ValidationError('Invalid reference to related record');
  }

  // Default database error
  return new DatabaseError('database operation', error);
};

export default errorHandler;
