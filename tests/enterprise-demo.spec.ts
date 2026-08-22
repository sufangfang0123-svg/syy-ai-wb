import { expect, test } from "@playwright/test";

const profile = process.env.TEST_BUILD_PROFILE ?? "public_demo";

test.describe("v0.4.0 enterprise closed-loop walkthrough", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(profile !== "public_demo", "public showcase only");
    await page.goto("/enterprise-demo/");
  });

  test("separates implemented, demo, pilot and planned evidence", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /AI不是替企业赌爆款/ })).toBeVisible();
    await expect(page.getByText("固定脱敏夹具", { exact: true })).toBeVisible();
    await expect(page.getByText("非客户成果", { exact: true })).toBeVisible();
    await expect(page.getByText("真实云端能力待试点", { exact: true })).toBeVisible();
    await expect(page.getByText("当前已实现", { exact: true })).toBeVisible();
    await expect(page.getByText("下一阶段能力", { exact: true })).toBeVisible();
    await expect(page.getByText(/Provider默认关闭，请求次数为0/)).toBeVisible();
  });

  test("explains AI, deterministic rules and human accountability separately", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "生成与整理候选" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "校验与风险控制" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "确认事实与承担责任" })).toBeVisible();
    await expect(page.getByText(/不能确认事实 · 不能修改Gate/)).toBeVisible();
    await expect(page.getByText(/不是企业账号或审批系统/)).toBeVisible();
  });

  test("exposes the governed workflow without automatic ranking claims", async ({ page }) => {
    const steps = page.locator(".enterprise-workflow > li");
    await expect(steps).toHaveCount(16);
    const sixth = page.locator(".enterprise-workflow details").nth(5);
    await sixth.locator("summary").click();
    await expect(sixth.locator("p")).toContainText("不评分、不排名、不自动Top N");
    const fourth = page.locator(".enterprise-workflow details").nth(3);
    await fourth.locator("summary").click();
    await expect(fourth.locator("p")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/爆款概率|成功概率|市场潜力分|AI自动决策|已验证商业价值/);
  });

  test("public showcase makes no FastAPI request and keeps real workspace closed", async ({ page }) => {
    const apiRequests: string[] = [];
    page.on("request", request => {
      if (/127\.0\.0\.1:8000|\/api\/v1\//.test(request.url())) apiRequests.push(request.url());
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
    expect(apiRequests).toEqual([]);
    await page.goto("/real/");
    await expect(page.getByText("公开构建未开放真实项目")).toBeVisible();
  });

  test("desktop and mobile remain free of page-level horizontal overflow", async ({ page }) => {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 375, height: 812 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/enterprise-demo/");
      const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      expect(widths.document, `${viewport.width}px document width`).toBeLessThanOrEqual(widths.viewport);
      await expect(page.getByRole("link", { name: "查看16步闭环" })).toBeVisible();
      await expect(page.getByRole("link", { name: "查看试点条件" })).toBeVisible();
    }
  });
});
