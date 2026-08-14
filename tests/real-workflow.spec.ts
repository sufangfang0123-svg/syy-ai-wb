import { expect, test } from "@playwright/test";

const profile = process.env.TEST_BUILD_PROFILE ?? "public_demo";

test("real workflow persists, recalculates and keeps history", async ({ page, request }) => {
  test.skip(profile !== "local_integrated", "local integrated build only");
  await page.goto("/real/");
  await expect(page.getByRole("heading", { name: "创建第一个真实项目" })).toBeVisible();

  await page.getByLabel("项目名称").fill("Playwright真实闭环验收");
  await page.getByLabel("决策问题").fill("是否进入下一轮样品测试？");
  await page.getByRole("button", { name: "创建真实项目" }).click();
  await expect(page.getByText(/revision 1/)).toBeVisible();
  const projectId = await page.getByText(/^prj_/).innerText();
  await page.reload();
  await expect(page.getByLabel("选择真实项目")).toHaveValue(projectId);

  await page.getByLabel("标题", { exact: true }).fill("脱敏访谈记录");
  await page.getByLabel("来源/发布方").fill("受控研究夹具");
  await page.getByLabel("原文或研究记录").fill("12名目标用户中8名愿意参加下一轮样品押金测试。此文本为脱敏测试夹具。");
  await page.getByRole("button", { name: "保存draft Evidence" }).click();
  await expect(page.getByText(/manual · 受控研究夹具 · draft/)).toBeVisible();
  await page.getByRole("button", { name: "人工确认" }).click();
  await expect(page.getByText(/manual · 受控研究夹具 · confirmed/)).toBeVisible();

  await page.getByLabel("假设陈述").fill("目标用户愿意支付可退押金参与样品测试");
  await page.getByRole("button", { name: "创建假设" }).click();
  const assumption = page.locator("article").filter({ hasText: "目标用户愿意支付可退押金" });
  await assumption.getByRole("combobox").first().selectOption({ label: "脱敏访谈记录 · confirmed" });
  await assumption.getByLabel("关系强度").fill("4");
  await assumption.getByRole("button", { name: "关联" }).click();

  await page.getByLabel("关联假设").selectOption({ label: "目标用户愿意支付可退押金参与样品测试" });
  await page.getByLabel("验证名称").fill("12人样品押金测试");
  await page.getByLabel("方法").fill("展示真实样品并记录押金支付选择");
  await page.getByLabel("成功标准").fill("至少7人支付可退押金");
  await page.getByLabel("预计成本").fill("800");
  await page.getByLabel("预计天数").fill("5");
  await page.getByRole("button", { name: "创建验证" }).click();

  await page.getByRole("button", { name: "执行Gate" }).click();
  await expect(page.getByText("补充证据", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "pass" }).click();
  await page.getByRole("button", { name: "执行Gate" }).click();
  await expect(page.getByText("继续投入", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "生成Decision" }).click();
  await expect(page.getByRole("heading", { name: "继续投入" })).toBeVisible();

  await page.getByRole("button", { name: "fail" }).click();
  await expect(page.getByText("已失效").first()).toBeVisible();
  await page.getByRole("button", { name: "执行Gate" }).click();
  await expect(page.getByText("停止投入", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "生成Decision" }).click();
  await expect(page.getByRole("heading", { name: "停止投入" })).toBeVisible();

  const exported = await request.get(`http://127.0.0.1:8000/api/v1/projects/${projectId}/export`);
  expect(exported.ok()).toBe(true);
  const body = await exported.json();
  expect(new Set(body.gates.map((gate: { result: string }) => gate.result))).toEqual(new Set(["SUPPLEMENT", "CONTINUE", "STOP"]));
  expect(Object.keys(await page.evaluate(() => window.localStorage))).not.toContain("REAL-DRAFT-001");
});

test("URL import rejects a local address without creating fake evidence", async ({ page }) => {
  test.skip(profile !== "local_integrated", "local integrated build only");
  await page.goto("/real/");
  await page.getByPlaceholder("https://公开可访问页面").fill("http://127.0.0.1/private");
  await page.getByRole("button", { name: "采集单URL" }).click();
  await expect(page.getByTestId("real-workspace").getByRole("alert")).toContainText(/不允许|公网|URL|请求失败/);
  await expect(page.getByText(/url ·/)).toHaveCount(0);
});
