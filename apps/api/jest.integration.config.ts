import type { Config } from 'jest';
import baseConfig from './jest.config';

const { testRegex: _omitTestRegex, ...restConfig } = baseConfig as unknown as Config;

const config: Config = {
  ...restConfig,
  displayName: 'Ashinaga API Integration',
  testMatch: ['<rootDir>/test/integration/**/*.integration.spec.ts'],
  testRegex: undefined,
  globalSetup: '<rootDir>/test/integration/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/integration/setup/global-teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup/setup-after-env.ts'],
  testTimeout: 30000,
  maxWorkers: 1,
  forceExit: true,
  rootDir: '.',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^uuid$': '<rootDir>/test/integration/__mocks__/uuid.ts',
  },
};

export default config;
