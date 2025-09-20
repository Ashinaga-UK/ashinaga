import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@workspace/ui/(.*)$': '<rootDir>/../../packages/ui/src/$1',
    '^next-intl$': '<rootDir>/__mocks__/next-intl.js',
    '^next-intl/server$': '<rootDir>/__mocks__/next-intl-server.js',
    '^next-safe-action$': '<rootDir>/__mocks__/next-safe-action.js',
    '^lucide-react$': '<rootDir>/__mocks__/lucide-react.js',
    '^../lib/auth-client$': '<rootDir>/__mocks__/auth-client.js',
    '^./lib/auth-client$': '<rootDir>/__mocks__/auth-client.js',
    '^../../lib/auth-client$': '<rootDir>/__mocks__/auth-client.js',
  },
  transformIgnorePatterns: ['node_modules/(?!(lucide-react|better-auth|nanostores)/)'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/layout.tsx',
    '!components/providers.tsx',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: ['text', 'lcov', 'html'],
};

module.exports = createJestConfig(config);
