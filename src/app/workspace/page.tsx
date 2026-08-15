"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDollarSign, FileSearch, ShieldAlert } from "lucide-react";
import { useDecision } from "@/components/decision/decision-provider";
import { ServiceStatus } from "@/components/system/service-status";
import { DataBoundary, ModeSwitch, WorkspaceHeading, recommendationLabel } from "@/components/decision/workspace-ui";

export default function WorkspacePage() {
  const { state, updateProject } = useDecision();
  const p = state.project;
  return <div className="page-frame">
    <WorkspaceHeading eyebrow="Next-Dollar Gate · Simulation" title="模拟决策流程" description="使用显著标注的演示数据体验投前流程；当前页面不会创建或保存真实项目。" actions={<ModeSwitch />} />
    <ServiceStatus />
    <DataBoundary />
    <div className="workspace-grid">
      <section className="panel-surface">
        <div className="panel-title-row" data-guide="project-brief"><div><p className="section-kicker">Four-question brief</p><h2>把下一笔投入说清楚</h2></div><span className="simulation-chip">{p.id}</span></div>
        <div className="form-grid mt-6">
          <label className="form-field"><span>想做什么新品</span><textarea value={p.productIdea} onChange={(e) => updateProject({ productIdea: e.target.value })} placeholder="例如：三天差旅用的按日棉品护理组合" /></label>
          <label className="form-field"><span>面向谁</span><input value={p.targetUser} onChange={(e) => updateProject({ targetUser: e.target.value })} placeholder="目标人群和关键场景" /></label>
          <label className="form-field"><span>当前阶段</span><input value={p.stage} onChange={(e) => updateProject({ stage: e.target.value })} /></label>
          <label className="form-field"><span>下一步准备做什么</span><input value={p.nextAction} onChange={(e) => updateProject({ nextAction: e.target.value })} placeholder="打样、开模、备货或投放" /></label>
          <label className="form-field"><span>计划投入金额</span><input type="number" value={p.nextInvestmentAmount ?? ""} onChange={(e) => updateProject({ nextInvestmentAmount: e.target.value ? Number(e.target.value) : null })} /></label>
          <label className="form-field"><span>负责人</span><input value={p.owner} onChange={(e) => updateProject({ owner: e.target.value })} /></label>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3"><Link href="/evidence" className="primary-action">保存演示草稿并进入证据库<ArrowRight className="h-4 w-4" /></Link><span className="demo-save-badge" role="status" aria-label="保存状态：演示草稿仅保存在当前浏览器"><CheckCircle2 className="h-4 w-4" /><span><strong>保存状态</strong> · 演示草稿仅保存在当前浏览器</span></span></div>
      </section>
      <aside className="space-y-5">
        <section className="decision-summary-card"><p className="section-kicker text-white/55">Current gate</p><div className="mt-3 flex items-center justify-between gap-3"><h2>{recommendationLabel[state.decision.recommendation]}</h2><ShieldAlert className="h-6 w-6" /></div><p className="mt-4 text-sm leading-6 text-white/70">{state.decision.confidenceLimit}</p><div className="mt-5 border-t border-white/10 pt-4"><span>下一笔投入</span><strong>{p.nextInvestmentAmount === null ? "待填写" : `¥${p.nextInvestmentAmount.toLocaleString("zh-CN")}`}</strong><small>{p.nextAction || "尚未填写具体动作"}</small></div></section>
        <section className="panel-surface"><p className="section-kicker">Current boundary</p><h2 className="mt-1 text-lg font-semibold">此页仅提供流程演示</h2><p className="mt-4 text-xs leading-5 text-[#6F7D77]">公开构建不创建真实项目；本地集成构建另行提供SQLite持久化与确定性Gate。账号、多人协作、权限和可信身份审计仍未实现。</p></section>
        <section className="panel-surface"><CircleDollarSign className="h-5 w-5 text-[#5B8C5A]" /><h2 className="mt-3 text-lg font-semibold">当前P0闭环</h2><p className="mt-2 text-xs leading-5 text-[#6F7D77]">建项 → 证据 → 风险假设 → 下一验证 → 投前决策单 → 结果回流</p><Link href="/opportunities" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#315C46]"><FileSearch className="h-4 w-4" />打开保留的研究实验室</Link></section>
      </aside>
    </div>
  </div>;
}
