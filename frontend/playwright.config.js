import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit (Safari)', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome (Pixel 5)', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari (iPhone 12)', use: { ...devices['iPhone 12'] } },
  ],
})
