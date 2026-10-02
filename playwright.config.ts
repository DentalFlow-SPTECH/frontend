import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5178/', channel: 'msedge', headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 960 } } },
    { name: 'mobile_375', use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  webServer: process.env.TEST_BASE_URL ? undefined : { command: 'npm run dev', url: 'http://127.0.0.1:5178/', reuseExistingServer: !process.env.CI, timeout: 60_000 },
});
