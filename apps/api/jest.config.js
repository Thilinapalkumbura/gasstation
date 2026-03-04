/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/node_modules/**', '!**/*.module.ts', '!**/main.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    // rootDir = apps/api/src  →  ../../../ = gasstation root
    '^@gasstation/shared-types$': '<rootDir>/../../../packages/shared-types/src/index.ts',
    '^@gasstation/database$': '<rootDir>/../../../packages/database/src/index.ts',
  },
};
