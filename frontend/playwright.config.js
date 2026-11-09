import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:43067'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    viewport: { width: 1120, height: 900 },
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-light', use: { browserName: 'chromium', colorScheme: 'light' } },
    { name: 'chromium-dark', use: { browserName: 'chromium', colorScheme: 'dark' } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 43067 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
  },
})
