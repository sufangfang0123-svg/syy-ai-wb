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
    if (index === 3) {
      await expect(dialog).toContainText("记录验证方案");
      await expect(dialog).toContainText("不自动生成实验");
    }
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
  await expect(page.getByRole("button", { name: "停止" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("决定理由（必填）")).toHaveValue("供应商报价与密封样品尚未取得，先停止本轮开模投入。");
});

test("clean Chromium hydrates decision state without application mismatch", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop hydration regression only");
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/workspace/");
  await closeGuide(page);
  await page.goto("/decision/");
  await expect(page.getByRole("button", { name: "先补证" })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "继续投入" }).click();
  await page.getByLabel("决定理由（必填）").fill("已取得本轮模拟验证材料，记录继续投入决定。");
  await page.getByRole("button", { name: "确认并记录人工决定" }).click();
  await page.goto("/results/");
  await page.goto("/decision/");
  await expect(page.getByRole("button", { name: "继续投入" })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByLabel("决定理由（必填）")).toHaveValue("已取得本轮模拟验证材料，记录继续投入决定。");
  expect(errors.filter((value) => /hydration|did not match|server rendered/i.test(value))).toEqual([]);
});

test("evidence cards expose only real URLs and never auto-link assumptions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop evidence regression only");
  await page.goto("/workspace/");
  await closeGuide(page);
  await page.goto("/evidence/");
  await expect(page.locator(".evidence-source-link")).toHaveCount(0);
  await expect(page.locator(".evidence-source-label").first()).toHaveText("模拟/脱敏来源");
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("evolution-lab:decision-demo:v1") || "{}").assumptions.map((item: { evidenceIds: string[] }) => item.evidenceIds));
  await page.getByRole("button", { name: "录入证据" }).click();
  await page.getByLabel("证据标题").fill("公开规范摘录");
  await page.getByLabel("来源", { exact: true }).fill("公开规范站点");
  await page.getByLabel("公开来源URL（可空）").fill("https://example.com/research");
  await page.getByLabel("适用范围").fill("模拟测试范围");
  await page.getByLabel("观察到的事实").fill("公开页面包含可核对的条款。");
  await page.getByLabel("限制与不能支持的结论").fill("不代表真实购买行为。");
  await page.getByRole("button", { name: "保存证据卡" }).click();
  const link = page.getByRole("link", { name: "打开公开来源：公开规范站点" });
  await expect(link).toHaveAttribute("href", "https://example.com/research");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.locator(".service-status.available")).toContainText("当前尚未关联假设");
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("evolution-lab:decision-demo:v1") || "{}").assumptions.map((item: { evidenceIds: string[] }) => item.evidenceIds));
  expect(after).toEqual(before);
});

test("decision print gives explicit feedback", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop print interaction only");
  await page.goto("/workspace/");
  await closeGuide(page);
  await page.goto("/decision/");
  await page.evaluate(() => { Object.defineProperty(window, "print", { configurable: true, value: () => { (window as typeof window & { __printCalled?: boolean }).__printCalled = true; } }); });
  await page.getByRole("button", { name: "打印 / 保存为PDF" }).click();
  await expect(page.locator("#decision-print-status")).toContainText("另存为PDF");
  await expect.poll(() => page.evaluate(() => Boolean((window as typeof window & { __printCalled?: boolean }).__printCalled))).toBe(true);
});

test("simulation audit separates decision actions and survives reload", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop audit drawer only");
  await page.goto("/workspace/");
  await closeGuide(page);
  await page.getByLabel("想做什么新品").fill("模拟审计项目修改");
  await page.goto("/evidence/");
  await page.getByRole("button", { name: "录入证据" }).click();
  await page.getByLabel("证据标题").fill("模拟审计Evidence");
  await page.getByLabel("来源", { exact: true }).fill("脱敏夹具");
  await page.getByLabel("适用范围").fill("模拟审计");
  await page.getByLabel("观察到的事实").fill("仅用于验证日志持久化。");
  await page.getByLabel("限制与不能支持的结论").fill("不能支持企业决策。");
  await page.getByRole("button", { name: "保存证据卡" }).click();
  await page.goto("/decision/");
  await page.getByRole("button", { name: "停止" }).click();
  await page.getByLabel("决定理由（必填）").fill("模拟审计决定理由");
  await page.getByRole("button", { name: "确认并记录人工决定" }).click();
  await page.goto("/results/");
  await page.getByLabel("结果来源").fill("模拟批次A");
  await page.getByLabel("结果摘要").fill("模拟结果回流审计记录");
  await page.getByRole("button", { name: "保存演示结果" }).click();
  await page.getByRole("button", { name: "查看模拟操作记录" }).click();
  const audit = page.getByTestId("decision-audit-log");
  await expect(page.getByRole("heading", { name: "模拟决策审计" })).toBeVisible();
  for (const action of ["修改模拟项目", "新增模拟Evidence", "确认模拟人工决定", "新增模拟结果回流"]) await expect(audit).toContainText(action);
  await expect(audit).toContainText("模拟决策流程 · 模拟");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "查看模拟操作记录" }).click();
  await expect(page.getByTestId("decision-audit-log")).toContainText("新增模拟结果回流");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.goto("/opportunities/");
  await page.getByRole("button", { name: "查看模拟操作记录" }).click();
  await expect(page.getByRole("heading", { name: "研究实验室审计" })).toBeVisible();
  await expect(page.getByTestId("research-audit-log")).not.toContainText("新增模拟Evidence");
});

test("proposed human test never counts as completed calibration", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop ledger only");
  await page.goto("/workspace/");
  await closeGuide(page);
  await page.goto("/tests/");
  await expect(page.getByText("待执行 1｜进行中 0｜已完成 0")).toBeVisible();
  await expect(page.getByText("待执行方案不计为已完成真人研究")).toBeVisible();
});

test("demo data persists without creating any real-project browser storage", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop storage boundary only");
  await page.goto("/workspace/");
  await closeGuide(page);
  const idea = page.getByLabel("想做什么新品");
  await idea.fill("演示空间专属内容");
  await page.reload();
  await closeGuide(page);
  await expect(idea).toHaveValue("演示空间专属内容");
  const keys = await page.evaluate(() => Object.keys(window.localStorage));
  expect(keys).toContain("evolution-lab:decision-demo:v1");
  expect(keys.some((key) => key.includes("decision-real") || key.includes("active-mode"))).toBe(false);
  await expect(page.getByRole("button", { name: "真实项目入口" })).toHaveCount(0);
});
