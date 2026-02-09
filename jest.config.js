module.exports = {
  testEnvironment: 'node',
  verbose: true,
  setupFiles: ['dotenv/config'], // Carga el .env automáticamente en los tests
  testTimeout: 10000, // Aumentamos el tiempo por la latencia de las APIs
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ]
};
