import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { APIRequestContext, APIResponse, expect, Page, test, TestInfo } from "@playwright/test";

const profile = process.env.TEST_BUILD_PROFILE ?? "public_demo";
const apiBase = "http://127.0.0.1:8000/api/v1";
const capturePublicEvidence = process.env.UAT_CAPTURE === "1";
const dimensions = ["NEED", "COMMERCIAL", "PRODUCT", "SUPPLY", "COMPLIANCE"] as const;

type Dimension = (typeof dimensions)[number];

interface ProjectRecord {
  id: string;
  name: string;
  revision: number;
  current_round: number;
}

interface EvidenceRecord {
  id: string;
  title: string;
  status: "draft" | "confirmed";
  origin_kind: "manual" | "url" | "paste" | "file";
  original_filename: string | null;
  snapshot_ref: string;
}

interface AssumptionRecord {
  id: string;
  dimension: Dimension;
}

interface GateRecord {
  id: string;
  result: "CONTINUE" | "SUPPLEMENT" | "STOP";
  rule_version: string;
  is_stale: boolean;
}

interface DecisionRecord {
  id: string;
  decision: "CONTINUE" | "SUPPLEMENT" | "STOP";
  is_stale: boolean;
}

interface ExportRecord {
  export_version: string;
  exported_at: string;
  project: ProjectRecord;
  evidence: EvidenceRecord[];
  assumptions: AssumptionRecord[];
  links: Array<{ id: string }>;
  evidence_relations: Array<{ id: string }>;
  tests: Array<{ id: string }>;
  validation_results: Array<{ id: string }>;
  rounds: Array<{ id: string; round_number: number }>;
  gates: GateRecord[];
  decisions: DecisionRecord[];
  audit_events: Array<{ action: string }>;
}

interface FrameRecord {
  file: string;
  description: string;
  sha256: string;
}

async function responseJson<T>(response: APIResponse, operation: string): Promise<T> {
  if (!response.ok()) {
    throw new Error(`${operation}失败 (${response.status()}): ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

async function postJson<T>(request: APIRequestContext, path: string, data?: unknown): Promise<T> {
  return responseJson<T>(await request.post(`${apiBase}${path}`, data === undefined ? undefined : { data }), `POST ${path}`);
}

async function getJson<T>(request: APIRequestContext, path: string): Promise<T> {
  return responseJson<T>(await request.get(`${apiBase}${path}`), `GET ${path}`);
}

async function sha256File(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function focusSection(page: Page, selector: string): Promise<void> {
  const section = page.locator(selector);
  await expect(section).toBeVisible();
  await section.evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.waitForTimeout(120);
}

async function captureFrame(
  page: Page,
  testInfo: TestInfo,
  outputRoot: string,
  sequence: number,
  slug: string,
  description: string,
): Promise<FrameRecord> {
  const filename = `${String(sequence).padStart(2, "0")}-${slug}.jpg`;
  const absolutePath = join(outputRoot, "frames", filename);
  await page.screenshot({
    path: absolutePath,
    type: "jpeg",
    quality: 88,
    fullPage: false,
    animations: "disabled",
  });
  await testInfo.attach(`UAT ${String(sequence).padStart(2, "0")} · ${description}`, {
    path: absolutePath,
    contentType: "image/jpeg",
  });
  return {
    file: `frames/${filename}`,
    description,
    sha256: await sha256File(absolutePath),
  };
}

async function reloadProject(page: Page, projectId: string): Promise<void> {
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("选择真实项目").selectOption(projectId);
  await expect(page.getByLabel("选择真实项目")).toHaveValue(projectId);
}

test("fixed de-identified system acceptance case produces a traceable UAT evidence package", async ({ page, request }, testInfo) => {
  test.skip(profile !== "local_integrated", "local_integrated build only");
  test.skip(testInfo.project.name.includes("mobile"), "the public UAT evidence package uses the fixed 1440×900 desktop viewport");

  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });

  const outputRoot = capturePublicEvidence
    ? resolve(process.cwd(), "public", "evidence", "uat-v0.3.1")
    : testInfo.outputPath("uat-v0.3.1");
  await mkdir(join(outputRoot, "frames"), { recursive: true });

  const generatedAt = new Date().toISOString();
  const frames: FrameRecord[] = [];

  await page.goto("/real/", { waitUntil: "networkidle" });
  await expect(page.getByTestId("real-workspace")).toBeVisible();
  await page.getByLabel("选择真实项目").selectOption("");
  await expect(page.getByRole("heading", { name: "创建第一个真实项目" })).toBeVisible();
  await page.getByLabel("项目名称").fill("系统验收案例｜棉品下一笔投入闭环 UAT v0.3.1");
  await page.getByLabel("决策问题").fill("固定脱敏夹具是否满足进入下一轮验证的条件？");
  await page.getByLabel("描述（可空）").fill("固定脱敏系统验收夹具；非客户成果，不含真实企业或个人数据。");
  await page.getByLabel("产品品类（可空）").fill("棉品行业验证包（系统验收）");
  await page.getByLabel("目标用户（可空）").fill("虚拟验收角色");
  await page.getByLabel("下一笔计划投入（CNY）").fill("60000");
  await page.getByRole("button", { name: "创建真实项目" }).click();
  await expect(page.getByLabel("选择真实项目")).not.toHaveValue("");
  const projectId = await page.getByLabel("选择真实项目").inputValue();
  expect(projectId).toMatch(/^prj_/);
  await focusSection(page, "#real-step-01");
  frames.push(await captureFrame(page, testInfo, outputRoot, 1, "project-created", "创建固定脱敏系统验收项目"));

  const csvFixture = [
    "dimension,claim,fixture_value,data_classification",
    "NEED,固定验收需求事实,68,synthetic_uat_fixture",
  ].join("\n");
  await page.getByLabel("Evidence文件").setInputFiles({
    name: "uat-cotton-evidence.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csvFixture, "utf8"),
  });
  await page.getByRole("button", { name: "导入文件" }).click();
  await expect(page.getByRole("status").filter({ hasText: "文件已安全导入为draft" })).toBeVisible();
  const evidence = await getJson<EvidenceRecord[]>(request, `/projects/${projectId}/evidence`);
  const fileEvidence = evidence.find((item) => item.original_filename === "uat-cotton-evidence.csv");
  expect(fileEvidence).toBeDefined();
  if (!fileEvidence) throw new Error("导入后未找到固定UAT文件Evidence");
  expect(fileEvidence.origin_kind).toBe("file");
  expect(fileEvidence.snapshot_ref).not.toMatch(/^[A-Za-z]:[\\/]/);
  await focusSection(page, "#real-step-02");
  frames.push(await captureFrame(page, testInfo, outputRoot, 2, "material-imported", "导入脱敏CSV材料并保留draft状态"));

  await page.locator(`#${fileEvidence.id}`).getByRole("button", { name: "人工确认" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Evidence已确认" })).toBeVisible();
  await expect(page.locator(`#${fileEvidence.id}`)).toContainText("confirmed");
  frames.push(await captureFrame(page, testInfo, outputRoot, 3, "evidence-confirmed", "人工确认文件Evidence且保持未自动关联"));

  const evidenceByDimension = new Map<Dimension, EvidenceRecord>();
  evidenceByDimension.set("NEED", fileEvidence);
  for (const [index, dimension] of dimensions.slice(1).entries()) {
    const record = await postJson<EvidenceRecord>(request, `/projects/${projectId}/evidence/paste`, {
      title: `${dimension}固定脱敏Evidence`,
      publisher: "系统验收夹具（脱敏）",
      raw_text: `${dimension}固定验收事实${index + 2}；仅用于系统验收，不代表真实客户研究结论。`,
      summary: `${dimension}系统验收摘要`,
      applicable_scope: "v0.3.1固定系统验收项目",
      limitations: "合成夹具，不能作为市场、经营或客户成果证据",
    });
    await postJson<EvidenceRecord>(request, `/evidence/${record.id}/confirm`);
    evidenceByDimension.set(dimension, record);
  }

  const assumptions: AssumptionRecord[] = [];
  for (const [index, dimension] of dimensions.entries()) {
    const assumption = await postJson<AssumptionRecord>(request, `/projects/${projectId}/assumptions`, {
      statement: `${dimension}维固定系统验收假设达到预设阈值`,
      criticality: 5,
      dimension,
      potential_loss: 20000 + index * 100,
      avoidable_loss: 12000 + index * 100,
    });
    const linkedEvidence = evidenceByDimension.get(dimension);
    expect(linkedEvidence).toBeDefined();
    if (!linkedEvidence) throw new Error(`${dimension}缺少固定UAT Evidence`);
    await postJson(request, `/assumptions/${assumption.id}/links`, {
      evidence_id: linkedEvidence.id,
      direction: "support",
      strength: 4,
    });
    assumptions.push(assumption);
  }

  await postJson(request, `/projects/${projectId}/evidence-relations`, {
    source_evidence_id: evidenceByDimension.get("NEED")?.id,
    target_evidence_id: evidenceByDimension.get("PRODUCT")?.id,
    relation_type: "supports",
    notes: "系统验收负责人确认的夹具内支持关系；非客户事实",
  });
  await reloadProject(page, projectId);
  await focusSection(page, "#real-step-03");
  await expect(page.locator("#real-step-03")).toContainText("NEED维固定系统验收假设");
  frames.push(await captureFrame(page, testInfo, outputRoot, 4, "assumptions-linked", "建立五维假设、人工Evidence链接与治理关系"));

  const actualValues = [68, 71, 66, 70, 73];
  for (const [index, assumption] of assumptions.entries()) {
    const validation = await postJson<{ id: string }>(request, `/projects/${projectId}/tests`, {
      assumption_id: assumption.id,
      name: `${assumption.dimension}固定系统验收指标`,
      method: "固定脱敏样本指标回放（系统验收）",
      estimated_cost: 600,
      estimated_days: 1,
      success_criterion: "夹具指标达到60%",
      metric_name: "系统验收通过率",
      metric_unit: "%",
      direction: "at_least",
      baseline_value: 40,
      threshold_value: 60,
      stop_threshold: 30,
    });
    await postJson(request, `/tests/${validation.id}/result`, {
      actual_value: actualValues[index],
      sample_size: 24,
      executed_at: "2026-08-16T00:00:00Z",
      source: "固定脱敏系统验收夹具",
      summary: `合成UAT结果${actualValues[index]}，非真实用户或客户数据`,
      deviation_notes: "无；固定夹具回放",
    });
  }
  await reloadProject(page, projectId);
  await focusSection(page, "#real-step-04");
  await expect(page.locator("#real-step-04")).toContainText("派生结果 pass");
  frames.push(await captureFrame(page, testInfo, outputRoot, 5, "validation-results", "创建阈值验证并回填固定脱敏结果"));

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.getByRole("button", { name: "执行Gate" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Gate已按当前数据重新计算" })).toBeVisible();
  const gate = await getJson<GateRecord>(request, `/projects/${projectId}/gate/current`);
  expect(gate.result).toBe("CONTINUE");
  expect(gate.rule_version).toBe("NDG_GATE_V0.3.0");
  await expect(page.getByText("继续投入", { exact: true }).first()).toBeVisible();
  frames.push(await captureFrame(page, testInfo, outputRoot, 6, "gate-evaluated", "按NDG_GATE_V0.3.0确定性规则生成Gate"));

  await focusSection(page, "#real-step-00");
  await page.getByLabel("人工决策（不得比Gate更激进）").selectOption("CONTINUE");
  await page.getByLabel("决策理由").fill("系统验收负责人复核规则快照后确认；非企业审批结论。");
  await page.getByLabel("负责人（自我声明）").fill("系统验收负责人（自我声明）");
  await page.getByRole("button", { name: "记录人工Decision" }).click();
  await expect(page.getByRole("status").filter({ hasText: "人工Decision已记录" })).toBeVisible();
  const decision = await getJson<DecisionRecord>(request, `/projects/${projectId}/decision/current`);
  expect(decision.decision).toBe("CONTINUE");
  frames.push(await captureFrame(page, testInfo, outputRoot, 7, "human-decision", "人工负责人记录自我声明Decision与理由"));

  await postJson<EvidenceRecord>(request, `/evidence/${fileEvidence.id}/unconfirm`);
  expect((await request.get(`${apiBase}/projects/${projectId}/gate/current`)).status()).toBe(404);
  expect((await request.get(`${apiBase}/projects/${projectId}/decision/current`)).status()).toBe(404);
  const gateHistory = await getJson<GateRecord[]>(request, `/projects/${projectId}/gates`);
  const decisionHistory = await getJson<DecisionRecord[]>(request, `/projects/${projectId}/decisions`);
  expect(gateHistory.find((item) => item.id === gate.id)?.is_stale).toBe(true);
  expect(decisionHistory.find((item) => item.id === decision.id)?.is_stale).toBe(true);
  await reloadProject(page, projectId);
  await focusSection(page, "#real-step-05");
  await expect(page.locator("#real-step-05")).toContainText("已失效");
  frames.push(await captureFrame(page, testInfo, outputRoot, 8, "decision-stale", "关键Evidence状态变化使旧Gate与Decision失效但不覆盖历史"));

  await page.getByRole("button", { name: "创建下一轮" }).click();
  await expect(page.getByRole("status").filter({ hasText: "已创建下一轮" })).toBeVisible();
  await expect(page.getByText(/当前有效 Gate · Round 2/)).toBeVisible();
  await focusSection(page, "#real-step-05");
  frames.push(await captureFrame(page, testInfo, outputRoot, 9, "next-round", "创建下一轮并保留旧Gate与Decision历史"));

  const exported = await getJson<ExportRecord>(request, `/projects/${projectId}/export`);
  expect(exported.project.name).toContain("系统验收案例");
  expect(exported.project.current_round).toBe(2);
  expect(exported.evidence).toHaveLength(5);
  expect(exported.assumptions).toHaveLength(5);
  expect(exported.links).toHaveLength(5);
  expect(exported.evidence_relations).toHaveLength(1);
  expect(exported.tests).toHaveLength(5);
  expect(exported.validation_results).toHaveLength(5);
  expect(exported.rounds.map((round) => round.round_number).sort()).toEqual([1, 2]);
  expect(exported.gates).toHaveLength(1);
  expect(exported.decisions).toHaveLength(1);
  expect(exported.gates[0].is_stale).toBe(true);
  expect(exported.decisions[0].is_stale).toBe(true);
  for (const action of ["file_imported", "confirmed", "derived", "evaluated", "human_confirmed", "draft", "created"]) {
    expect(exported.audit_events.map((event) => event.action)).toContain(action);
  }

  const exportJson = `${JSON.stringify(exported, null, 2)}\n`;
  expect(exportJson).not.toMatch(/[A-Za-z]:\\/);
  expect(exportJson).not.toMatch(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  expect(exportJson).not.toContain("真实客户案例");
  const exportPath = join(outputRoot, "system-acceptance-export.json");
  await writeFile(exportPath, exportJson, "utf8");
  const exportSha256 = await sha256File(exportPath);
  await testInfo.attach("脱敏UAT JSON导出", { path: exportPath, contentType: "application/json" });

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.getByRole("link", { name: "导出JSON" })).toHaveAttribute("href", new RegExp(`/api/v1/projects/${projectId}/export$`));
  frames.push(await captureFrame(page, testInfo, outputRoot, 10, "export-ready", "核验脱敏JSON导出与完整审计追溯"));

  const manifest = {
    schemaVersion: "evolution-lab/system-acceptance-evidence/v1",
    label: "系统验收案例",
    caseType: "system_acceptance",
    version: "v0.3.1",
    buildProfile: "local_integrated",
    generatedAt,
    dataClassification: "固定脱敏UAT夹具",
    customerData: false,
    containsSensitiveData: false,
    claimBoundary: "用于证明系统闭环可执行，不代表客户成果、真实市场结论或企业审批结果。",
    projectId,
    gateRuleVersion: gate.rule_version,
    gateRuleChangedByThisTest: false,
    flow: [
      "创建项目",
      "导入材料",
      "确认Evidence",
      "建立五维假设与人工关系",
      "创建Validation并回填Result",
      "执行Gate",
      "记录人工Decision",
      "变更关键Evidence并验证stale",
      "创建下一轮",
      "导出JSON",
    ],
    export: {
      file: "system-acceptance-export.json",
      sha256: exportSha256,
    },
    frames,
  };
  const manifestPath = join(outputRoot, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const manifestSha256 = await sha256File(manifestPath);

  const checksumLines = [
    `${exportSha256}  system-acceptance-export.json`,
    `${manifestSha256}  manifest.json`,
    ...frames.map((frame) => `${frame.sha256}  ${frame.file}`),
  ];
  await writeFile(join(outputRoot, "SHA256SUMS.txt"), `${checksumLines.join("\n")}\n`, "utf8");

  const relativeRoot = relative(process.cwd(), outputRoot).replaceAll("\\", "/");
  expect(frames).toHaveLength(10);
  expect(checksumLines).toHaveLength(12);
  testInfo.annotations.push({
    type: "system-acceptance-evidence",
    description: `${capturePublicEvidence ? "public" : "test-output"}:${relativeRoot}`,
  });
});
