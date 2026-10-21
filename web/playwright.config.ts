import { defineConfig } from '@playwright/test'
import config from '../playwright.config'

// The platform runs this suite against the deployed frontend. PAS transport is
// mocked by browser.spec.ts; SQL authorization is verified separately by qa/actions.mjs.
export default defineConfig({ ...config, testDir: '../qa' })
