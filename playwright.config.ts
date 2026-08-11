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
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true } },
  ],
  webServer: {
    command: process.env.TEST_BUILD_PROFILE === "local_integrated"
      ? "npm run dev:local -- --hostname 127.0.0.1 --port 3012"
      : "npm run dev:public -- --hostname 127.0.0.1 --port 3011",
    url: process.env.TEST_BUILD_PROFILE === "local_integrated" ? "http://127.0.0.1:3012" : "http://127.0.0.1:3011",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
