import { defineConfig } from '@playwright/test'
import base from '../playwright.config'

export default defineConfig({
  ...base,
  testDir: '.',
  testMatch: '*.spec.ts',
  workers: 1,
  webServer: { ...(base.webServer as object), cwd: '..' } as typeof base.webServer,
  projects: [{ name: 'audit', use: { ...base.use, trace: 'off' } }],
})
