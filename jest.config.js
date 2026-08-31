module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    '**/*.{ts,js}',
    '!**/*.spec.ts',
    '!**/*.d.ts',
    '!**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@kavana-viability-executive/shared$': '<rootDir>/libs/shared/src/index.ts',
    '^@kavana-viability-executive/viability-engine$': '<rootDir>/libs/viability-engine/src/index.ts',
    '^@kavana-viability-executive/rag$': '<rootDir>/libs/rag/src/index.ts',
    '^@kavana-viability-executive/agents$': '<rootDir>/libs/agents/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.spec.json',
      useESM: false,
    }],
  },
};