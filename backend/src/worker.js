/**
 * StudyAI Background Worker
 * 
 * Processes background jobs from Redis queue using BullMQ.
 * Run with: npm run worker:dev (development) or npm run worker:start (production)
 * 
 * This runs as a SEPARATE PROCESS from the API server.
 * In production, they're separate containers.
 */

// Load environment variables
require('dotenv').config();

const logger = require('./config/logger');

logger.info('🔧 Worker starting...');
logger.info('📍 Environment: ' + (process.env.NODE_ENV || 'development'));

// TODO: Initialize BullMQ workers here
// We'll implement this when we build the document processing pipeline

// Keep the process running
logger.info('⏳ Worker ready, waiting for jobs...');

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down worker...`);
  
  // TODO: Close BullMQ workers gracefully
  
  // Close Redis connection
  const redis = require('./lib/redis');
  redis.quit();
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
