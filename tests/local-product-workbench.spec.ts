import { APIRequestContext, expect, Page, test } from "@playwright/test";

const profile = process.env.TEST_BUILD_PROFILE ?? "public_demo";
const api = "http://127.0.0.1:8000/api/v1";
type Entity = { id:string; status?:string };
type WorkbenchBundle = {
  category_pack:{id:string}; provider:{status:string;requests:number}; evidence:Entity[]; content_assets:Entity[];
  scenarios:Entity[]; feedback_records:Entity[]; change_proposals:Entity[];
  audit_events:Array<{entity_type:string;action:string}>;
};
type GatePayload = {id:string;result:string;rule_version:string};
type ExportPayload = {export_version:string;ai_proposals:Entity[];content_assets:Entity[]};

async function json<T>(response: Awaited<ReturnType<APIRequestContext["get"]>>): Promise<T> {
  expect(response.ok(), await response.text()).toBe(true);
  return response.json() as Promise<T>;
}

async function openProject(page: Page, projectId: string, route = "/workspace/") {
  await page.goto(route);
  const picker = page.getByLabel("当前真实项目");
  await expect(picker).toBeVisible();
  await picker.selectOption(projectId);
  await expect(picker).toHaveValue(projectId);
}

test("local product workbench persists the woven apparel review chain", async ({ page, request }, testInfo) => {
  test.skip(profile !== "local_integrated", "local_integrated only");
  test.skip(testInfo.project.name.includes("mobile"), "the semantic full-chain test is desktop; all four viewport layouts run separately");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

  const project = await json<{id:string;revision:number}>(await request.post(`${api}/projects`, { data: {
    name: "有纺服装真实持久化E2E", decision_question: "是否进入下一轮打样验证？",
    description: "固定脱敏系统验收项目，非客户成果", product_category: "有纺服装",
    target_user: "通勤人群假设", planned_investment: 12000, currency: "CNY",
  }}));
  await openProject(page, project.id);
  await expect(page.locator("[data-product-workbench]")).toHaveAttribute("data-workbench-adapter", "local_api");
  await expect(page.getByText("有纺服装行业包 · 1.0.0")).toBeVisible();
  await expect(page.getByText(/Provider 0次/)).toBeVisible();

  await page.goto("/insights/");
  await page.getByLabel("材料标题").fill("授权面料规格夹具");
  await page.getByLabel("来源/发布方").fill("系统验收夹具（脱敏）");
  await page.getByLabel("原始内容").fill("全棉成分、洗后稳定性与价格仍待企业技术和真实研究确认。");
  await page.getByLabel("摘要（人工）").fill("有纺通勤内搭材料候选，全部结论待验证。");
  await page.getByLabel("适用范围").fill("系统验收");
  await page.getByLabel("限制").fill("非客户材料，不代表全棉时代正式产品");
  await page.getByRole("button", { name: "保存Evidence草稿" }).click();
  await expect(page.getByRole("status")).toContainText("已保存到本地数据库");
  await page.getByRole("button", { name: "人工确认" }).click();

  let bundle = await json<WorkbenchBundle>(await request.get(`${api}/projects/${project.id}/workbench`));
  const evidence = bundle.evidence.at(-1)!;
  const assumption = await json<Entity>(await request.post(`${api}/projects/${project.id}/assumptions`, { data: {
    statement: "通勤内搭必须验证贴肤体验和洗后稳定性", criticality: 5, dimension: "PRODUCT", potential_loss: 6000, avoidable_loss: 4000,
  }}));
  expect((await request.post(`${api}/assumptions/${assumption.id}/links`, { data: { evidence_id: evidence.id, direction: "support", strength: 4 } })).ok()).toBe(true);

  await page.goto("/opportunities/");
  await page.getByRole("button", { name: "准备当前项目示例" }).click();
  await expect(page.getByLabel("AI建议包JSON")).not.toHaveValue("");
  await page.getByRole("button", { name: "导入建议包" }).click();
  await expect(page.getByText(/manual_ai_import/)).toBeVisible();
  await page.getByRole("button", { name: "人工接受" }).click();
  await expect(page.getByText("已进入正式域的Opportunity")).toBeVisible();

  await page.goto("/evolution/");
  await page.getByRole("button", { name: "保存候选概念" }).click();
  await expect(page.getByRole("heading", { name: "全棉轻适通勤内搭（比赛概念方案，非全棉时代正式产品）" })).toBeVisible();
  const conceptCard = page.locator(".concept-grid article").last();
  await conceptCard.getByLabel("人工选择/编辑理由").fill("人工确认只比较领口主变量，其余字段均为待验证假设。");
  await conceptCard.getByRole("button", { name: "选择并锁定当前版本" }).click();

  await page.goto("/launch/");
  await page.getByRole("button", { name: "生成候选空间" }).click();
  await expect(page.getByText("100个候选组合，只在漏斗中逐步复核")).toBeVisible();
  await expect(page.locator(".scenario-shortlist > article")).toHaveCount(12);
  await expect(page.locator(".scenario-shortlist").first()).toContainText("未评分 · 缺失 8 项输入");
  await page.locator(".scenario-shortlist > article").first().getByRole("button", { name: "进入Validation" }).click();

  const validation = await json<Entity>(await request.post(`${api}/projects/${project.id}/tests`, { data: {
    assumption_id: assumption.id, name: "贴肤与洗后稳定性验证", method: "脱敏受控测试夹具",
    estimated_cost: 600, estimated_days: 3, success_criterion: "通过率达到60%",
    metric_name: "通过率", metric_unit: "%", direction: "at_least", baseline_value: 40, threshold_value: 60, stop_threshold: 30,
  }}));
  expect((await request.post(`${api}/tests/${validation.id}/result`, { data: {
    actual_value: 62, sample_size: 20, executed_at: "2026-08-21T02:00:00Z", source: "固定脱敏系统验收报告", summary: "非客户成果",
  }})).ok()).toBe(true);

  await page.goto("/content/");
  await page.getByLabel("Hook").fill("通勤内搭先看哪三项规格？");
  await page.getByLabel("正文/脚本").fill("通勤内搭规格与洗护边界待验证，请查看当前证据和限制。");
  await page.getByRole("button", { name: "创建并检查" }).click();
  await page.getByRole("button", { name: "人工审核通过" }).click();
  bundle = await json<WorkbenchBundle>(await request.get(`${api}/projects/${project.id}/workbench`));
  const content = bundle.content_assets.at(-1)!;

  await page.goto("/results/");
  const csv = `channel,content_asset_id,window_start,window_end,source,impressions,clicks,interactions,saves,add_to_cart,conversions,metric_definition,owner,data_nature,notes\n小红书,${content.id},2026-08-20T00:00:00+08:00,2026-08-21T00:00:00+08:00,固定脱敏系统验收,100,20,15,8,5,2,公开测试指标口径,验收负责人,manual_import,非客户成果\n`;
  await page.getByLabel("反馈CSV文件").setInputFiles({ name: "feedback.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "导入反馈CSV" }).click();
  await expect(page.getByText("固定脱敏系统验收")).toBeVisible();
  await page.getByRole("button", { name: "创建待审ChangeProposal" }).click();

  await page.goto("/decision/");
  await page.getByRole("button", { name: "人工接受" }).click();
  await expect(page.getByRole("status")).toContainText("ChangeProposal已人工接受");
  const gate = await json<GatePayload>(await request.post(`${api}/projects/${project.id}/gate`));
  expect(gate.rule_version).toBe("NDG_GATE_V0.3.0");
  const decisionResponse = await request.post(`${api}/projects/${project.id}/decision`, { data: {
    gate_evaluation_id: gate.id, decision: gate.result, rationale: "人工复核系统验收链路", decided_by: "验收负责人（人工自述）",
  }});
  expect(decisionResponse.ok(), await decisionResponse.text()).toBe(true);
  expect((await request.post(`${api}/projects/${project.id}/rounds/next`, { data: { selected_assumption_ids: [assumption.id] } })).ok()).toBe(true);

  await page.reload();
  await expect(page.getByText(`Round 2`)).toBeVisible();
  bundle = await json<WorkbenchBundle>(await request.get(`${api}/projects/${project.id}/workbench`));
  expect(bundle.category_pack.id).toBe("woven_apparel_v1");
  expect(bundle.provider).toEqual(expect.objectContaining({ status: "disabled", requests: 0 }));
  expect(bundle.scenarios).toHaveLength(100);
  expect(bundle.feedback_records).toHaveLength(1);
  expect(bundle.change_proposals.at(-1)!.status).toBe("accepted");
  expect(bundle.audit_events.some((item) => item.entity_type === "change_proposal" && item.action === "accepted")).toBe(true);
  const exported = await json<ExportPayload>(await request.get(`${api}/projects/${project.id}/export`));
  expect(exported.export_version).toBe("2.0");
  expect(exported.ai_proposals).toHaveLength(1);
  expect(exported.content_assets).toHaveLength(1);
  expect(await page.evaluate(() => ({ fixture: localStorage.getItem("cotton-product-workbench-demo:v1"), realDraft: localStorage.getItem("REAL-DRAFT-001") }))).toEqual({ fixture: null, realDraft: null });
  expect(consoleErrors.filter((line) => !line.includes("favicon"))).toEqual([]);
});

for (const viewport of [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-375", width: 375, height: 812 },
]) {
  test(`local product routes fit ${viewport.name}`, async ({ page, request }, testInfo) => {
    test.skip(profile !== "local_integrated", "local_integrated only");
    test.skip(testInfo.project.name.includes("mobile"), "four explicit viewport sizes run once in the desktop project");
    test.setTimeout(60_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const project = await json<{id:string}>(await request.post(`${api}/projects`, { data: { name: `布局-${viewport.name}`, decision_question: "页面是否无横向溢出？" } }));
    await openProject(page, project.id);
    for (const route of ["/workspace/", "/insights/", "/opportunities/", "/evolution/", "/launch/", "/evidence/", "/content/", "/results/", "/decision/"]) {
      await page.goto(route);
      await expect(page.locator("[data-product-workbench]")).toHaveAttribute("data-workbench-adapter", "local_api");
      const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(size.scroll, `${route} at ${viewport.name}`).toBeLessThanOrEqual(size.client);
    }
  });
}
