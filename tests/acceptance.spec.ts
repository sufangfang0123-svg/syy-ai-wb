import { expect, Page, test } from "@playwright/test";

const closeGuide = async (page: Page) => {
  await page.waitForTimeout(700);
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible().catch(() => false)) await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

test("five-step guide stays usable, traps focus and restores it", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop geometry is covered here");
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/workspace/");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);

  const primaryTargets = ["[data-guide=\"project-brief\"]", ".evidence-record:first-child h2", "[data-guide=\"assumption-primary\"]", "[data-guide=\"test-hypothesis\"]", "[data-guide=\"decision-verdict\"]"];
  const routes = ["workspace", "evidence", "assumptions", "tests", "decision"];
  for (let index = 0; index < 5; index += 1) {
    await page.waitForURL(`**/${routes[index]}/`);
    await expect(page.locator(primaryTargets[index]).first()).toBeVisible();
    const panel = await page.locator("[data-guide-panel]").boundingBox();
    const target = await page.locator(primaryTargets[index]).first().boundingBox();
    expect(panel).not.toBeNull();
    expect(target).not.toBeNull();
    expect(panel!.x).toBeGreaterThanOrEqual(0);
    expect(panel!.y).toBeGreaterThanOrEqual(0);
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(1366);
    expect(panel!.y + panel!.height).toBeLessThanOrEqual(768);
    const overlapWidth = Math.max(0, Math.min(panel!.x + panel!.width, target!.x + target!.width) - Math.max(panel!.x, target!.x));
    const overlapHeight = Math.max(0, Math.min(panel!.y + panel!.height, target!.y + target!.height) - Math.max(panel!.y, target!.y));
    expect(overlapWidth * overlapHeight).toBe(0);
    if (index < 4) await dialog.getByRole("button", { name: "下一步" }).click();
  }

  for (let index = 0; index < 10; index += 1) {
    await page.keyboard.press("Tab");
    await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.locator("#newcomer-guide-trigger")).toBeFocused();
});

test("guide panel remains fully visible on a small phone", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "mobile project only");
  await page.goto("/workspace/");
  const panel = page.locator("[data-guide-panel]");
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
  await expect(panel.getByRole("button", { name: "下一步" })).toBeVisible();
});

test("human decision is explicit, persisted and separate from the system recommendation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop workflow only");
  await page.goto("/workspace/");
  await closeGuide(page);
  await page.goto("/decision/");
  await page.getByRole("button", { name: "停止" }).click();
  await page.getByLabel("决定理由（必填）").fill("供应商报价与密封样品尚未取得，先停止本轮开模投入。");
  await page.getByRole("button", { name: "确认并记录人工决定" }).click();
  await expect(page.getByText("已记录“停止”，系统建议未被覆盖")).toBeVisible();
  await expect(page.getByText(/人工决定：停止/)).toBeVisible();
  await expect(page.getByText("系统建议（只读）")).toBeVisible();
  await page.reload();
  await expect(page.getByText(/人工决定：停止/)).toBeVisible();
});

test("proposed human test never counts as completed calibration", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop ledger only");
  await page.goto("/workspace/");
  await closeGuide(page);
  await page.goto("/tests/");
  await expect(page.getByText("待执行 1｜进行中 0｜已完成 0")).toBeVisible();
  await expect(page.getByText("待执行方案不计为已完成真人研究")).toBeVisible();
});

test("demo and real drafts remain isolated", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop mode workflow only");
  await page.goto("/workspace/");
  await closeGuide(page);
  const idea = page.getByLabel("想做什么新品");
  await idea.fill("演示空间专属内容");
  await page.getByRole("button", { name: "真实项目草稿" }).click();
  await closeGuide(page);
  await expect(idea).not.toHaveValue("演示空间专属内容");
  await idea.fill("真实空间专属内容");
  await page.getByRole("button", { name: "模拟项目" }).click();
  await expect(idea).toHaveValue("演示空间专属内容");
});
