/** @type {import('jest').Config} */
module.exports = {
    clearMocks: true,
    moduleFileExtensions: ['js', 'ts'],
    testEnvironment: 'node',
    testMatch: ['**/*.test.ts'],
    transform: {
      '^.+\\.[jt]s$': ['ts-jest', { tsconfig: 'tsconfig.test.json', useESM: false }]
    },
    transformIgnorePatterns: [
      'node_modules/(?!@actions/)'
    ],
    resolver: './jest.resolver.js',
    verbose: true,
    coverageThreshold: {
      "global": {
        "branches": 0,
        "functions": 14,
        "lines": 27,
        "statements": 27
      }
    }
  } 