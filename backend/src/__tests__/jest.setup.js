// Jest setup - runs before each test file

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for async operations
jest.setTimeout(30000);

// Suppress console logs during tests (optional - uncomment if tests are noisy)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
// };
