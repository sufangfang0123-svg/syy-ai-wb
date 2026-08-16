import { expect, Page, test } from "@playwright/test";

async function enterWorkbench(page: Page) {
  await page.goto("/workspace/");
  await page.waitForTimeout(500);
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible().catch(() => false)) await page.keyboard.press("Escape");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

test("opportunity, concept, scenarios, content and feedback stay connected", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "desktop end-to-end workflow");
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterWorkbench(page);
  await expect(page.getByRole("heading", { name: "爆品项目总览" })).toBeVisible();
  await expect(page.locator("[data-product-workbench]")).toContainText("比赛概念方案，非全棉时代正式产品");

  await page.goto("/evolution/");
  await expect(page.locator(".concept-proposal")).toHaveCount(3);
  await page.getByRole("button", { name: "选择方案" }).first().click();
  await page.getByLabel("人工选择理由").fill("选择固定三日版用于验证状态传递。");
  await page.getByRole("button", { name: "确认并锁定当前版本" }).click();

  await page.goto("/launch/");
  await expect(page.locator(".scenario-table > article")).toHaveCount(100);
  await expect(page.getByText("100 / 100 个固定组合")).toBeVisible();
  await page.locator(".scenario-table > article").first().getByRole("button", { name: "进入Validation" }).click();
  await expect(page.locator(".scenario-table > article").first()).toContainText("validation");

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
  await enterWorkbench(page);
  for (const route of ["/workspace/", "/insights/", "/opportunities/", "/evolution/", "/launch/", "/evidence/", "/content/", "/results/", "/decision/"]) {
    await page.goto(route);
    const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(sizes.scroll, `${route} scrollWidth=${sizes.scroll} clientWidth=${sizes.client}`).toBeLessThanOrEqual(sizes.client);
    await expect(page.locator("[data-product-workbench]")).toBeVisible();
  }
});
