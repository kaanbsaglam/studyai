/**
 * Redis Client
 * 
 * Provides Redis connection for caching and as the backing store for BullMQ.
 * Uses ioredis which is more feature-rich than the basic redis package.
 * 
 * Usage:
 *   const redis = require('./lib/redis');
 *   await redis.set('key', 'value', 'EX', 3600); // Set with 1 hour expiry
 *   const value = await redis.get('key');
 */

const Redis = require('ioredis');
const logger = require('../config/logger');

// Parse Redis URL
// Handles both redis://localhost:6379 and redis://user:pass@host:port formats
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,    // Faster startup
  retryStrategy(times) {
    // Reconnect after increasing delays, max 3 seconds
    const delay = Math.min(times * 50, 3000);
    logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`);
    return delay;
  },
});

// Event handlers
redis.on('connect', () => {
  logger.info('🔴 Connected to Redis');
});

redis.on('error', (err) => {
  logger.error('Redis error', { error: err.message });
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

module.exports = redis;
