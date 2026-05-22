import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  outputDir: './test/e2e/test-results',
  testMatch: '*.e2e-spec.ts',
  fullyParallel: true,
  reporter: 'list',

  use: {
    baseURL: process.env.SCHOLAR_APP_URL || 'http://localhost:4002',
    trace: 'on-first-retry',
    storageState: './test/e2e/.auth/scholar.json',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts$/,
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'pnpm run dev',
    url: process.env.SCHOLAR_APP_URL || 'http://localhost:4002',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
