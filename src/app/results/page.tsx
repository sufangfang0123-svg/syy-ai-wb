"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, PackageCheck, ShieldAlert, ShoppingBag, Users } from "lucide-react";
import { useDecision } from "@/components/decision/decision-provider";
import { DataBoundary, EmptyState, WorkspaceHeading, recommendationLabel } from "@/components/decision/workspace-ui";
import { ResultType } from "@/domain/decision-types";
import { getValidationLedger } from "@/lib/validation-ledger";

const resultMeta = { human: { label: "真人反馈", icon: Users }, sample: { label: "样品表现", icon: PackageCheck }, sales: { label: "销售结果", icon: ShoppingBag } } as const;

export default function ResultsPage() {
  const { state, addResult } = useDecision();
  const ledger = getValidationLedger(state);
  const primaryRisk = state.assumptions.find((item) => state.decision.dangerousAssumptionIds.includes(item.id));
  const nextTest = state.tests.find((item) => item.id === state.decision.testId);
  const [draft, setDraft] = useState({ type: "human" as ResultType, summary: "", outcome: "supports" as "supports" | "conflicts" | "unclear", source: "" });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    addResult(draft);
    setDraft({ ...draft, summary: "", source: "" });
  };
  return <div className="page-frame">
    <WorkspaceHeading eyebrow="Simulation feedback" title="模拟结果回流" description="演示如何分别记录真人反馈、样品表现和销售结果，并据此复核原判断；当前不会接收或计算真实企业数据。" />
    <DataBoundary />
    <section className="results-summary" aria-label="模拟决策摘要">
      <header><div><p className="section-kicker">Simulated decision result</p><h2>当前模拟结论：{recommendationLabel[state.decision.recommendation]}</h2><p>{state.decision.rationale}</p></div><span className="simulation-chip">固定演示结果 · 非实时计算</span></header>
      <div className="results-summary-grid">
        <ResultSummary icon={CheckCircle2} label="结论依据" value={`${state.decision.evidenceIds.length} 条演示证据 · ${state.decision.confidence === "high" ? "较高" : state.decision.confidence === "medium" ? "中等" : "较低"}置信度`} />
        <ResultSummary icon={ShieldAlert} label="主要风险" value={primaryRisk?.statement ?? "尚未识别可展示的风险假设"} warning />
        <ResultSummary icon={AlertTriangle} label="待补证项" value={primaryRisk?.evidenceGap ?? state.decision.confidenceLimit} warning />
        <ResultSummary icon={ArrowRight} label="已记录的下一步动作" value={nextTest ? `${nextTest.primaryVariable} · 演示预算 ¥${nextTest.budget.toLocaleString("zh-CN")}` : "证据不足，尚未记录下一步动作"} />
      </div>
      <footer><span>人工决定：{state.decision.humanDecision === "pending" ? "待演示确认" : recommendationLabel[state.decision.humanDecision]}</span><span><Clock3 className="h-3.5 w-3.5" />本页只展示模拟案例，不构成生产、投资或经营建议。</span></footer>
    </section>
    <div className="results-layout">
      <form onSubmit={submit} className="panel-surface" data-guide="results"><p className="section-kicker">Simulation input</p><h2 className="mt-2 text-xl font-semibold">录入一项演示结果</h2><div className="mt-5 segmented">{(["human", "sample", "sales"] as ResultType[]).map((type) => <button type="button" key={type} onClick={() => setDraft({ ...draft, type })} className={draft.type === type ? "active" : ""}>{resultMeta[type].label}</button>)}</div><label className="form-field mt-5"><span>结果来源</span><input required value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} placeholder="演示访谈编号、样品批次或报表编号" /></label><label className="form-field mt-4"><span>结果摘要</span><textarea required value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} placeholder="仅在模拟空间记录观察到的事实" /></label><label className="form-field mt-4"><span>与原判断关系</span><select value={draft.outcome} onChange={(event) => setDraft({ ...draft, outcome: event.target.value as typeof draft.outcome })}><option value="supports">支持原判断</option><option value="conflicts">与原判断冲突</option><option value="unclear">仍无法判断</option></select></label><button className="primary-action mt-5">保存演示结果</button></form>
      <section>
        <div className="result-separation"><ResultCount icon={Users} label="真人反馈" value={ledger.humanFeedbackCompleted} /><ResultCount icon={PackageCheck} label="样品表现" value={ledger.sampleCompleted} /><ResultCount icon={ShoppingBag} label="销售结果" value={ledger.salesCompleted} /></div>
        {state.results.length === 0 ? <EmptyState title="尚无演示结果回流" body="当前模拟判断仍是待验证假设，不能被包装成已验证成果。" /> : <div className="mt-4 space-y-3">{state.results.map((item) => { const Icon = resultMeta[item.type].icon; return <article key={item.id} className={`result-record ${item.outcome}`}><Icon className="h-5 w-5" /><div><div className="flex flex-wrap gap-2"><strong>{resultMeta[item.type].label}</strong><span className="meta-chip">{item.id}</span></div><p>{item.summary}</p><small>{item.source} · {item.recordedAt}</small><div className="mt-3 flex items-start gap-2 text-xs">{item.outcome === "conflicts" ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{item.ruleChange}</div></div></article>; })}</div>}
      </section>
    </div>
  </div>;
}

function ResultSummary({ icon: Icon, label, value, warning = false }: { icon: typeof CheckCircle2; label: string; value: string; warning?: boolean }) {
  return <div className={warning ? "warning" : ""}><Icon className="h-4 w-4" /><span>{label}</span><strong>{value}</strong></div>;
}

function ResultCount({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return <div><Icon className="h-5 w-5" /><span>{label}</span><strong>{value}</strong><small>已完成并独立记录</small></div>;
}
