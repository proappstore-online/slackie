import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './qa',
  testMatch: 'browser.spec.ts',
  workers: 1,
  use: {
    baseURL: (process.env.SLACKIE_BASE_URL || process.env.E2E_BASE_URL) || 'http://127.0.0.1:4175',
    serviceWorkers: 'block',
    launchOptions: { executablePath: process.env.SLACKIE_BROWSER || undefined },
  },
  webServer: (process.env.SLACKIE_BASE_URL || process.env.E2E_BASE_URL) ? undefined : {
    command: 'pnpm --filter @slackie/web dev --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
  },
})
