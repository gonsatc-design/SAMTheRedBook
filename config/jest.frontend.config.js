module.exports = {
  rootDir: '..',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  displayName: 'Frontend',
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.claude/'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  testMatch: ['**/tests/hud.test.js']
};
