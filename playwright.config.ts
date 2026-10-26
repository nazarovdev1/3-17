import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  // SwiftShader shares host CPU with every browser; FPS checks need an isolated renderer.
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    launchOptions: {
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--autoplay-policy=user-gesture-required',
      ],
    },
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'iphone-13',
      testIgnore: '**/desktop*.spec.ts',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
    {
      name: 'pixel-7',
      testIgnore: '**/desktop*.spec.ts',
      use: { ...devices['Pixel 7'], browserName: 'chromium' },
    },
    {
      name: 'small-android',
      testIgnore: '**/desktop*.spec.ts',
      use: {
        viewport: { width: 360, height: 640 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 1,
        userAgent:
          'Mozilla/5.0 (Linux; Android 12; Small Android) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      },
    },
    {
      name: 'no-webgl',
      testIgnore: '**/desktop*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        launchOptions: {
          args: [
            '--disable-webgl',
            '--disable-webgl2',
            '--disable-gpu',
            '--autoplay-policy=user-gesture-required',
          ],
        },
      },
    },
  ],
})
