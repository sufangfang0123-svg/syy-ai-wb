import { expect, test, APIRequestContext } from "@playwright/test";

const profile=process.env.TEST_BUILD_PROFILE??"public_demo";
const api="http://127.0.0.1:8000/api/v1";
const dimensions=["NEED","COMMERCIAL","PRODUCT","SUPPLY","COMPLIANCE"];

async function seed(request:APIRequestContext,projectId:string){
  const assumptions=[];
  for(const [index,dimension] of dimensions.entries()){
    const evidence=await (await request.post(`${api}/projects/${projectId}/evidence/paste`,{data:{title:`${dimension}证据`,publisher:"E2E夹具",raw_text:`${dimension}独立事实${index}`,applicable_scope:"E2E",limitations:"脱敏夹具"}})).json();
    await request.post(`${api}/evidence/${evidence.id}/confirm`);
    const assumption=await (await request.post(`${api}/projects/${projectId}/assumptions`,{data:{statement:`${dimension}关键假设成立`,criticality:5,dimension,potential_loss:10000,avoidable_loss:5000}})).json();
    await request.post(`${api}/assumptions/${assumption.id}/links`,{data:{evidence_id:evidence.id,direction:"support",strength:4}});
    assumptions.push(assumption);
  }
  return assumptions;
}

async function round(request:APIRequestContext,projectId:string,assumptions:{id:string}[],actuals:number[]){
  for(const [index,assumption] of assumptions.entries()){
    const testBody=await (await request.post(`${api}/projects/${projectId}/tests`,{data:{assumption_id:assumption.id,name:`Round指标${index}`,method:"受控测试",estimated_cost:100,estimated_days:1,success_criterion:"达到60%",metric_name:"通过率",metric_unit:"%",direction:"at_least",baseline_value:40,threshold_value:60,stop_threshold:30}})).json();
    await request.post(`${api}/tests/${testBody.id}/result`,{data:{actual_value:actuals[index],sample_size:20,executed_at:"2026-08-14T08:00:00Z",source:"E2E报告",summary:"真实核心测试结果夹具"}});
  }
  const gate=await (await request.post(`${api}/projects/${projectId}/gate`)).json();
  await request.post(`${api}/projects/${projectId}/decision`,{data:{gate_evaluation_id:gate.id,decision:gate.result,rationale:"E2E人工复核",decided_by:"E2E负责人（自我声明）"}});
  return gate;
}

test("three-round local workflow persists and displays STOP history",async({page,request},testInfo)=>{
  test.skip(profile!=="local_integrated","local integrated build only");
  test.skip(testInfo.project.name.includes("mobile"),"workflow semantics remain a desktop regression; mobile layout is covered independently");
  await page.goto("/real/");
  await page.getByLabel("项目名称").fill("Playwright v0.3三轮验收");
  await page.getByLabel("决策问题").fill("是否投入下一笔试点费用？");
  await page.getByLabel("下一笔计划投入（CNY）").fill("50000");
  await page.getByRole("button",{name:"创建真实项目"}).click();
  const projectId=await page.getByText(/^prj_/).innerText();
  const assumptions=await seed(request,projectId);
  expect((await round(request,projectId,assumptions,[45,45,45,45,45])).result).toBe("SUPPLEMENT");
  await request.post(`${api}/projects/${projectId}/rounds/next`,{data:{selected_assumption_ids:assumptions.map(x=>x.id)}});
  expect((await round(request,projectId,assumptions,[70,70,70,70,70])).result).toBe("CONTINUE");
  await request.post(`${api}/projects/${projectId}/rounds/next`,{data:{selected_assumption_ids:assumptions.map(x=>x.id)}});
  expect((await round(request,projectId,assumptions,[70,70,20,70,70])).result).toBe("STOP");
  await page.reload();
  await expect(page.getByText("停止",{exact:true}).first()).toBeVisible();
  await expect(page.getByText(/Round 3/).first()).toBeVisible();
  expect(await page.evaluate(()=>Object.keys(localStorage))).not.toContain("REAL-DRAFT-001");
});

test("file import uses draft confirmation and survives reload",async({page})=>{
  test.skip(profile!=="local_integrated","local integrated build only");
  await page.goto("/real/");
  await page.getByLabel("Evidence文件").setInputFiles({name:"e2e-report.csv",mimeType:"text/csv",buffer:Buffer.from("metric,value\nchoice,68")});
  await page.getByRole("button",{name:"导入文件"}).click();
  await expect(page.getByText(/file · 未填写来源 · draft/)).toBeVisible();
  await page.getByRole("button",{name:"人工确认"}).last().click();
  await page.reload();
  await expect(page.getByText(/file · 未填写来源 · confirmed/)).toBeVisible();
});

test("URL import rejects local address without fake evidence",async({page})=>{
  test.skip(profile!=="local_integrated","local integrated build only");
  await page.goto("/real/");
  await page.getByPlaceholder("https://公开可访问页面").fill("http://127.0.0.1/private");
  await page.getByRole("button",{name:"导入单URL"}).click();
  await expect(page.getByTestId("real-workspace").getByRole("alert")).toContainText(/拒绝|内网|回环|保留地址|URL|请求失败/);
});

test("STEP 04B and step navigation fit desktop and mobile viewports",async({page,request},testInfo)=>{
  test.skip(profile!=="local_integrated","local integrated build only");
  const project=await (await request.post(`${api}/projects`,{data:{name:`04B布局-${testInfo.project.name}`,decision_question:"关系表单是否完整可用？",planned_investment:12000,currency:"CNY"}})).json();
  for(const title of ["来源Evidence","目标Evidence"]){
    await request.post(`${api}/projects/${project.id}/evidence/paste`,{data:{title,publisher:"E2E夹具",raw_text:`${title}结构化内容`,applicable_scope:"布局验收",limitations:"脱敏夹具"}});
  }
  await page.goto("/real/");
  await page.getByLabel("选择真实项目").selectOption(project.id);
  const stepLink=page.getByRole("link",{name:"STEP 04B 关系"});
  await stepLink.click();
  await expect(stepLink).toHaveAttribute("aria-current","step");
  await expect(page).toHaveURL(/#real-step-04b$/);
  const form=page.locator(".evidence-relation-form");
  await expect(form).toBeVisible();
  for(const name of ["来源Evidence","目标Evidence","Evidence关系","关系说明"]){await expect(form.getByLabel(name)).toBeVisible();}
  await expect(form.getByLabel("Evidence关系").locator("option")).toHaveText(["支持","冲突","重复"]);
  await expect(form.getByRole("button",{name:"记录关系"})).toBeVisible();
  expect(await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewportWidth:window.innerWidth}))).toEqual(expect.objectContaining({documentWidth:page.viewportSize()!.width,viewportWidth:page.viewportSize()!.width}));
});

test("new real Evidence remains unlinked until an explicit human relation",async({page,request},testInfo)=>{
  test.skip(profile!=="local_integrated","local integrated build only");
  const project=await (await request.post(`${api}/projects`,{data:{name:`无自动关联-${testInfo.project.name}`,decision_question:"Evidence是否保持未关联？",planned_investment:8000,currency:"CNY"}})).json();
  const evidence=await (await request.post(`${api}/projects/${project.id}/evidence/paste`,{data:{title:"待人工关联Evidence",publisher:"E2E夹具",raw_text:"新增Evidence不应自动建立因果关系",applicable_scope:"关系验收",limitations:"脱敏夹具"}})).json();
  await request.post(`${api}/evidence/${evidence.id}/confirm`);
  await request.post(`${api}/projects/${project.id}/assumptions`,{data:{statement:"待人工判断的关键假设",criticality:5,dimension:"NEED",potential_loss:1000,avoidable_loss:500}});
  const links=await (await request.get(`${api}/projects/${project.id}/links`)).json();
  expect(links).toEqual([]);
  await page.goto("/real/");
  await page.getByLabel("选择真实项目").selectOption(project.id);
  const draft=await (await request.post(`${api}/projects/${project.id}/evidence/paste`,{data:{title:"页面提示Evidence",publisher:"E2E夹具",raw_text:"用于页面提示断言",applicable_scope:"关系验收",limitations:"脱敏夹具"}})).json();
  await page.reload();
  await page.locator(`#${draft.id}`).getByRole("button",{name:"人工确认"}).click();
  await expect(page.getByRole("status")).toContainText("仍需建立假设关系后才会影响Gate");
  expect(await (await request.get(`${api}/projects/${project.id}/links`)).json()).toEqual([]);
});
