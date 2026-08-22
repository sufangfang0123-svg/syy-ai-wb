import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseUrl = (process.argv[2] ?? "http://127.0.0.1:3011").replace(/\/$/, "");
const mode = process.argv[3] ?? "after";
const output = path.resolve("docs", "audit", "v040-enterprise-showcase", mode);
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" });

async function capture(name, route, viewport, locator) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await page.evaluate(async () => document.fonts.ready);
  await page.waitForTimeout(350);
  if (locator) await page.locator(locator).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, `${name}-${viewport.width}x${viewport.height}.png`), fullPage: !locator });
  await page.close();
}

if (mode === "before") {
  await capture("01-enterprise-demo-missing", "/enterprise-demo/", { width: 1440, height: 900 });
} else {
  await capture("01-enterprise-hero", "/enterprise-demo/", { width: 1440, height: 900 });
  await capture("02-responsibility-architecture", "/enterprise-demo/#responsibility", { width: 1440, height: 900 }, "#responsibility");
  await capture("03-governed-workflow", "/enterprise-demo/#workflow", { width: 1440, height: 900 }, "#workflow");
  await capture("04-agent-governance", "/enterprise-demo/#agents", { width: 1440, height: 900 }, "#agents");
  await capture("05-enterprise-mobile", "/enterprise-demo/", { width: 390, height: 844 }, ".enterprise-demo-hero");
  await capture("06-enterprise-mobile-small", "/enterprise-demo/", { width: 375, height: 812 }, ".enterprise-demo-hero");
  await capture("07-public-workspace", "/workspace/", { width: 1440, height: 900 });
  await capture("08-public-opportunity", "/opportunities/", { width: 1440, height: 900 });
  await capture("09-public-scenario-universe", "/launch/", { width: 1440, height: 900 });
  await capture("10-public-decision", "/decision/", { width: 1440, height: 900 });
}

await browser.close();
console.log(`captured ${mode} screenshots in ${output}`);
