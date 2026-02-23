module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  displayName: 'Backend',
  setupFiles: ['dotenv/config'],
  testTimeout: 30000,
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.claude/'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  coveragePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.claude/'],
  testMatch: [
    '**/tests/server.test.js',
    '**/tests/horda.test.js',
    '**/tests/analytics.test.js',
    '**/tests/palantir.test.js',
    '**/tests/stats.test.js',
    '**/tests/global.test.js',
    '**/tests/crafting.test.js',
    '**/tests/mithril_boost.test.js',
    '**/tests/raid_protocol.test.js',
    '**/tests/raid_stress.test.js'
  ]
};
