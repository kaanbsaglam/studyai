/**
 * Prisma Mock for Unit Tests
 *
 * This mock prevents Prisma from creating real database connections
 * during unit tests. For integration tests that need a real database,
 * you would use a separate test configuration.
 */

const mockPrisma = {
  // User model
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },

  // Classroom model
  classroom: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },

  // Document model
  document: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },

  // DocumentChunk model
  documentChunk: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },

  // DailyUsage model
  dailyUsage: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },

  // FlashcardSet model
  flashcardSet: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },

  // QuizSet model
  quizSet: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },

  // QuizAttempt model
  quizAttempt: {
    findMany: jest.fn(),
    create: jest.fn(),
  },

  // Summary model
  summary: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },

  // Note model
  note: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },

  // StudySession model
  studySession: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
  },

  // PomodoroSettings model
  pomodoroSettings: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },

  // Transaction support
  $transaction: jest.fn((callback) => callback(mockPrisma)),

  // Connection methods (no-op in tests)
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

module.exports = mockPrisma;
