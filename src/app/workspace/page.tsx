"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Boxes, CheckCircle2, CircleDollarSign, Clock3, FileCheck2, Megaphone, MessageSquareText, ShieldAlert } from "lucide-react";
import { useDecision } from "@/components/decision/decision-provider";
import { useEvolution } from "@/components/demo/evolution-provider";
import { useProductWorkbench } from "@/components/workbench/product-workbench-provider";
import { LocalWorkbenchStage } from "@/components/workbench/local-workbench-stage";
import { DataBoundary, WorkspaceHeading, recommendationLabel } from "@/components/decision/workspace-ui";
import { ModeSwitch } from "@/components/decision/workspace-ui";
import { ServiceStatus } from "@/components/system/service-status";

const stages = [["洞察与机会", "/insights"], ["产品共创", "/evolution"], ["情景与验证", "/launch"], ["Evidence与Gate", "/evidence"], ["内容中枢", "/content"], ["反馈与下一轮", "/results"]] as const;

export default function WorkspacePage() {
  const {mode}=useProductWorkbench();
  return mode==="local_api"?<LocalWorkbenchStage stage="overview"/>:<PublicWorkspacePage/>;
}

function PublicWorkspacePage() {
  const { state: decision, updateProject } = useDecision();
  const { state: evolution } = useEvolution();
  const { state, selectedConcept } = useProductWorkbench();
  const p = decision.project;
  const pendingContent = state.contentAssets.filter((item) => item.reviewStatus === "pending" || item.reviewStatus === "changes").length;
  const staleCount = state.scenarioReviews.filter((item) => item.stale).length + state.contentAssets.filter((item) => item.stale).length;
  return <div className="page-frame">
    <WorkspaceHeading eyebrow="Pre-investment workbench · DEMO" title="新品投前项目总览" description="进入工作台后先看清当前产品、事实状态、阻断与下一项人工任务；公开版所有数据均为固定模拟夹具。" actions={<ModeSwitch />} />
    <ServiceStatus />
    <DataBoundary />
    <label className="project-quick-edit"><span>想做什么新品</span><input value={p.productIdea} onChange={(event) => updateProject({ productIdea: event.target.value })} /></label>
    <section className="overview-hero" data-guide="project-brief"><div><span className="simulation-chip">交互式系统原型 · 非企业经营成果</span><h2>{p.name}</h2><p>{selectedConcept.name}围绕“{evolution.opportunities.find((item) => item.id === state.selectedOpportunityId)?.name}”机会展开；比赛概念方案，非全棉时代正式产品。</p></div><div className="overview-status"><span>当前 Gate</span><strong>{recommendationLabel[decision.decision.recommendation]}</strong><small>{decision.decision.confidenceLimit}</small></div></section>
    <section className="overview-kpis" aria-label="项目关键状态"><Kpi icon={Boxes} label="当前概念" value={`V${selectedConcept.version}`} note={selectedConcept.locked ? "人工已锁定" : "待重新锁定"} /><Kpi icon={FileCheck2} label="关联Evidence" value={String(selectedConcept.evidenceIds.length)} note="固定模拟引用" /><Kpi icon={Megaphone} label="内容资产" value={String(state.contentAssets.length)} note={`${pendingContent} 条待审核/修改`} /><Kpi icon={MessageSquareText} label="反馈记录" value={String(state.feedbackRecords.length)} note="模拟或人工录入" /></section>
    <div className="overview-layout"><section className="panel-surface"><div className="panel-title-row"><div><p className="section-kicker">Project brief</p><h2>项目与责任信息</h2></div><span className="demo-save-badge"><CheckCircle2 className="h-4 w-4" />浏览器演示状态</span></div><div className="form-grid mt-5"><label className="form-field"><span>产品目标</span><textarea value={p.productIdea} onChange={(event) => updateProject({ productIdea: event.target.value })} /></label><label className="form-field"><span>目标人群</span><textarea value={p.targetUser} onChange={(event) => updateProject({ targetUser: event.target.value })} /></label><label className="form-field"><span>当前阶段</span><input value={p.stage} onChange={(event) => updateProject({ stage: event.target.value })} /></label><label className="form-field"><span>负责人（人工自述）</span><input value={p.owner} onChange={(event) => updateProject({ owner: event.target.value })} /></label></div><div className="stage-progress-list mt-6">{stages.map(([label, href], index) => <Link key={label} href={href}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{label}</strong><small>打开该阶段查看实际状态</small></div><em>查看</em><ArrowRight className="h-4 w-4" /></Link>)}</div></section><aside className="space-y-5"><section className="panel-surface"><p className="section-kicker">Open items</p><h2 className="section-title">未完成事项</h2><ul className="work-item-list">{state.nextRoundItems.map((item) => <li key={item}><CircleDollarSign className="h-4 w-4" /><span>{item}</span></li>)}{pendingContent ? <li><Megaphone className="h-4 w-4" /><span>复核 {pendingContent} 条内容版本</span></li> : null}</ul><Link href="/launch" className="primary-action mt-5 w-full justify-center">进入情景筛选<ArrowRight className="h-4 w-4" /></Link></section><section className="panel-surface"><p className="section-kicker">Risks</p><h2 className="section-title">主要风险</h2><div className="risk-stack"><p><ShieldAlert className="h-4 w-4" />{selectedConcept.supplyRisk}</p><p><AlertTriangle className="h-4 w-4" />{selectedConcept.complianceRisk}</p>{staleCount ? <p><Clock3 className="h-4 w-4" />{staleCount} 项下游记录因概念变更而 stale</p> : null}</div></section><section className="panel-surface"><p className="section-kicker">Recent activity</p><h2 className="section-title">最近活动</h2><div className="activity-list">{state.auditEvents.slice(0, 4).map((event) => <div key={event.id}><span>{event.createdAt}</span><strong>{event.action}</strong><p>{event.summary}</p></div>)}</div></section></aside></div>
  </div>;
}

function Kpi({ icon: Icon, label, value, note }: { icon: typeof Boxes; label: string; value: string; note: string }) { return <article><Icon className="h-5 w-5" /><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }
