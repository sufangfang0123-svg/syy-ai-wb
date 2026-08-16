import { expect, test } from "@playwright/test";

const profile=process.env.TEST_BUILD_PROFILE??"public_demo";
const api="http://127.0.0.1:8000/api/v1";

test("public build never exposes a callable Evidence Copilot",async({page})=>{
  test.skip(profile!=="public_demo","public build only");
  await page.goto("/real/");
  await expect(page.getByText("公开构建未开放真实项目")).toBeVisible();
  await expect(page.getByRole("button",{name:"主动开始分析"})).toHaveCount(0);
  await expect(page.locator("[data-testid=real-workspace]")).toHaveCount(0);
});

test("human-reviewed AI candidates are the only items that enter Evidence and stale prior conclusions",async({page,request},testInfo)=>{
  test.skip(profile!=="local_integrated","local integrated build only");
  test.skip(testInfo.project.name.includes("mobile"),"semantic workflow runs once on desktop; mobile layout has a separate test");
  await page.setViewportSize({width:1440,height:900});
  const created=await (await request.post(`${api}/projects`,{data:{name:"Evidence Copilot脱敏E2E",decision_question:"候选证据是否经人工复核后进入项目？",planned_investment:20000,currency:"CNY"}})).json();
  const gate=await (await request.post(`${api}/projects/${created.id}/gate`)).json();
  await request.post(`${api}/projects/${created.id}/decision`,{data:{gate_evaluation_id:gate.id,decision:gate.result,rationale:"E2E人工决定",decided_by:"E2E负责人（自我声明）"}});
  await page.goto("/real/");
  await page.getByLabel("选择真实项目").selectOption(created.id);
  const panel=page.locator(".copilot-panel");
  await expect(panel).toContainText("fixture");
  await panel.getByLabel("来源名称").fill("系统评测夹具／非客户材料");
  await panel.getByLabel("授权材料正文").fill("在固定脱敏测试中，20名模拟参与者中有14名选择了方案A。\n\n该结果只适用于本次系统夹具，不能外推销量或真实市场需求。");
  await panel.getByRole("button",{name:"建立文本来源"}).click();
  await expect(panel.getByText(/尚未调用AI/)).toBeVisible();
  await panel.getByRole("button",{name:"主动开始分析"}).click();
  await expect(panel.getByText("已生成候选").first()).toBeVisible();
  await expect(panel.getByText("原文引用已定位").first()).toBeVisible();
  expect(await (await request.get(`${api}/projects/${created.id}/evidence`)).json()).toEqual([]);
  expect((await (await request.get(`${api}/projects/${created.id}`)).json()).revision).toBe(created.revision);
  await panel.getByRole("button",{name:"查看上下文"}).first().click();
  await expect(panel.getByLabel("候选引用上下文")).toContainText("文字存在于该材料，不证明材料本身正确");
  await panel.getByRole("button",{name:"关闭引用上下文"}).click();

  page.once("dialog",dialog=>dialog.accept());
  await panel.getByRole("button",{name:"接受",exact:true}).first().click();
  await expect(panel.getByText(/正式Evidence ev_/).first()).toBeVisible();
  const afterAccept=await (await request.get(`${api}/projects/${created.id}`)).json();
  expect(afterAccept.revision).toBe(created.revision+1);
  const evidence=await (await request.get(`${api}/projects/${created.id}/evidence`)).json();
  expect(evidence).toHaveLength(1);
  expect(evidence[0].status).toBe("confirmed");
  const gateHistory=await (await request.get(`${api}/projects/${created.id}/gates`)).json();
  const decisionHistory=await (await request.get(`${api}/projects/${created.id}/decisions`)).json();
  expect(gateHistory[0].is_stale).toBe(true);
  expect(decisionHistory[0].is_stale).toBe(true);

  await panel.getByRole("button",{name:"主动开始分析"}).click();
  const latest=panel.locator(".copilot-run").first().locator(".copilot-candidate");
  await latest.getByRole("button",{name:"编辑后接受"}).click();
  await latest.getByLabel("候选主张").fill("人工收窄后的有限主张");
  await latest.getByLabel("原文引用").fill("20名模拟参与者中有14名选择了方案A。");
  await latest.getByLabel("复核说明").fill("负责人依据原文收窄范围");
  page.once("dialog",dialog=>dialog.accept());
  await latest.getByRole("button",{name:"确认编辑后接受"}).click();
  await expect(latest.getByText("编辑后接受").first()).toBeVisible();
  await panel.getByRole("button",{name:"主动开始分析"}).click();
  const reject=panel.locator(".copilot-run").first().locator(".copilot-candidate");
  await reject.getByRole("button",{name:"拒绝"}).click();
  await expect(reject.getByText("已拒绝")).toBeVisible();
  await page.reload();
  await expect(page.locator(".copilot-panel").getByText("编辑后接受").first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(await page.evaluate(()=>window.innerWidth));
});

test("Evidence Copilot STEP 02 layout fits 390x844 without horizontal overflow",async({page,request},testInfo)=>{
  test.skip(profile!=="local_integrated","local integrated build only");
  test.skip(!testInfo.project.name.includes("mobile"),"mobile project only");
  const created=await (await request.post(`${api}/projects`,{data:{name:"Copilot移动端布局",decision_question:"移动端是否可复核候选？",currency:"CNY"}})).json();
  await page.goto("/real/");
  await page.getByLabel("选择真实项目").selectOption(created.id);
  await expect(page.locator(".copilot-panel")).toBeVisible();
  await expect(page.getByRole("button",{name:"主动开始分析"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(await page.evaluate(()=>window.innerWidth));
});
