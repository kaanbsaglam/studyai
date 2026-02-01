// Jest setup - runs before each test file

// Set test env vars before any modules load
// Basically these are mock keys so that zod vladation doesnt fail
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-minimum-32-chars';
process.env.JWT_EXPIRES_IN = '1h';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.S3_BUCKET_NAME = 'test-bucket'; 
process.env.PINECONE_API_KEY = 'test-pinecone-key';
process.env.PINECONE_INDEX_NAME = 'test-index';
process.env.GEMINI_API_KEY = 'test-gemini-key';

// Increase timeout for async operations
jest.setTimeout(30000);

// Mock logger to silence output during tests
jest.mock('../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock Prisma to prevent database connections during unit tests
jest.mock('../lib/prisma', () => require('./mocks/prisma'));
