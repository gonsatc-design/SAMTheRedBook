module.exports = {
  testEnvironment: 'node',
  displayName: 'Backend',
  setupFiles: ['dotenv/config'],
  testTimeout: 30000,
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ],
  testMatch: ['**/tests/server.test.js', '**/tests/horda.test.js', '**/tests/analytics.test.js', '**/tests/palantir.test.js', '**/tests/stats.test.js', '**/tests/global.test.js', '**/tests/crafting.test.js', '**/tests/mithril_boost.test.js', '**/tests/raid_protocol.test.js', '**/tests/raid_stress.test.js'],
};
