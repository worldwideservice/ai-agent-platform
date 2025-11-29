import winston from 'winston';
import path from 'path';

// Custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Level colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const configLevel = process.env.LOG_LEVEL;

  if (configLevel) {
    return configLevel;
  }

  return env === 'development' ? 'debug' : 'info';
};

// Custom format for structured logging
const structuredFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

// JSON format for production (easy to parse by log aggregators)
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.errors({ stack: true }),
  structuredFormat
);

// File format (always JSON for easy parsing)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Log directory
const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// Create transports
const transports: winston.transport[] = [
  // Console transport (always enabled)
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat,
  }),
];

// Add file transports in production or when LOG_TO_FILE is set
if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
    // HTTP requests log file
    new winston.transports.File({
      filename: path.join(logDir, 'http.log'),
      level: 'http',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3,
      tailable: true,
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  exitOnError: false,
});

// Create child loggers for different modules
export const createModuleLogger = (moduleName: string) => {
  return logger.child({ module: moduleName });
};

// HTTP request logger middleware for Morgan
export const httpLoggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper methods for structured logging
export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error(error.message, {
    stack: error.stack,
    name: error.name,
    ...context,
  });
};

export const logRequest = (req: any, res: any, duration: number) => {
  logger.http('HTTP Request', {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.userId,
  });
};

export const logDatabaseQuery = (query: string, duration: number, params?: any[]) => {
  logger.debug('Database Query', {
    query: query.substring(0, 200),
    duration: `${duration}ms`,
    params: params ? params.length : 0,
  });
};

export const logExternalApi = (
  service: string,
  method: string,
  url: string,
  status: number,
  duration: number
) => {
  logger.info('External API Call', {
    service,
    method,
    url,
    status,
    duration: `${duration}ms`,
  });
};

export const logWebhook = (
  source: string,
  eventType: string,
  success: boolean,
  details?: Record<string, any>
) => {
  logger.info('Webhook Processed', {
    source,
    eventType,
    success,
    ...details,
  });
};

export const logAgentResponse = (
  agentId: string,
  model: string,
  tokensUsed: number,
  duration: number,
  success: boolean
) => {
  logger.info('Agent Response', {
    agentId,
    model,
    tokensUsed,
    duration: `${duration}ms`,
    success,
  });
};

export const logSubscriptionEvent = (
  userId: string,
  event: string,
  plan: string,
  details?: Record<string, any>
) => {
  logger.info('Subscription Event', {
    userId,
    event,
    plan,
    ...details,
  });
};

export const logSecurityEvent = (
  event: string,
  ip: string,
  userId?: string,
  details?: Record<string, any>
) => {
  logger.warn('Security Event', {
    event,
    ip,
    userId,
    ...details,
  });
};

export default logger;
