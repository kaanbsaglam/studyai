/**
 * Logger Configuration (Winston)
 * 
 * Provides structured logging with different levels and formats for
 * development vs production environments.
 * 
 * Usage:
 *   const logger = require('./config/logger');
 *   logger.info('Server started', { port: 3000 });
 *   logger.error('Database connection failed', { error: err.message });
 */

const winston = require('winston');

// Determine environment
const isDevelopment = process.env.NODE_ENV !== 'production';

// Custom format for development (colorized, readable)
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} ${level}: ${message} ${metaStr}`;
  })
);

// Production format (JSON for log aggregation tools)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: isDevelopment ? devFormat : prodFormat,
  transports: [
    new winston.transports.Console(),
    // In production, you might add file transports or external services
    // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

module.exports = logger;
