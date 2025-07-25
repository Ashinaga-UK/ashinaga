import { config } from '@workspace/jest-config/nest';

export default {
  ...config,
  displayName: 'Ashinaga API App',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/', '\\.d\\.ts$'],
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.d.ts',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
  ],
  transformIgnorePatterns: ['node_modules/(?!(superjson)/)'],
};
