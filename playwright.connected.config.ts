import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/connected",
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3003",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --port 3003",
        url: "http://127.0.0.1:3003",
        timeout: 120000,
        reuseExistingServer: false,
      },
});
