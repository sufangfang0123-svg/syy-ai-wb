import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.AUDIT_BASE_URL || "https://sufangfang0123-svg.github.io/syy-ai-wb";
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR || "docs/audit/v040-closeout/before");
const routes = [
  "/", "/judge-kit/", "/enterprise-demo/", "/workspace/", "/insights/", "/evidence/",
  "/opportunities/", "/launch/", "/evolution/", "/assumptions/", "/tests/",
  "/content/", "/results/", "/decision/", "/proof/", "/pilot/", "/real/",
];
const viewports = [
  ["desktop-wide", 1440, 900], ["desktop", 1366, 768],
  ["mobile", 390, 844], ["mobile-small", 375, 812],
];
const screenshotRoutes = new Set(routes);

async function gotoWithOneRetry(page, url) {
  try {
    return await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  } catch (error) {
    if (!/ERR_CONNECTION_CLOSED|ERR_CONNECTION_RESET|Timeout/.test(String(error))) throw error;
    await page.waitForTimeout(750);
    return page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  }
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const results = [];

for (const [viewportName, width, height] of viewports) {
  const page = await browser.newPage({ viewport: { width, height } });
  const consoleErrors = [];
  const apiRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("request", (request) => {
    if (/\/api\//.test(request.url())) apiRequests.push(request.url());
  });

  for (const route of routes) {
    consoleErrors.length = 0;
    apiRequests.length = 0;
    const response = await gotoWithOneRetry(page, `${baseUrl}${route}`);
    await page.waitForTimeout(250);
    const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));
    const routeSlug = route === "/" ? "home" : route.replaceAll("/", "");
    if (viewportName === "desktop-wide" || ["enterprise-demo", "launch", "decision", "workspace"].includes(routeSlug)) {
      await page.screenshot({
        path: path.join(outputDir, `${viewportName}-${routeSlug}.png`),
        fullPage: false,
        animations: "disabled",
      });
    }
    results.push({
      viewport: viewportName,
      width,
      height,
      route,
      status: response?.status() ?? null,
      title: await page.title(),
      horizontalOverflow: dimensions.scrollWidth > dimensions.clientWidth,
      dimensions,
      consoleErrors: [...consoleErrors],
      apiRequests: [...apiRequests],
      hasDemoBoundary: /模拟|固定脱敏|公开构建/.test(bodyText),
      hasV040: bodyText.includes("v0.4.0"),
    });
  }
  await page.close();
}

await browser.close();
await writeFile(path.join(outputDir, "audit.json"), JSON.stringify({ baseUrl, generatedAt: new Date().toISOString(), results }, null, 2));
const failures = results.filter((item) => item.status !== 200 || item.horizontalOverflow || item.consoleErrors.length || item.apiRequests.length);
console.log(JSON.stringify({ routes: routes.length, viewports: viewports.length, checks: results.length, failures }, null, 2));
if (failures.length) process.exit(1);
