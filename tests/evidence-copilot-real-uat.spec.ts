import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const enabled=process.env.NDG_REAL_AI_UAT==="1";
const api="http://127.0.0.1:8000/api/v1";

test("one-call redacted real-provider Evidence Copilot UAT",async({page,request})=>{
  test.skip(!enabled,"requires explicit NDG_REAL_AI_UAT=1 authorization");
  const provider=await (await request.get(`${api}/ai/evidence-copilot/status`)).json();
  expect(provider.configured).toBe(true);
  expect(provider.provider).toBe("openai");
  expect(provider.model).toBeTruthy();
  const project=await (await request.post(`${api}/projects`,{data:{name:"Evidence Copilot真实Provider系统UAT（固定脱敏非客户材料）",decision_question:"候选证据是否只有经人工复核后进入项目？",planned_investment:30000,currency:"CNY"}})).json();
  const gate=await (await request.post(`${api}/projects/${project.id}/gate`)).json();
  await request.post(`${api}/projects/${project.id}/decision`,{data:{gate_evaluation_id:gate.id,decision:gate.result,rationale:"系统UAT人工决定",decided_by:"UAT负责人（自我声明）"}});
  await page.goto("/real/");
  await page.getByLabel("选择真实项目").selectOption(project.id);
  const panel=page.locator(".copilot-panel");
  await expect(panel).toContainText(provider.model);
  await panel.getByLabel("来源名称").fill("固定脱敏系统UAT材料／非客户材料");
  await panel.getByLabel("授权材料正文").fill([
    "事实一：在固定系统夹具中，编号COT-UAT-01的棉布样品克重记录为180克每平方米。该记录只适用于该编号样品。",
    "事实二：同一固定系统夹具记录该样品完成了3次折叠操作。该记录不能推出长期耐久性。",
    "事实三：固定系统夹具中的封装检查结果为包装封口完整。该结果不能外推真实生产批次。",
  ].join("\n\n"));
  await panel.getByRole("button",{name:"建立文本来源"}).click();
  await panel.getByRole("button",{name:"主动开始分析"}).click();
  const run=panel.locator(".copilot-run").first();
  await expect(run.getByText(/已生成候选|部分成功/)).toBeVisible();
  const candidates=run.locator(".copilot-candidate");
  expect(await candidates.count()).toBeGreaterThanOrEqual(3);
  for(let index=0;index<3;index++)await expect(candidates.nth(index).getByText("原文引用已定位")).toBeVisible();
  expect((await (await request.get(`${api}/projects/${project.id}`)).json()).revision).toBe(project.revision);
  expect(await (await request.get(`${api}/projects/${project.id}/evidence`)).json()).toEqual([]);

  page.once("dialog",dialog=>dialog.accept());
  await candidates.nth(0).getByRole("button",{name:"接受",exact:true}).click();
  await expect(candidates.nth(0).getByText(/正式Evidence/)).toBeVisible();
  await candidates.nth(1).getByRole("button",{name:"编辑后接受"}).click();
  await candidates.nth(1).getByLabel("候选主张").fill("负责人收窄后的系统UAT有限主张");
  await candidates.nth(1).getByLabel("复核说明").fill("负责人核对引用并收窄适用范围");
  page.once("dialog",dialog=>dialog.accept());
  await candidates.nth(1).getByRole("button",{name:"确认编辑后接受"}).click();
  await candidates.nth(2).getByRole("button",{name:"拒绝"}).click();
  await expect(candidates.nth(2).getByText("已拒绝")).toBeVisible();

  const finalProject=await (await request.get(`${api}/projects/${project.id}`)).json();
  const exportBody=await (await request.get(`${api}/projects/${project.id}/export`)).json();
  const gateHistory=await (await request.get(`${api}/projects/${project.id}/gates`)).json();
  const decisionHistory=await (await request.get(`${api}/projects/${project.id}/decisions`)).json();
  expect(finalProject.revision).toBe(project.revision+2);
  expect(exportBody.evidence).toHaveLength(2);
  expect(gateHistory[0].is_stale).toBe(true);
  expect(decisionHistory[0].is_stale).toBe(true);
  const actions=new Set(exportBody.audit_events.map((item:{action:string})=>item.action));
  for(const action of ["AI_SOURCE_CREATED","AI_RUN_STARTED","AI_RUN_SUCCEEDED","AI_CANDIDATE_ACCEPTED","AI_CANDIDATE_EDITED_ACCEPTED","AI_CANDIDATE_REJECTED"])expect(actions.has(action)).toBe(true);
  const serialized=JSON.stringify(exportBody);
  expect(serialized).not.toMatch(/\bsk-[A-Za-z0-9_-]{20,}\b|[A-Za-z]:\\Users\\/);
  await page.reload();
  await expect(page.locator(".copilot-panel").getByText("编辑后接受").first()).toBeVisible();

  const evidence={
    label:"真实Provider系统UAT／固定脱敏非客户材料",
    version:"v0.4.0",
    provider:provider.provider,
    model:provider.model,
    callCount:1,
    promptVersion:provider.prompt_version,
    outputSchemaVersion:provider.output_schema_version,
    runStatus:exportBody.ai_provenance.runs[0].status,
    candidateCount:exportBody.ai_provenance.runs[0].candidates.length,
    citationStatuses:exportBody.ai_provenance.runs[0].candidates.map((item:{citation_verification_status:string})=>item.citation_verification_status),
    reviewStatuses:exportBody.ai_provenance.runs[0].candidates.map((item:{review_status:string})=>item.review_status),
    formalEvidenceCount:exportBody.evidence.length,
    finalRevision:finalProject.revision,
    priorGateStale:gateHistory[0].is_stale,
    priorDecisionStale:decisionHistory[0].is_stale,
    auditActions:[...actions].filter(action=>String(action).startsWith("AI_")),
    exportSha256:createHash("sha256").update(serialized).digest("hex"),
    secretExposureCount:0,
    customerData:false,
  };
  const output=process.env.NDG_REAL_AI_UAT_CAPTURE==="1"?resolve("docs/uat/evidence-copilot-v0.4.0-real-provider.json"):test.info().outputPath("evidence-copilot-v0.4.0-real-provider.json");
  await mkdir(resolve(output,".."),{recursive:true});
  await writeFile(output,`${JSON.stringify(evidence,null,2)}\n`,"utf8");
  if(process.env.NDG_REAL_AI_UAT_CAPTURE==="1")await page.screenshot({path:resolve("docs/uat/evidence-copilot-v0.4.0-real-provider.png"),fullPage:true});
});
