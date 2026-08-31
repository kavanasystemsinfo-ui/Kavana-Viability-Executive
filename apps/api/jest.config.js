module.exports = {
  displayName: 'api',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json', useESM: false }],
  },
  moduleNameMapper: {
    '^@kavana-viability-executive/shared$': '<rootDir>/../../libs/shared/src/index.ts',
    '^@kavana-viability-executive/viability-engine$': '<rootDir>/../../libs/viability-engine/src/index.ts',
    '^@kavana-viability-executive/rag$': '<rootDir>/../../libs/rag/src/index.ts',
    '^@kavana-viability-executive/agents$': '<rootDir>/../../libs/agents/src/index.ts',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/main.ts'],
  coverageDirectory: '../../coverage/apps/api',
  coverageReporters: ['text', 'lcov', 'html'],
};
