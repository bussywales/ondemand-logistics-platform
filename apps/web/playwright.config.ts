import { defineConfig, devices } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadSmokeEnv() {
  const envPath = [resolve(process.cwd(), '.env.smoke'), resolve(process.cwd(), '../..', '.env.smoke')].find((candidate) =>
    existsSync(candidate)
  );
  if (!envPath) {
    return;
  }

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    process.env[key] ??= value;
  }
}

loadSmokeEnv();

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
