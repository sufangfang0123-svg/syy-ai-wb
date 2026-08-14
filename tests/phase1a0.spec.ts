import { expect, Page, test } from "@playwright/test";

const profile = process.env.TEST_BUILD_PROFILE ?? "public_demo";
const healthUrl = "http://127.0.0.1:8000/api/v1/health";

async function closeGuide(page: Page) {
  await page.waitForTimeout(700);
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible().catch(() => false)) await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

test("public_demo exposes only the independent simulation lab", async ({ page }) => {
  test.skip(profile !== "public_demo", "public_demo build only");
  await page.goto("/workspace/");
  await closeGuide(page);
  await expect(page.locator("[data-build-profile='public_demo']")).toBeVisible();
  await expect(page.getByTestId("service-status-public")).toContainText("仅模拟");
  await expect(page.getByRole("button", { name: "真实项目入口" })).toHaveCount(0);
  await expect(page.getByTestId("demo-boundary")).toContainText("独立模拟研究实验室");
});

test("local_integrated keeps the real entry closed when health check fails", async ({ page }) => {
  test.skip(profile !== "local_integrated", "local_integrated build only");
  await page.route(healthUrl, (route) => route.abort("connectionrefused"));
  await page.goto("/workspace/");
  await closeGuide(page);
  await expect(page.getByTestId("service-status-unavailable")).toContainText("真实服务不可用");
  await expect(page.getByRole("button", { name: "真实项目入口" })).toBeDisabled();
  await expect(page.getByTestId("real-service-boundary")).toHaveCount(0);
});

test("local_integrated opens the real workspace only after a valid health response", async ({ page }) => {
  test.skip(profile !== "local_integrated", "local_integrated build only");
  await page.route(healthUrl, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ status: "ok" }),
  }));
  await page.goto("/workspace/");
  await closeGuide(page);
  await expect(page.getByTestId("service-status-available")).toContainText("本地真实服务可用");
  await page.getByRole("button", { name: "真实项目入口" }).click();
  await expect(page).toHaveURL(/\/real\/$/);
  await expect(page.getByTestId("real-workspace")).toBeVisible();
  await expect(page.getByText("所有真实记录只写入FastAPI连接的SQLite")).toBeVisible();
  await expect(page.getByLabel("想做什么新品")).toHaveCount(0);
  const keys = await page.evaluate(() => Object.keys(window.localStorage));
  expect(keys.some((key) => key.includes("decision-real") || key.includes("active-mode"))).toBe(false);
});
