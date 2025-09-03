const logger = require('../utils/logger');

/**
 * Enhanced error handling middleware for SkillX Admin Backend
 * Provides consistent error responses and comprehensive logging
 */

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode = null, isOperational = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database error handler
 */
const handleDatabaseError = (error) => {
  let message = 'Database operation failed';
  let statusCode = 500;
  let errorCode = 'DATABASE_ERROR';

  // MongoDB duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
    statusCode = 400;
    errorCode = 'DUPLICATE_FIELD';
  }

  // MongoDB validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    message = `Validation failed: ${errors.join(', ')}`;
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  }

  // MongoDB cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    message = `Invalid ${error.path}: ${error.value}`;
    statusCode = 400;
    errorCode = 'INVALID_ID';
  }

  // MongoDB connection error
  if (error.name === 'MongooseError' || error.name === 'MongoError') {
    message = 'Database connection error';
    statusCode = 503;
    errorCode = 'DATABASE_CONNECTION_ERROR';
  }

  return new AppError(message, statusCode, errorCode);
};

/**
 * JWT error handler
 */
const handleJWTError = (error) => {
  let message = 'Authentication failed';
  let statusCode = 401;
  let errorCode = 'AUTH_ERROR';

  if (error.name === 'JsonWebTokenError') {
    message = 'Invalid token';
    errorCode = 'INVALID_TOKEN';
  }

  if (error.name === 'TokenExpiredError') {
    message = 'Token expired';
    errorCode = 'TOKEN_EXPIRED';
  }

  return new AppError(message, statusCode, errorCode);
};

/**
 * Cloudinary error handler
 */
const handleCloudinaryError = (error) => {
  let message = 'File operation failed';
  let statusCode = 500;
  let errorCode = 'FILE_ERROR';

  if (error.http_code) {
    statusCode = error.http_code;
    
    switch (error.http_code) {
      case 400:
        message = 'Invalid file or parameters';
        errorCode = 'INVALID_FILE';
        break;
      case 401:
        message = 'Cloudinary authentication failed';
        errorCode = 'CLOUDINARY_AUTH_ERROR';
        break;
      case 413:
        message = 'File size too large';
        errorCode = 'FILE_TOO_LARGE';
        break;
      case 415:
        message = 'Unsupported file type';
        errorCode = 'UNSUPPORTED_FILE_TYPE';
        break;
      case 420:
        message = 'Rate limit exceeded';
        errorCode = 'RATE_LIMIT_EXCEEDED';
        break;
      default:
        message = error.message || 'File operation failed';
    }
  }

  return new AppError(message, statusCode, errorCode);
};

/**
 * Multer error handler
 */
const handleMulterError = (error) => {
  let message = 'File upload failed';
  let statusCode = 400;
  let errorCode = 'FILE_UPLOAD_ERROR';

  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      message = 'File size too large';
      errorCode = 'FILE_SIZE_LIMIT_EXCEEDED';
      break;
    case 'LIMIT_FILE_COUNT':
      message = 'Too many files';
      errorCode = 'FILE_COUNT_LIMIT_EXCEEDED';
      break;
    case 'LIMIT_FIELD_KEY':
      message = 'Field name too long';
      errorCode = 'FIELD_NAME_TOO_LONG';
      break;
    case 'LIMIT_FIELD_VALUE':
      message = 'Field value too long';
      errorCode = 'FIELD_VALUE_TOO_LONG';
      break;
    case 'LIMIT_FIELD_COUNT':
      message = 'Too many fields';
      errorCode = 'FIELD_COUNT_LIMIT_EXCEEDED';
      break;
    case 'LIMIT_UNEXPECTED_FILE':
      message = 'Unexpected file';
      errorCode = 'UNEXPECTED_FILE';
      break;
    default:
      message = error.message || 'File upload failed';
  }

  return new AppError(message, statusCode, errorCode);
};

/**
 * Production error response
 */
const sendErrorProd = (err, req, res) => {
  // Log error details
  logger.error('Production error', err, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: req.body
  });

  // Operational errors - send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.errorCode || 'OPERATIONAL_ERROR',
      timestamp: new Date().toISOString(),
      requestId: req.id || req.headers['x-request-id']
    });
  }

  // Programming errors - don't leak error details
  return res.status(500).json({
    success: false,
    message: 'Something went wrong',
    error: 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString(),
    requestId: req.id || req.headers['x-request-id']
  });
};

/**
 * Development error response
 */
const sendErrorDev = (err, req, res) => {
  // Log error details
  logger.error('Development error', err, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: req.body
  });

  // Send detailed error information in development
  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message,
    error: err.errorCode || 'DEVELOPMENT_ERROR',
    stack: err.stack,
    timestamp: new Date().toISOString(),
    requestId: req.id || req.headers['x-request-id'],
    details: {
      name: err.name,
      statusCode: err.statusCode,
      isOperational: err.isOperational,
      originalError: err.originalError
    }
  });
};

/**
 * Main error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Set default error properties
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Create a copy of the error
  let error = { ...err };
  error.message = err.message;

  // Handle specific error types
  if (err.name === 'CastError' || err.name === 'ValidationError' || err.code === 11000) {
    error = handleDatabaseError(err);
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  }

  if (err.http_code || (err.name && err.name.includes('Cloudinary'))) {
    error = handleCloudinaryError(err);
  }

  if (err.code && err.code.startsWith('LIMIT_')) {
    error = handleMulterError(err);
  }

  // Handle Mongoose connection errors
  if (err.name === 'MongooseError' || err.name === 'MongoNetworkError') {
    error = new AppError('Database connection failed', 503, 'DATABASE_CONNECTION_ERROR');
  }

  // Handle timeout errors
  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
    error = new AppError('Request timeout', 408, 'REQUEST_TIMEOUT');
  }

  // Handle CORS errors
  if (err.message && err.message.includes('CORS')) {
    error = new AppError('CORS policy violation', 403, 'CORS_ERROR');
  }

  // Handle rate limiting errors
  if (err.message && err.message.includes('rate limit')) {
    error = new AppError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
  }

  // Send error response based on environment
  if (process.env.NODE_ENV === 'production') {
    sendErrorProd(error, req, res);
  } else {
    sendErrorDev(error, req, res);
  }
};

/**
 * Handle unhandled routes (404)
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  
  next(error);
};

/**
 * Async error wrapper
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global unhandled rejection handler
 */
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection', err, {
    promise: promise.toString()
  });
  
  // In production, you might want to gracefully shut down
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

/**
 * Global uncaught exception handler
 */
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err);
  
  // Gracefully shut down
  process.exit(1);
});

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  catchAsync,
  handleDatabaseError,
  handleJWTError,
  handleCloudinaryError,
  handleMulterError
};
