module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  displayName: 'Frontend',
  testMatch: ['**/tests/hud.test.js'],
};
