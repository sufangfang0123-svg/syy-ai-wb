import { expect, test } from "@playwright/test";

const profile = process.env.TEST_BUILD_PROFILE ?? "public_demo";

test.describe("v0.4.0 competition judge kit", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(profile !== "public_demo", "public showcase only");
    await page.goto("/judge-kit/");
  });

  test("offers a truthful two-click review route", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /三分钟看清/ })).toBeVisible();
    await expect(page.getByText("固定脱敏演示", { exact: true })).toBeVisible();
    await expect(page.getByText("Provider请求0次", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "立即体验产品" })).toHaveAttribute("href", /^\/workspace\/?$/);
    await expect(page.getByRole("link", { name: "查看AIProposal工作实例" })).toHaveAttribute("href", /^\/enterprise-demo\/?#ai-proposal-instance$/);
  });

  test("links final materials and both release videos", async ({ page }) => {
    await expect(page.getByRole("link", { name: "180秒MP4" })).toHaveAttribute("href", /v0\.4\.0-competition-closeout\/evolution-lab-v040-full-180s\.mp4$/);
    await expect(page.getByRole("link", { name: "60秒MP4" })).toHaveAttribute("href", /v0\.4\.0-competition-closeout\/evolution-lab-v040-highlight-60s\.mp4$/);
    await expect(page.getByRole("link", { name: "打开参赛索引" })).toHaveAttribute("href", /submission-index-v0\.4\.0\.md$/);
  });

  test("has no provider request or page-level horizontal overflow", async ({ page }) => {
    const apiRequests: string[] = [];
    page.on("request", request => {
      if (/api\.openai\.com|127\.0\.0\.1:8000|\/api\/v1\//.test(request.url())) apiRequests.push(request.url());
    });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 375, height: 812 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/judge-kit/");
      const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      expect(widths.document, `${viewport.width}px document width`).toBeLessThanOrEqual(widths.viewport);
    }
    expect(apiRequests).toEqual([]);
  });
});
