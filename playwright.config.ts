import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testIgnore: "**/unit/**",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.PLAYWRIGHT_JSON_OUTPUT_NAME
    ? [["json", { outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_NAME }], ["list"]]
    : process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: process.env.TEST_BUILD_PROFILE === "local_integrated" ? "http://127.0.0.1:3012" : "http://127.0.0.1:3011",
    channel: undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true } },
  ],
  webServer: process.env.TEST_BUILD_PROFILE === "local_integrated"
    ? [
        { command: "npm run test:backend:serve", url: "http://127.0.0.1:8000/api/v1/health", reuseExistingServer: false, timeout: 120_000 },
        { command: "npm run dev:local -- --hostname 127.0.0.1 --port 3012", url: "http://127.0.0.1:3012", reuseExistingServer: false, timeout: 120_000 },
      ]
    : { command: "npm run dev:public -- --hostname 127.0.0.1 --port 3011", url: "http://127.0.0.1:3011", reuseExistingServer: false, timeout: 120_000 },
});
