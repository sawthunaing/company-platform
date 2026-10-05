import { defineConfig, devices } from '@playwright/test';

// End-to-end tests against a production build (ISR only runs in `next start`) that reads a
// mock API, so the tests can change the content and stop the API. No Docker needed.
const SITE_PORT = 3101;
const API_PORT = 3999;
const CONTROL_PORT = 3998;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${SITE_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Started in order: the build needs the mock API to be up.
  webServer: [
    {
      command: 'node e2e/mock-api.mjs',
      url: `http://localhost:${CONTROL_PORT}/health`,
      env: { MOCK_API_PORT: String(API_PORT), MOCK_CONTROL_PORT: String(CONTROL_PORT) },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `npx next build && npx next start -p ${SITE_PORT}`,
      url: `http://localhost:${SITE_PORT}/robots.txt`,
      env: {
        API_URL: `http://localhost:${API_PORT}`,
        SITE_URL: `http://localhost:${SITE_PORT}`,
        NEXT_DIST_DIR: '.next-e2e',
      },
      reuseExistingServer: false,
      timeout: 300_000,
    },
  ],
});
