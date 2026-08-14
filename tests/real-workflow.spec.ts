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

test("three-round local workflow persists and displays STOP history",async({page,request})=>{
  test.skip(profile!=="local_integrated","local integrated build only");
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
