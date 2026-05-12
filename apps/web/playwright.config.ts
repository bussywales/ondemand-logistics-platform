import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  timeout: 45_000,
  expect: {
    timeout: 8_000
  },
  use: {
    baseURL: process.env.STAGING_WEB_BASE_URL ?? 'https://ondemand-logistics-platform-web.vercel.app',
    navigationTimeout: 30_000,
    actionTimeout: 12_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome']
      }
    }
  ]
});
