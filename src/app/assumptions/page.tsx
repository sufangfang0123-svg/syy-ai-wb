"use client";

import Link from "next/link";
import { AlertOctagon, ArrowRight, CheckCircle2, HelpCircle } from "lucide-react";
import { useDecision } from "@/components/decision/decision-provider";
import { DataBoundary, EmptyState, WorkspaceHeading } from "@/components/decision/workspace-ui";
import { useProductWorkbench } from "@/components/workbench/product-workbench-provider";
import { LocalWorkbenchStage } from "@/components/workbench/local-workbench-stage";

const category = { demand: "需求", product: "产品", technology: "技术", cost: "成本", supply: "供应链", compliance: "合规", commercial: "商业" } as const;

export default function AssumptionsPage() {
  const {mode}=useProductWorkbench();
  return mode==="local_api"?<LocalWorkbenchStage stage="gate"/>:<PublicAssumptionsPage/>;
}

function PublicAssumptionsPage() {
  const { state } = useDecision();
  const byDeclaredErrorCost = [...state.assumptions].sort((a, b) => ({ high: 3, medium: 2, low: 1 }[b.severity] - { high: 3, medium: 2, low: 1 }[a.severity]));
  return <div className="page-frame">
    <WorkspaceHeading eyebrow="Simulation risk graph" title="模拟风险假设" description="按夹具中明确标注的错误代价分组；同级顺序不代表优先级，也不是模型判断。" />
    <DataBoundary />
    {byDeclaredErrorCost.length === 0 ? <EmptyState title="尚不能拆解风险假设" body="请先完成建项并导入证据；没有证据时系统只显示不足以判断。" /> : <div className="assumption-layout"><section className="space-y-4">{byDeclaredErrorCost.map((item, index) => <article key={item.id} className={`assumption-card ${item.severity === "high" ? "dangerous" : ""}`} data-guide={index === 0 ? "assumption-primary" : undefined}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="meta-chip">{category[item.category]}</span><span className={`risk-chip ${item.severity}`}>{item.severity === "high" ? "高错误代价" : item.severity === "medium" ? "中等错误代价" : "低错误代价"}</span><span className="meta-chip">{item.id}</span></div><h2 className="mt-3">{item.statement}</h2><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="risk-detail"><AlertOctagon className="h-4 w-4" /><div><span>如果判断错误</span><p>{item.errorCost}</p>{item.errorCostAmount ? <strong>潜在暴露：¥{item.errorCostAmount.toLocaleString("zh-CN")}</strong> : null}</div></div><div className="risk-detail"><HelpCircle className="h-4 w-4" /><div><span>关键证据缺口</span><p>{item.evidenceGap}</p><strong>已关联：{item.evidenceIds.length ? item.evidenceIds.join("、") : "无"}</strong></div></div></div></div></article>)}</section><aside className="panel-surface self-start" data-guide="assumption-explain"><p className="section-kicker">Human review boundary</p><h2 className="mt-2 text-xl font-semibold">先核对高错误代价假设</h2><p className="mt-4 text-sm leading-6 text-[#65726B]">页面只按固定夹具的错误代价标签分组。负责人仍需结合证据缺口、反证和下一笔投入自行确定验证顺序。</p><div className="mt-5 space-y-2">{["没有自动风险排名", "反证不会被隐藏", "数据不足时停止强行结论"].map((text) => <p key={text} className="flex items-center gap-2 text-xs text-[#53625B]"><CheckCircle2 className="h-4 w-4 text-[#5B8C5A]" />{text}</p>)}</div><Link href="/tests" className="primary-action mt-6 w-full">查看固定模拟验证方案<ArrowRight className="h-4 w-4" /></Link></aside></div>}
  </div>;
}
