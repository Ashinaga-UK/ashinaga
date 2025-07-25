import type { Config } from 'jest';

export const config = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['js', 'ts', 'json'],
  testEnvironment: 'jsdom',
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],
} as const satisfies Config;
