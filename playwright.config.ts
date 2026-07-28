import { defineConfig, devices } from "@playwright/test";

const port = 3_111;

for (const name of [
  "MONGODB_URI",
  "MONGODB_DB_NAME",
  "E2E_ADMIN_EMAIL",
  "E2E_ADMIN_PASSWORD",
]) {
  if (!process.env[name]) {
    throw new Error(`Run Playwright through npm run test:e2e (${name} missing).`);
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["line"], ["html", { open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `npm run build && npm start -- -p ${port}`,
    url: `http://localhost:${port}/api/health`,
    timeout: 120_000,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
