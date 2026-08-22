"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { BarChart3, Boxes, CheckSquare2, ClipboardList, FileText, FlaskConical, LayoutDashboard, Megaphone, ShieldCheck } from "lucide-react";
import { useDecision } from "@/components/decision/decision-provider";
import { useEvolution } from "@/components/demo/evolution-provider";
import { useProductWorkbench } from "@/components/workbench/product-workbench-provider";
import { LocalProductWorkbenchShell } from "@/components/workbench/local-product-workbench-shell";

const stages = [
  { href: "/workspace", label: "项目总览", step: "01", icon: LayoutDashboard, paths: ["/workspace"] },
  { href: "/insights", label: "洞察与机会", step: "02", icon: BarChart3, paths: ["/insights", "/opportunities", "/radar"] },
  { href: "/evolution", label: "产品共创", step: "03", icon: Boxes, paths: ["/evolution"] },
  { href: "/launch", label: "情景与验证", step: "04", icon: FlaskConical, paths: ["/launch"] },
  { href: "/evidence", label: "预验证 Gate", step: "05", icon: ShieldCheck, paths: ["/evidence", "/assumptions", "/tests"] },
  { href: "/content", label: "内容中枢", step: "06", icon: Megaphone, paths: ["/content"] },
  { href: "/results", label: "转化反馈", step: "07", icon: FileText, paths: ["/results"] },
  { href: "/decision", label: "决策与下一轮", step: "08", icon: CheckSquare2, paths: ["/decision"] },
];

export function ProductWorkbenchShell({ children }: { children: ReactNode }) {
  const workbench = useProductWorkbench();
  if (workbench.mode === "local_api") return <LocalProductWorkbenchShell>{children}</LocalProductWorkbenchShell>;
  return <PublicProductWorkbenchShell>{children}</PublicProductWorkbenchShell>;
}

function PublicProductWorkbenchShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state: decisionState } = useDecision();
  const { state: evolutionState } = useEvolution();
  const { state, selectedConcept } = useProductWorkbench();
  const currentStage = stages.find((item) => item.paths.some((path) => pathname.startsWith(path))) ?? stages[0];
  const gateLabel = decisionState.decision.recommendation === "continue" ? "继续投入" : decisionState.decision.recommendation === "stop" ? "停止" : "先补证";
  const staleCount = state.scenarioReviews.filter((item) => item.stale).length + state.contentAssets.filter((item) => item.stale).length;
  const reviewedEvidence = evolutionState.evidence.filter((item) => item.reviewed).length;

  return <div className="product-workbench" data-product-workbench data-workbench-adapter="public_fixture">
    <section className="project-command-bar" aria-label="当前项目状态">
      <div className="project-command-primary"><span className="simulation-chip">DEMO · 模拟项目</span><div><strong>{decisionState.project.name}</strong><small>{selectedConcept.name} · 比赛概念方案，非全棉时代正式产品</small></div></div>
      <dl className="project-command-facts">
        <div><dt>当前阶段</dt><dd>{currentStage.step} · {currentStage.label}</dd></div>
        <div><dt>负责人</dt><dd>{decisionState.project.owner}</dd></div>
        <div><dt>revision</dt><dd>Demo R{state.revision}</dd></div>
        <div><dt>Evidence状态</dt><dd>{reviewedEvidence} 已复核 · {evolutionState.evidence.length - reviewedEvidence} 待复核</dd></div>
        <div><dt>Gate</dt><dd>{gateLabel} · 固定演示</dd></div>
        <div><dt>最近保存</dt><dd>{state.lastSavedAt}</dd></div>
      </dl>
    </section>
    <div className="product-workbench-grid">
      <aside className="stage-rail" aria-label="新品投前工作流阶段">
        <div className="stage-rail-title"><ClipboardList className="h-4 w-4" /><span>新品投前工作流</span></div>
        <nav>{stages.map(({ href, label, step, icon: Icon, paths }) => { const active = paths.some((path) => pathname.startsWith(path)); return <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "step" : undefined}><span>{step}</span><Icon className="h-4 w-4" /><strong>{label}</strong></Link>; })}</nav>
        <div className="stage-rail-boundary"><strong>能力边界</strong><p>固定模拟数据与浏览器演示状态。真实 Evidence→Decision 治理闭环仍在本地 `/real/`。</p></div>
      </aside>
      <main className="product-workbench-main">{children}</main>
      <aside className="context-rail" aria-label="当前上下文">
        <section><span>当前产品概念</span><strong>{selectedConcept.name}</strong><small>{selectedConcept.id} · V{selectedConcept.version} · {selectedConcept.locked ? "已锁定" : "待锁定"}</small></section>
        <section><span>关联 Evidence</span><strong>{selectedConcept.evidenceIds.length} 条</strong><small>{selectedConcept.evidenceIds.join(" · ")}</small></section>
        <section><span>风险与限制</span><strong>{staleCount ? `${staleCount} 项已 stale` : "无新增 stale"}</strong><small>{selectedConcept.supplyRisk}</small></section>
        <section><span>下一步人工操作</span><strong>{state.nextRoundItems[0] ?? decisionState.project.nextAction}</strong><small>不会自动发布、投放或决定上市</small></section>
      </aside>
    </div>
  </div>;
}
