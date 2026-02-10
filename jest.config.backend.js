module.exports = {
  testEnvironment: 'node',
  displayName: 'Backend',
  setupFiles: ['dotenv/config'],
  testTimeout: 10000,
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ],
  testMatch: ['**/tests/server.test.js', '**/tests/horda.test.js'],
};
