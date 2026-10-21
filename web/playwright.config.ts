import { defineConfig } from '@playwright/test'

// The platform runs this suite against the deployed frontend. PAS transport is
// mocked by browser.spec.ts; SQL authorization is verified separately by qa/actions.mjs.
export default defineConfig({
  testDir: '../qa',
  testMatch: 'browser.spec.ts',
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || process.env.SLACKIE_BASE_URL || 'https://slackie.proappstore.online',
    serviceWorkers: 'block',
    launchOptions: { executablePath: process.env.SLACKIE_BROWSER || undefined },
  },
})
