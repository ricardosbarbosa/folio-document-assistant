import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const baseURL = `http://127.0.0.1:${port}`;
const webServerCommand = process.env.PLAYWRIGHT_USE_BUILD === "true"
  ? `npm run start -- --port ${port}`
  : `npm run dev -- --port ${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: webServerCommand,
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 120000,
    env: { DEMO_MODE: "true" },
  },
});
