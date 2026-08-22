import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const appUrl = process.env.VNEXT_APP_URL ?? "http://127.0.0.1:3000";
const apiUrl = process.env.VNEXT_API_URL ?? "http://127.0.0.1:8000";
const outputDir = path.resolve("docs/audit/vnext-after");
const projectName = "有纺服装真实持久化E2E";
const captures = [
  ["1440x900", 1440, 900, ["workspace", "launch", "content", "decision"]],
  ["1366x768", 1366, 768, ["workspace", "launch"]],
  ["390x844", 390, 844, ["workspace", "launch", "content", "decision"]],
  ["375x812", 375, 812, ["workspace", "decision"]],
];

await mkdir(outputDir, { recursive: true });
const projectsResponse = await fetch(`${apiUrl}/api/v1/projects`);
if (!projectsResponse.ok) throw new Error(`Project lookup failed: HTTP ${projectsResponse.status}`);
const projects = await projectsResponse.json();
const project = projects.find((item) => item.name === projectName);
if (!project) throw new Error(`Expected E2E project not found: ${projectName}`);

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });
const failures = [];
let providerRequests = 0;

try {
  for (const [label, width, height, routes] of captures) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.on("pageerror", (error) => failures.push(`${label}: pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") failures.push(`${label}: console: ${message.text()}`);
    });
    page.on("request", (request) => {
      if (request.url().includes("api.openai.com")) providerRequests += 1;
    });

    for (const route of routes) {
      await page.goto(`${appUrl}/${route}/`, { waitUntil: "networkidle" });
      await page.keyboard.press("Escape");
      const picker = page.getByLabel("当前真实项目");
      if (await picker.count()) {
        await picker.selectOption(project.id);
        await page.waitForTimeout(600);
        await page.waitForLoadState("networkidle");
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) failures.push(`${label}/${route}: horizontal overflow ${overflow}px`);
      await page.screenshot({ path: path.join(outputDir, `${label}-${route}.png`), fullPage: true });
    }
    await context.close();
  }
} finally {
  await browser.close();
}

if (providerRequests !== 0) failures.push(`Provider requests observed: ${providerRequests}`);
if (failures.length) throw new Error(failures.join("\n"));
console.log(JSON.stringify({ projectId: project.id, captures: 12, providerRequests, outputDir }, null, 2));
