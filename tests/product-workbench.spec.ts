import { expect, Page, test } from "@playwright/test";

const profile = process.env.TEST_BUILD_PROFILE ?? "public_demo";

async function enterWorkbench(page: Page) {
  await page.goto("/workspace/");
  await page.waitForTimeout(500);
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible().catch(() => false)) await page.keyboard.press("Escape");
}

test.beforeEach(async ({ page }) => {
  test.skip(profile !== "public_demo", "legacy fixture workflow is public_demo only");
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

test("public product workbench never calls the local backend or exposes Provider controls", async ({ page }) => {
  let backendRequests = 0;
  page.on("request", (request) => { if (request.url().startsWith("http://127.0.0.1:8000")) backendRequests += 1; });
  await enterWorkbench(page);
  await expect(page.locator("[data-product-workbench]")).toHaveAttribute("data-workbench-adapter", "public_fixture");
  await expect(page.locator("body")).not.toContainText("导入结构化AI建议包");
  await expect(page.locator("body")).not.toContainText("LOCAL · SQLite");
  expect(backendRequests).toBe(0);
});

test("opportunity facts replace pseudo scores and human rejection creates a persistent failure lineage", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop detail and audit workflow");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/opportunities/");
  await expect(page.locator("body")).not.toContainText(/演示适应度|模拟复核率|模拟覆盖率|市场潜力分|82\s*演示分/);
  await expect(page.getByText("列表按固定ID展示，不代表优先级或排名")).toBeVisible();
  await expect(page.locator(".opportunity-card").first()).toContainText("已复核Evidence");
  await page.getByRole("button", { name: /低打扰更换方案/ }).click();
  const reject = page.getByRole("button", { name: "不采用" });
  await expect(reject).toBeDisabled();
  await page.getByLabel("人工判断与原因（必填）").fill("缺少公共空间任务频次和支付意愿证据，本轮不采用。");
  await reject.click();
  await expect(page.getByRole("button", { name: "失败谱系" })).toHaveClass(/active/);
  await expect(page.getByRole("button", { name: /低打扰更换方案/ })).toContainText("人工已否决");
  await page.reload();
  await page.getByRole("button", { name: "失败谱系" }).click();
  await expect(page.getByRole("button", { name: /低打扰更换方案/ })).toContainText("人工已否决");
  await page.getByRole("button", { name: "查看模拟操作记录" }).click();
  const audit = page.getByTestId("research-audit-log");
  await expect(audit).toContainText("复核机会");
  await expect(audit).toContainText("缺少公共空间任务频次和支付意愿证据");
});

test("scenario explanation and shortlist controls do not toggle compare selection", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop interaction semantics");
  await page.goto("/launch/");
  const firstScenario = page.locator(".scenario-table > article").first();
  const compare = firstScenario.getByRole("checkbox", { name: /^对比/ });
  const shortlist = firstScenario.getByRole("checkbox", { name: /加入人工shortlist/ });
  await expect(compare).not.toBeChecked();
  await expect(shortlist).not.toBeChecked();
  await firstScenario.locator(".priority-cell").click();
  await expect(compare).not.toBeChecked();
  await expect(shortlist).not.toBeChecked();
  await compare.check();
  await expect(shortlist).not.toBeChecked();
  await shortlist.check();
  await expect(compare).toBeChecked();
});

test("workspace and assumption pages use factual states instead of pseudo progress or rank", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop truth labels");
  await page.goto("/workspace/");
  await expect(page.getByRole("heading", { name: "新品投前项目总览" })).toBeVisible();
  await expect(page.locator(".stage-progress-list")).not.toContainText(/\d+%/);
  await expect(page.locator(".stage-progress-list")).toContainText("打开该阶段查看实际状态");
  await page.goto("/assumptions/");
  await expect(page.locator(".risk-rank")).toHaveCount(0);
  await expect(page.getByText("没有自动风险排名")).toBeVisible();
  await expect(page.getByText(/同级顺序不代表优先级/)).toBeVisible();
});

test("demo and manually entered feedback are never mixed in one summary", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop feedback entry workflow");
  await page.goto("/results/");
  const nature = page.getByLabel("按数据性质筛选");
  await expect(nature).toHaveValue("demo");
  await expect(page.locator(".feedback-records article")).toHaveCount(2);
  await page.getByLabel("反馈主题").fill("人工记录分层检查");
  await page.getByLabel("用户反馈").fill("这是一条浏览器人工录入记录，不得与固定夹具汇总。");
  await page.getByRole("button", { name: "保存反馈" }).click();
  await expect(page.locator(".feedback-records article")).toHaveCount(2);
  await nature.selectOption("manual");
  await expect(page.locator(".feedback-records article")).toHaveCount(1);
  await expect(page.locator(".feedback-records")).toContainText("人工记录分层检查");
  await expect(page.locator(".feedback-toolbar")).toContainText("浏览器人工录入");
});

test("human shortlist remains operable at 390 and 375 pixel widths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "explicitly exercises both required phone widths once");
  for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/launch/");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.getByLabel("筛选理由（必填）").fill(`手机${viewport.width}像素人工筛选理由`);
    const first = page.locator(".scenario-table > article").first();
    await expect(first.getByText("人工状态与操作")).toBeVisible();
    await first.getByRole("checkbox", { name: /加入人工shortlist/ }).check();
    await first.getByRole("button", { name: "加入人工 shortlist" }).click();
    await expect(first).toContainText("人工 shortlist");
    const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(width.scroll).toBeLessThanOrEqual(width.client);
  }
});

test("opportunity, concept, scenarios, content and feedback stay connected", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  test.skip(testInfo.project.name.includes("mobile"), "desktop end-to-end workflow");
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterWorkbench(page);
  await expect(page.getByRole("heading", { name: "新品投前项目总览" })).toBeVisible();
  await expect(page.locator("[data-product-workbench]")).toContainText("比赛概念方案，非全棉时代正式产品");

  await page.goto("/evolution/");
  await expect(page.locator(".concept-proposal")).toHaveCount(3);
  await page.getByRole("button", { name: "选择方案" }).first().click();
  await page.getByLabel("人工选择理由").fill("选择固定三日版用于验证状态传递。");
  await page.getByRole("button", { name: "确认并锁定当前版本" }).click();

  await page.goto("/launch/");
  await expect(page.locator(".scenario-table > article")).toHaveCount(100);
  await expect(page.getByText("固定演示 · 100个未评分候选")).toBeVisible();
  await expect(page.locator(".scenario-table")).not.toContainText("演示优先级");
  await expect(page.locator(".priority-cell")).toHaveCount(100);
  await expect(page.locator(".priority-cell").first()).toContainText("未评分");
  await page.getByLabel("筛选理由（必填）").fill("人工选择用于检查固定演示漏斗；不代表优先级。 ");
  const firstScenario = page.locator(".scenario-table > article").first();
  await firstScenario.getByRole("checkbox", { name: /加入人工shortlist/ }).check();
  await firstScenario.getByRole("button", { name: "加入人工 shortlist" }).click();
  await expect(firstScenario).toContainText("人工 shortlist");
  await firstScenario.getByRole("button", { name: "标记进入验证" }).click();
  await expect(firstScenario).toContainText("已进入验证");

  await page.goto("/content/");
  await expect(page.locator(".content-asset-list > button")).toHaveCount(5);
  await page.getByLabel("人工内容版本").fill("人工编辑的固定演示内容，保留适用边界。");
  await page.getByRole("button", { name: "保存人工版本" }).click();
  await page.getByRole("button", { name: "已通过" }).click();
  await page.goto("/results/");
  await expect(page.getByText("DEMO / 模拟数据 / 非企业经营成果。")).toBeVisible();
  await expect(page.locator(".feedback-records article")).toHaveCount(2);
  await page.goto("/decision/");
  await expect(page.locator(".decision-workflow-summary")).toContainText("1 个已复核");
  await page.reload();
  await expect(page.locator(".decision-workflow-summary")).toContainText("三日定量版");
});

test("product workbench has no horizontal page overflow on target viewports", async ({ page }) => {
  test.setTimeout(60_000);
  await enterWorkbench(page);
  for (const route of ["/workspace/", "/insights/", "/opportunities/", "/evolution/", "/launch/", "/evidence/", "/content/", "/results/", "/decision/"]) {
    await page.goto(route);
    const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(sizes.scroll, `${route} scrollWidth=${sizes.scroll} clientWidth=${sizes.client}`).toBeLessThanOrEqual(sizes.client);
    await expect(page.locator("[data-product-workbench]")).toBeVisible();
  }
});
