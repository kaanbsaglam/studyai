/**
 * Error Handling
 * 
 * Custom error classes and Express error handling middleware.
 * This provides consistent error responses across the API.
 * 
 * Usage:
 *   throw new AppError('Resource not found', 404);
 *   throw new ValidationError('Invalid email format');
 */

const logger = require('../config/logger');

/**
 * Base application error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Distinguishes expected errors from bugs
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

/**
 * Authentication error (401)
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization error (403)
 */
class AuthorizationError extends AppError {
  constructor(message = 'Permission denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Not found error (404)
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Rate limit error (429)
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * Express error handling middleware
 * Must be registered AFTER all routes
 */
function errorHandler(err, req, res, next) {
  // Default values
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Something went wrong';
  let details = err.details || null;

  // Handle Prisma errors
  if (err.code === 'P2002') {
    // Unique constraint violation
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'A record with this value already exists';
  } else if (err.code === 'P2025') {
    // Record not found
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Record not found';
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid request data';
    details = err.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message
    }));
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }

  // Log error (with stack trace for unexpected errors)
  if (statusCode >= 500) {
    logger.error('Internal server error', {
      error: message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.warn('Client error', {
      code,
      message,
      path: req.path,
      method: req.method,
    });
  }

  // In production, don't expose internal error details
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    message = 'Internal server error';
    details = null;
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  });
}

/**
 * Async handler wrapper
 * Catches async errors and passes them to the error handler
 * 
 * Usage:
 *   router.get('/users', asyncHandler(async (req, res) => {
 *     const users = await prisma.user.findMany();
 *     res.json(users);
 *   }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  errorHandler,
  asyncHandler,
};
