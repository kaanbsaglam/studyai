/**
 * StudyAI API Server
 * 
 * Main entry point for the Express application.
 * Run with: npm run dev (development) or npm start (production)
 */

// Load environment variables first (before anything else)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Config and utilities
const { env } = require('./config/env');
const logger = require('./config/logger');
const { errorHandler } = require('./middleware/errorHandler');

// Initialize Express
const app = express();

// ============================================
// Middleware
// ============================================

// Security headers (Helmet)
app.use(helmet());

// CORS - Configure for your frontend origin
app.use(cors({
  origin: env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL // Set this in production
    : ['http://localhost:5173', 'http://localhost:3001'], // Vite default + alternative
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies (form data)
app.use(express.urlencoded({ extended: true }));

// Rate limiting (global)
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Request logging (development only)
if (env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// Health Check Route
// ============================================
// Used by Docker/load balancers to check if the service is healthy

app.get('/health', async (req, res) => {
  // Import here to avoid circular dependencies
  const prisma = require('./lib/prisma');
  const redis = require('./lib/redis');
  
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      redis: 'unknown',
    },
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'healthy';
  } catch (error) {
    health.services.database = 'unhealthy';
    health.status = 'degraded';
  }

  // Check Redis
  try {
    await redis.ping();
    health.services.redis = 'healthy';
  } catch (error) {
    health.services.redis = 'unhealthy';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// ============================================
// API Routes
// ============================================

// API versioning - all routes under /api/v1
const apiRouter = express.Router();
app.use('/api/v1', apiRouter);

// Placeholder route
apiRouter.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'StudyAI API v1',
    timestamp: new Date().toISOString(),
  });
});

// Routes
apiRouter.use('/auth', require('./routes/auth.routes'));
// TODO: Add more routes
// apiRouter.use('/classrooms', require('./routes/classroom.routes'));
// apiRouter.use('/documents', require('./routes/document.routes'));

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// ============================================
// Error Handler (must be last)
// ============================================
app.use(errorHandler);

// ============================================
// Start Server
// ============================================
const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on port ${env.PORT}`);
  logger.info(`📍 Environment: ${env.NODE_ENV}`);
  logger.info(`🔗 Health check: http://localhost:${env.PORT}/health`);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    // Close database connection
    const prisma = require('./lib/prisma');
    await prisma.$disconnect();
    logger.info('Database connection closed');
    
    // Close Redis connection
    const redis = require('./lib/redis');
    redis.quit();
    logger.info('Redis connection closed');
    
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
