import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const appUrl = process.env.VNEXT_APP_URL ?? "http://127.0.0.1:3000";
const apiUrl = process.env.VNEXT_API_URL ?? "http://127.0.0.1:8000";
const outputDir = path.resolve("docs/audit/truth-funnel-after");
const captures = [
  { file: "1440x900-opportunities.png", width: 1440, height: 900, route: "opportunities", projectName: "有纺服装真实持久化E2E" },
  { file: "1440x900-launch.png", width: 1440, height: 900, route: "launch", projectName: "移动端shortlist-mobile-390" },
  { file: "390x844-launch.png", width: 390, height: 844, route: "launch", projectName: "移动端shortlist-mobile-390" },
];

await mkdir(outputDir, { recursive: true });
const projectsResponse = await fetch(`${apiUrl}/api/v1/projects`);
if (!projectsResponse.ok) throw new Error(`Project lookup failed: HTTP ${projectsResponse.status}`);
const projects = await projectsResponse.json();
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });
const failures = [];
let providerRequests = 0;

try {
  for (const capture of captures) {
    const project = projects.find((item) => item.name === capture.projectName);
    if (!project) throw new Error(`Expected E2E project not found: ${capture.projectName}`);
    const context = await browser.newContext({ viewport: { width: capture.width, height: capture.height } });
    const page = await context.newPage();
    page.on("pageerror", (error) => failures.push(`${capture.file}: pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") failures.push(`${capture.file}: console: ${message.text()}`);
    });
    page.on("request", (request) => {
      if (request.url().includes("api.openai.com")) providerRequests += 1;
    });
    await page.goto(`${appUrl}/${capture.route}/`, { waitUntil: "networkidle" });
    const picker = page.getByLabel("当前真实项目");
    await picker.selectOption(project.id);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) failures.push(`${capture.file}: horizontal overflow ${overflow}px`);
    await page.screenshot({ path: path.join(outputDir, capture.file), fullPage: true });
    await context.close();
  }
} finally {
  await browser.close();
}

if (providerRequests !== 0) failures.push(`Provider requests observed: ${providerRequests}`);
if (failures.length) throw new Error(failures.join("\n"));
console.log(JSON.stringify({ captures: captures.length, providerRequests, outputDir }, null, 2));
