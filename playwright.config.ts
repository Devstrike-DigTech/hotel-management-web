import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the running app and backend (see README, "Testing").
 * Chromium comes from PLAYWRIGHT_CHROMIUM, or the sandbox's preinstalled build when present.
 */
const preinstalled = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM || (existsSync(preinstalled) ? preinstalled : undefined);
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // Bookings share inventory and per-phone limits on one backend: run one at a time.
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : { command: "pnpm dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
