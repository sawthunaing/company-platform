module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\.(spec|e2e-spec)\.ts$',
  transform: { '^.+\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  globalSetup: './test/global-setup.ts',
  globalTeardown: './test/global-teardown.ts',
  testTimeout: 30000,
};
