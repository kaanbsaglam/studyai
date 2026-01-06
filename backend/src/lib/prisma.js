/**
 * Prisma Client
 * 
 * Singleton instance of Prisma for database access.
 * Using a singleton prevents creating multiple connections during development
 * when hot-reloading causes modules to be re-imported.
 * 
 * Usage:
 *   const prisma = require('./lib/prisma');
 *   const users = await prisma.user.findMany();
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

// Use global variable to maintain singleton across hot-reloads in development
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

// Save to global in development to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Log when connected (useful for debugging startup issues)
prisma.$connect()
  .then(() => logger.info('📦 Connected to PostgreSQL'))
  .catch((err) => logger.error('Failed to connect to PostgreSQL', { error: err.message }));

module.exports = prisma;
