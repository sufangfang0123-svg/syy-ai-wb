import { expect, Page, test } from "@playwright/test";

const profile = process.env.TEST_BUILD_PROFILE ?? "public_demo";
const routes = ["/", "/workspace/", "/proof/", "/pilot/", "/decision/", "/results/", "/real/"];

async function closeGuide(page: Page) {
  await page.waitForTimeout(500);
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible().catch(() => false)) await page.keyboard.press("Escape");
}

test("v0.3.1 public delivery routes, CTAs and truth boundaries are explicit", async ({ page }) => {
  test.setTimeout(60_000);
  test.skip(profile !== "public_demo", "public delivery build only");
  await page.goto("/");
  await expect(page).toHaveTitle(/Evolution Lab · Next-Dollar Gate v0\.3\.1/);
  await expect(page.getByRole("link", { name: /体验完整模拟流程/ })).toHaveAttribute("href", /workspace/);
  await expect(page.getByRole("link", { name: /查看本地闭环系统证明/ })).toHaveAttribute("href", /proof/);
  await expect(page.getByRole("link", { name: /查看企业试点说明/ })).toHaveAttribute("href", /pilot/);
  await expect(page.getByText(/公开站是模拟演示/).first()).toBeVisible();
  await page.goto("/proof/");
  await expect(page.getByRole("heading", { name: /为什么下一笔不可逆新品费用/ })).toBeVisible();
  await expect(page.getByText(/系统验收案例/).first()).toBeVisible();
  await expect(page.getByText(/不是客户案例/).first()).toBeVisible();
  await expect(page.locator(".uat-gallery img")).toHaveCount(10);
  await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLImageElement>(".uat-gallery img")).every((image) => image.complete && image.naturalWidth > 0));
  await page.goto("/pilot/");
  const issue = page.getByRole("link", { name: /提交试点申请|打开试点申请模板/ }).first();
  await expect(issue).toHaveAttribute("href", /github\.com\/sufangfang0123-svg\/syy-ai-wb\/issues\/new/);
  await expect(page.getByText(/公开Issue不得提交商业机密/).first()).toBeVisible();
  await page.goto("/real/");
  await expect(page.getByText("公开构建未开放真实项目")).toBeVisible();
  await expect(page.getByTestId("real-workspace")).toHaveCount(0);
});

for (const route of routes) {
  test(`${route} fits the v0.3.1 desktop and mobile viewport`, async ({ page }, testInfo) => {
    test.skip(profile !== "public_demo", "public delivery build only");
    if (!testInfo.project.name.includes("mobile")) await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route);
    await closeGuide(page);
    const size = page.viewportSize();
    expect(size).not.toBeNull();
    const dimensions = await page.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
    await expect(page.locator("body")).not.toContainText(/AI需求聚类|AI预筛|AI模拟|真实客户案例|Local pilot available separately/);
  });
}

test("public delivery pages expose no empty or unexplained controls", async ({ page }) => {
  test.skip(profile !== "public_demo", "public delivery build only");
  for (const route of ["/", "/proof/", "/pilot/"]) {
    await page.goto(route);
    const controls = page.locator("a[href], button");
    for (const control of await controls.all()) {
      const label = (await control.getAttribute("aria-label")) ?? (await control.textContent()) ?? "";
      expect(label.trim(), `${route} contains an unnamed control`).not.toBe("");
      if ((await control.evaluate((node) => node.tagName)) === "A") expect(await control.getAttribute("href")).not.toBe("");
    }
  }
});
