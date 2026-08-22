import { APIRequestContext, expect, Page, test } from "@playwright/test";

const profile = process.env.TEST_BUILD_PROFILE ?? "public_demo";
const api = "http://127.0.0.1:8000/api/v1";
type Entity = { id:string; status?:string; source_scenario_id?:string; concept_id?:string|null; locked?:boolean };
type WorkbenchBundle = {
  category_pack:{id:string}; provider:{status:string;requests:number}; evidence:Entity[]; content_assets:Entity[];
  scenarios:Entity[]; concepts:Entity[]; feedback_records:Entity[]; change_proposals:Entity[];
  audit_events:Array<{entity_type:string;action:string;metadata_json?:string}>;
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
  await expect(page.getByText("系统Provider请求 0次", { exact: true })).toBeVisible();
  const workflowLinks = page.getByLabel("真实产品工作流阶段").getByRole("link");
  await expect(workflowLinks.nth(2)).toContainText("03情景宇宙与短名单");
  await expect(workflowLinks.nth(3)).toContainText("04基于短名单共创");

  await page.goto("/insights/");
  await page.getByLabel("材料标题").fill("授权面料规格夹具");
  await page.getByLabel("来源/发布方").fill("系统验收夹具（脱敏）");
  await page.getByLabel("原始内容").fill("全棉成分、洗后稳定性与价格仍待企业技术和真实研究确认。");
  await page.getByLabel("摘要（人工）").fill("有纺通勤内搭材料候选，全部结论待验证。");
  await page.getByLabel("适用范围").fill("系统验收");
  await page.getByLabel("限制").fill("非客户材料，不代表全棉时代正式产品");
  await page.getByRole("button", { name: "保存Evidence草稿" }).click();
  await expect(page.getByRole("status")).toContainText("Evidence草稿已保存");
  await page.getByRole("button", { name: "人工确认" }).click();

  let bundle = await json<WorkbenchBundle>(await request.get(`${api}/projects/${project.id}/workbench`));
  const evidence = bundle.evidence.at(-1)!;
  const assumption = await json<Entity>(await request.post(`${api}/projects/${project.id}/assumptions`, { data: {
    statement: "通勤内搭必须验证贴肤体验和洗后稳定性", criticality: 5, dimension: "PRODUCT", potential_loss: 6000, avoidable_loss: 4000,
  }}));
  expect((await request.post(`${api}/assumptions/${assumption.id}/links`, { data: { evidence_id: evidence.id, direction: "support", strength: 4 } })).ok()).toBe(true);

  await page.goto("/opportunities/");
  await expect(page.getByRole("button", { name: "准备当前项目示例" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "复制空白模板" })).toBeVisible();
  const refs = [project.id, evidence.id, assumption.id];
  const snapshotQuery = refs.map((ref) => `refs=${encodeURIComponent(ref)}`).join("&");
  const snapshot = await json<{input_snapshot_hash:string}>(await request.get(`${api}/projects/${project.id}/ai-proposals/snapshot?${snapshotQuery}`));
  const proposalPackage = {
    task_type: "opportunity", input_entity_references: refs, input_snapshot_hash: snapshot.input_snapshot_hash,
    origin: "manual_ai_import", provider: null, model: null, prompt_template_version: "manual_template_v1", output_schema_version: "ai_proposal_v1",
    candidates: [{ title: "全棉轻适通勤内搭机会（待验证）", description: "用户粘贴的固定脱敏系统验收候选；不代表市场结论。", evidence_ids: [evidence.id], contrary_evidence: [], alternatives: ["沿用现有基础款"], assumption_ids: [assumption.id], category_fit: "字段匹配仍需企业技术确认" }],
    reasons: ["只用于验收人工导入"], contrary_evidence: [], uncertainty: ["需求与供应尚未验证"], missing_inputs: [], limitations: ["外部候选，非本系统Provider输出"], actor: "验收负责人（人工自述）",
  };
  await page.getByLabel("候选建议包JSON").fill(JSON.stringify(proposalPackage));
  await page.getByLabel("候选内容来源").selectOption("external_ai_output");
  await page.getByRole("textbox", { name: "来源说明", exact: true }).fill("验收负责人从固定脱敏外部候选夹具粘贴，非系统Provider输出");
  await page.getByText("我确认上述来源标记和来源说明准确").click();
  await page.getByRole("button", { name: "导入待审候选" }).click();
  await expect(page.getByText(/manual_ai_import/)).toBeVisible();
  await page.getByRole("button", { name: "人工接受" }).click();
  await expect(page.getByText("当前有效Opportunity")).toBeVisible();

  await page.goto("/evolution/");
  await expect(page.getByText("尚无可用的人工shortlist情景。")).toBeVisible();
  await expect(page.getByRole("button", { name: "保存候选概念" })).toHaveCount(0);

  await page.goto("/launch/");
  await page.getByRole("button", { name: "生成候选宇宙" }).click();
  await expect(page.getByText("4 × 5 × 5 候选情景矩阵")).toBeVisible();
  await expect(page.locator(".scenario-universe > article")).toHaveCount(100);
  await expect(page.locator(".scenario-shortlist > article")).toHaveCount(0);
  await expect(page.locator(".scenario-universe").first()).toContainText("未评分 · 缺失 8 项输入");
  bundle = await json<WorkbenchBundle>(await request.get(`${api}/projects/${project.id}/workbench`));
  expect(bundle.concepts).toHaveLength(0);
  expect(bundle.scenarios).toHaveLength(100);
  expect(bundle.scenarios.every((item) => item.concept_id === null)).toBe(true);
  const firstCandidate = page.locator(".scenario-universe > article").first();
  await firstCandidate.getByRole("checkbox", { name: /选择候选/ }).check();
  await firstCandidate.getByLabel("筛选理由").selectOption({ label: "与已确认Evidence直接相关" });
  await firstCandidate.getByLabel("操作者（人工自述）").fill("验收负责人（人工自述）");
  await firstCandidate.getByRole("checkbox", { name: /授权面料规格夹具/ }).check();
  await firstCandidate.getByRole("button", { name: "确认加入人工 shortlist" }).click();
  await expect(page.locator(".scenario-universe > article")).toHaveCount(99);
  await expect(page.locator(".scenario-shortlist > article")).toHaveCount(1);
  await expect(page.locator(".scenario-shortlist")).toContainText("与已确认Evidence直接相关");
  await page.reload();
  await expect(page.locator(".scenario-shortlist > article")).toHaveCount(1);
  await expect(page.locator(".scenario-shortlist")).toContainText("验收负责人（人工自述）");
  await expect(page.locator(".scenario-shortlist > article")).toContainText("尚未创建");

  bundle = await json<WorkbenchBundle>(await request.get(`${api}/projects/${project.id}/workbench`));
  const sourceScenario = bundle.scenarios.find((item) => item.status === "shortlisted")!;
  expect(sourceScenario.concept_id).toBeNull();
  await page.goto("/evolution/");
  await expect(page.getByLabel("来源情景（人工shortlist）")).toHaveValue(sourceScenario.id);
  await page.getByRole("button", { name: "保存候选概念" }).click();
  await expect(page.getByRole("heading", { name: "全棉轻适通勤内搭（比赛概念方案，非全棉时代正式产品）" })).toBeVisible();
  const conceptCard = page.locator(".concept-grid article").last();
  await expect(conceptCard).toContainText(sourceScenario.id);
  await conceptCard.getByLabel("人工选择/编辑理由").fill("人工确认只比较领口主变量，其余字段均为待验证假设。");
  await conceptCard.getByRole("button", { name: "选择并锁定当前版本" }).click();
  bundle = await json<WorkbenchBundle>(await request.get(`${api}/projects/${project.id}/workbench`));
  expect(bundle.concepts.at(-1)!.source_scenario_id).toBe(sourceScenario.id);
  expect(bundle.scenarios.find((item) => item.id === sourceScenario.id)!.concept_id).toBe(bundle.concepts.at(-1)!.id);

  await page.goto("/launch/");
  await page.locator(".scenario-shortlist > article").getByRole("button", { name: "标记进入Validation" }).click();
  await expect(page.locator(".scenario-state-list").first()).toContainText("已进入验证");

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
  await page.getByLabel("正文/脚本").fill("100%全棉永久改善体验（固定脱敏声明风险测试夹具）。");
  await page.getByRole("button", { name: "创建并检查" }).click();
  const contentCard = page.locator(".content-asset-grid > article").last();
  await expect(contentCard.getByRole("button", { name: "人工强制通过" })).toBeDisabled();
  await contentCard.getByLabel(/审核人/).fill("内容验收负责人（人工自述）");
  await contentCard.getByLabel(/审核理由/).fill("仅作为本地风险处理流程验收；不允许发布该声明。");
  await contentCard.getByRole("button", { name: "人工强制通过" }).click();
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
  expect(bundle.scenarios.filter((item) => item.status === "validation")).toHaveLength(1);
  expect(bundle.feedback_records).toHaveLength(1);
  expect(bundle.change_proposals.at(-1)!.status).toBe("accepted");
  expect(bundle.audit_events.some((item) => item.entity_type === "scenario_candidate" && item.action === "shortlisted")).toBe(true);
  expect(bundle.audit_events.some((item) => item.entity_type === "change_proposal" && item.action === "accepted")).toBe(true);
  const exported = await json<ExportPayload>(await request.get(`${api}/projects/${project.id}/export`));
  expect(exported.export_version).toBe("2.0");
  expect(exported.ai_proposals).toHaveLength(1);
  expect(exported.content_assets).toHaveLength(1);
  expect(await page.evaluate(() => ({ fixtureV1: localStorage.getItem("cotton-product-workbench-demo:v1"), fixtureV2: localStorage.getItem("cotton-product-workbench-demo:v2"), realDraft: localStorage.getItem("REAL-DRAFT-001") }))).toEqual({ fixtureV1: null, fixtureV2: null, realDraft: null });
  expect(consoleErrors.filter((line) => !line.includes("favicon"))).toEqual([]);
});

for (const viewport of [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-375", width: 375, height: 812 },
]) {
  test(`mobile shortlist action completes at ${viewport.name}`, async ({ page, request }, testInfo) => {
    test.skip(profile !== "local_integrated", "local_integrated only");
    test.skip(testInfo.project.name.includes("mobile"), "explicit mobile sizes run once in the desktop project");
    test.setTimeout(90_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const project = await json<{id:string}>(await request.post(`${api}/projects`, { data: {
      name: `移动端shortlist-${viewport.name}`,
      decision_question: "移动端能否完成明确的人工shortlist？",
    } }));
    const draftEvidence = await json<Entity>(await request.post(`${api}/projects/${project.id}/evidence/paste`, { data: {
      title: `移动端已确认Evidence-${viewport.name}`,
      publisher: "固定脱敏系统验收夹具",
      raw_text: "只验证移动端操作路径，不代表客户成果或市场结论。",
      applicable_scope: "移动端交互验收",
      limitations: "非客户材料",
    } }));
    const evidence = await json<Entity>(await request.post(`${api}/evidence/${draftEvidence.id}/confirm`));
    const opportunity = await json<Entity>(await request.post(`${api}/projects/${project.id}/opportunities`, { data: {
      title: "移动端人工机会假设",
      description: "负责人自行编写的系统验收假设。",
      evidence_ids: [evidence.id],
      status: "confirmed",
      actor: "移动端验收负责人",
      data_nature: "manual_hypothesis",
    } }));
    expect((await request.post(`${api}/projects/${project.id}/scenarios/generate`, { data: {
      opportunity_id: opportunity.id,
      evidence_ids: [evidence.id],
      priority_inputs: {},
      actor: "移动端验收负责人",
    } })).ok()).toBe(true);

    await openProject(page, project.id, "/launch/");
    const firstCandidate = page.locator(".scenario-universe > article").first();
    await firstCandidate.getByRole("checkbox", { name: /选择候选/ }).check();
    await firstCandidate.getByLabel("筛选理由").selectOption({ label: "用于主动寻找反证" });
    await firstCandidate.getByLabel("操作者（人工自述）").fill("移动端验收负责人");
    await firstCandidate.getByRole("checkbox", { name: new RegExp(`移动端已确认Evidence-${viewport.name}`) }).check();
    await firstCandidate.getByRole("button", { name: "确认加入人工 shortlist" }).click();
    await expect(page.locator(".scenario-shortlist > article")).toHaveCount(1);
    await expect(page.locator(".scenario-shortlist")).toContainText("用于主动寻找反证");
    await page.reload();
    await expect(page.locator(".scenario-shortlist > article")).toHaveCount(1);
    await expect(page.locator(".scenario-shortlist > article")).toContainText("尚未创建");
    await page.goto("/evolution/");
    await expect(page.getByLabel("来源情景（人工shortlist）")).toBeVisible();
    await page.getByRole("button", { name: "保存候选概念" }).click();
    const conceptCard = page.locator(".concept-grid article").last();
    await conceptCard.getByLabel("人工选择/编辑理由").fill("移动端人工选择后锁定，全部效果仍待Validation。");
    await conceptCard.getByRole("button", { name: "选择并锁定当前版本" }).click();
    await page.goto("/launch/");
    await page.locator(".scenario-shortlist > article").getByRole("button", { name: "标记进入Validation" }).click();
    await expect(page.locator(".scenario-state-list").first()).toContainText("已进入验证");
    const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(size.scroll).toBeLessThanOrEqual(size.client);
  });
}

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
