import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  outputDir: './test/e2e/test-results',
  testMatch: '*.e2e-spec.ts',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: process.env.SCHOLAR_APP_URL || 'http://127.0.0.1:4002',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts$/,
    },
    {
      name: 'Google Chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        storageState: './test/e2e/.auth/scholar.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: process.env.SCHOLAR_APP_URL || 'http://127.0.0.1:4002',
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:4000',
    },
  },
});
