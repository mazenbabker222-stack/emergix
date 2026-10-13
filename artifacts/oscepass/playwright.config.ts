import { defineConfig, devices } from '@playwright/test';

const webPort = Number(process.env.E2E_PORT ?? 4173);
const apiPort = Number(process.env.E2E_API_PORT ?? 5055);
const webOrigin = `http://localhost:${webPort}`;

// The API webServer needs Postgres with the schema pushed:
//   DATABASE_URL=... pnpm --filter @workspace/db run push-force
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: webOrigin, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @workspace/api-server run dev',
      url: `http://localhost:${apiPort}/api/healthz`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        PORT: String(apiPort),
        APP_URL: webOrigin,
        SESSION_SECRET: process.env.SESSION_SECRET ?? 'e2e-secret-e2e-secret-e2e-secret-123456',
        E2E_TEST_HOOKS: '1',
        AUTH_STRICT_RATE_LIMIT_MAX: '1000',
      },
    },
    {
      command: 'pnpm run dev',
      url: webOrigin,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      // vite.config.ts requires both PORT and BASE_PATH.
      env: { PORT: String(webPort), BASE_PATH: '/', API_PROXY_TARGET: `http://localhost:${apiPort}` },
    },
  ],
});
