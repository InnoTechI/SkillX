const winston = require('winston');
const path = require('path');

/**
 * Enhanced logging utility with multiple transports and log levels
 * Provides structured logging for debugging, monitoring, and audit trails
 */

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');
require('fs').mkdirSync(logDir, { recursive: true });

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Create winston logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: logFormat,
  defaultMeta: {
    service: 'skillx-admin-backend',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Error log file - only error level
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),
    
    // Combined log file - all levels
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: logFormat
    }),
    
    // HTTP requests log
    new winston.transports.File({
      filename: path.join(logDir, 'http.log'),
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 3
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 3
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

/**
 * Enhanced logging methods with context
 */
class Logger {
  constructor() {
    this.winston = logger;
  }

  /**
   * Log error with stack trace and context
   */
  error(message, error = null, context = {}) {
    const logData = {
      message,
      context,
      timestamp: new Date().toISOString()
    };

    if (error) {
      if (error instanceof Error) {
        logData.error = {
          message: error.message,
          stack: error.stack,
          name: error.name
        };
      } else {
        logData.error = error;
      }
    }

    this.winston.error(logData);
  }

  /**
   * Log warning with context
   */
  warn(message, context = {}) {
    this.winston.warn({
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log info with context
   */
  info(message, context = {}) {
    this.winston.info({
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log HTTP requests
   */
  http(message, requestData = {}) {
    this.winston.http({
      message,
      request: requestData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log debug information
   */
  debug(message, data = {}) {
    this.winston.debug({
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log authentication events
   */
  auth(action, userId, context = {}) {
    this.winston.info({
      message: `Authentication: ${action}`,
      userId,
      action,
      context,
      category: 'authentication',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log database operations
   */
  db(operation, collection, context = {}) {
    this.winston.debug({
      message: `Database: ${operation} on ${collection}`,
      operation,
      collection,
      context,
      category: 'database',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log API events
   */
  api(method, path, statusCode, duration, context = {}) {
    const level = statusCode >= 400 ? 'warn' : 'http';
    
    this.winston.log(level, {
      message: `API: ${method} ${path} - ${statusCode}`,
      method,
      path,
      statusCode,
      duration,
      context,
      category: 'api',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log business events (orders, payments, etc.)
   */
  business(event, entityType, entityId, context = {}) {
    this.winston.info({
      message: `Business: ${event} - ${entityType}:${entityId}`,
      event,
      entityType,
      entityId,
      context,
      category: 'business',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log security events
   */
  security(event, level = 'warn', context = {}) {
    this.winston.log(level, {
      message: `Security: ${event}`,
      event,
      context,
      category: 'security',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log file operations
   */
  file(operation, fileName, fileSize = null, context = {}) {
    this.winston.info({
      message: `File: ${operation} - ${fileName}`,
      operation,
      fileName,
      fileSize,
      context,
      category: 'file',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log payment events
   */
  payment(event, paymentId, amount = null, context = {}) {
    this.winston.info({
      message: `Payment: ${event} - ${paymentId}`,
      event,
      paymentId,
      amount,
      context,
      category: 'payment',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log performance metrics
   */
  performance(metric, value, unit = 'ms', context = {}) {
    this.winston.info({
      message: `Performance: ${metric} - ${value}${unit}`,
      metric,
      value,
      unit,
      context,
      category: 'performance',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Create child logger with persistent context
   */
  child(persistentContext = {}) {
    return {
      error: (message, error = null, context = {}) => 
        this.error(message, error, { ...persistentContext, ...context }),
      warn: (message, context = {}) => 
        this.warn(message, { ...persistentContext, ...context }),
      info: (message, context = {}) => 
        this.info(message, { ...persistentContext, ...context }),
      debug: (message, data = {}) => 
        this.debug(message, { ...persistentContext, ...data }),
      http: (message, requestData = {}) => 
        this.http(message, { ...persistentContext, ...requestData })
    };
  }

  /**
   * Create request logger with request context
   */
  forRequest(req) {
    const requestContext = {
      requestId: req.id || req.headers['x-request-id'] || 'unknown',
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user ? req.user.id : null
    };

    return this.child(requestContext);
  }

  /**
   * Flush all transports (useful for testing)
   */
  async flush() {
    return new Promise((resolve) => {
      this.winston.end(() => {
        resolve();
      });
    });
  }
}

// Create and export logger instance
const loggerInstance = new Logger();

// Express middleware for request logging
loggerInstance.middleware = (req, res, next) => {
  const start = Date.now();
  
  // Add request ID if not present
  if (!req.id && !req.headers['x-request-id']) {
    req.id = require('crypto').randomUUID();
  }

  // Create request logger
  req.logger = loggerInstance.forRequest(req);

  // Log request start
  req.logger.http('Request started', {
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;
    
    // Log response
    req.logger.api(
      req.method,
      req.originalUrl || req.url,
      res.statusCode,
      duration,
      {
        contentLength: res.get('content-length'),
        responseTime: duration
      }
    );

    // Call original end method
    originalEnd.apply(this, args);
  };

  next();
};

module.exports = loggerInstance;
