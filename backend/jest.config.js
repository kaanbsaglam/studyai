module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/__tests__/**',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/jest.setup.js'],
  verbose: true,
};
