import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = resolve("docs/audit/vnext-2026-08-22/after");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome", headless: true });

async function stable(page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
}

async function captureViewport(viewport, entries) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/workspace/`);
  await page.evaluate(() => window.localStorage.clear());

  for (const [name, route] of entries) {
    await page.goto(`${baseUrl}${route}`);
    await stable(page);
    await page.screenshot({ path: resolve(outputDir, name), fullPage: false });
  }

  await context.close();
}

await captureViewport({ width: 1440, height: 900 }, [
  ["01-workspace-1440x900.png", "/workspace/"],
  ["02-opportunities-1440x900.png", "/opportunities/"],
  ["03-evolution-1440x900.png", "/evolution/"],
  ["04-scenario-universe-1440x900.png", "/launch/"],
  ["06-evidence-1440x900.png", "/evidence/"],
  ["07-validation-1440x900.png", "/tests/"],
  ["08-content-1440x900.png", "/content/"],
  ["09-feedback-1440x900.png", "/results/"],
  ["10-decision-1440x900.png", "/decision/"],
]);

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/launch/`);
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByLabel("筛选理由（必填）").fill("人工选择用于验证shortlist追溯，不代表自动排名。");
  const first = page.locator(".scenario-table > article").first();
  await first.getByRole("checkbox", { name: /加入人工shortlist/ }).check();
  await first.getByRole("button", { name: "加入人工 shortlist" }).click();
  await stable(page);
  await page.screenshot({ path: resolve(outputDir, "05-human-shortlist-1440x900.png"), fullPage: false });
  await context.close();
}

await captureViewport({ width: 1366, height: 768 }, [
  ["11-workspace-1366x768.png", "/workspace/"],
]);
await captureViewport({ width: 390, height: 844 }, [
  ["12-launch-390x844.png", "/launch/"],
  ["13-opportunities-390x844.png", "/opportunities/"],
]);
await captureViewport({ width: 375, height: 812 }, [
  ["14-decision-375x812.png", "/decision/"],
]);

await browser.close();
