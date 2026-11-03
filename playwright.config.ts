import { defineConfig, devices } from '@playwright/test';

const PORT = 3200;
const MOCK_PORT = 4010;
const API = `http://localhost:${MOCK_PORT}/v1`;

/**
 * Smoke + a11y tests run against a PRODUCTION build (so CSP/nonces are real) and an in-memory mock of the backend.
 * Use PW_CHANNEL=chrome to use the system Chrome instead of Playwright's bundled Chromium.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    channel: process.env.PW_CHANNEL || undefined,
  },
  webServer: [
    {
      command: 'node e2e/mock-backend.mjs',
      env: { PORT: String(MOCK_PORT), SCAN_MS: '2500' },
      url: `http://localhost:${MOCK_PORT}/v1/plans`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run build && npx next start -p ${PORT}`,
      env: {
        NEXT_PUBLIC_API_BASE_URL: API,
        API_BASE_URL: API,
        NEXT_PUBLIC_APP_ORIGIN: `http://localhost:${PORT}`,
      },
      url: `http://localhost:${PORT}/sign-in`,
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
