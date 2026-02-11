module.exports = {
  testEnvironment: 'node',
  displayName: 'Backend',
  setupFiles: ['dotenv/config'],
  testTimeout: 10000,
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ],
  testMatch: ['**/tests/server.test.js', '**/tests/horda.test.js', '**/tests/analytics.test.js', '**/tests/palantir.test.js'],
};
