"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, PackageCheck, ShoppingBag, Users } from "lucide-react";
import { useDecision } from "@/components/decision/decision-provider";
import { DataBoundary, EmptyState, WorkspaceHeading, recommendationLabel } from "@/components/decision/workspace-ui";
import { ResultType } from "@/domain/decision-types";
import { getValidationLedger } from "@/lib/validation-ledger";

const resultMeta = { human: { label: "真人反馈", icon: Users }, sample: { label: "样品表现", icon: PackageCheck }, sales: { label: "销售结果", icon: ShoppingBag } } as const;

export default function ResultsPage() {
  const { state, addResult } = useDecision();
  const ledger = getValidationLedger(state);
  const [draft, setDraft] = useState({ type: "human" as ResultType, summary: "", outcome: "supports" as "supports" | "conflicts" | "unclear", source: "" });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    addResult(draft);
    setDraft({ ...draft, summary: "", source: "" });
  };
  return <div className="page-frame">
    <WorkspaceHeading eyebrow="Reality feedback" title="结果回流与校准" description="数字判断、真人反馈、样品表现和销售结果分别记录。只有真实结果才能用于评估偏差并提出规则修正。" />
    <DataBoundary />
    <section className="panel-surface mb-5" aria-label="当前决策状态"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="section-kicker">Decision state</p><h2 className="mt-2 text-lg font-semibold">系统建议：{recommendationLabel[state.decision.recommendation]}</h2><p className="mt-2 text-xs text-[#6F7D77]">人工决定：{state.decision.humanDecision === "pending" ? "待责任人确认，当前不能称为已批准" : recommendationLabel[state.decision.humanDecision]}</p></div><span className={`decision-status ${state.decision.humanDecision === "pending" ? "supplement" : state.decision.humanDecision}`}>{state.decision.humanDecision === "pending" ? <><Clock3 className="mr-1 inline h-3.5 w-3.5" />待人工确认</> : "已人工确认"}</span></div></section>
    <div className="results-layout">
      <form onSubmit={submit} className="panel-surface" data-guide="results"><p className="section-kicker">Record reality</p><h2 className="mt-2 text-xl font-semibold">回填一项真实结果</h2><div className="mt-5 segmented">{(["human", "sample", "sales"] as ResultType[]).map((type) => <button type="button" key={type} onClick={() => setDraft({ ...draft, type })} className={draft.type === type ? "active" : ""}>{resultMeta[type].label}</button>)}</div><label className="form-field mt-5"><span>结果来源</span><input required value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} placeholder="访谈编号、样品批次或销售报表" /></label><label className="form-field mt-4"><span>结果摘要</span><textarea required value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} placeholder="只记录观察到的事实，不补造原因" /></label><label className="form-field mt-4"><span>与原判断关系</span><select value={draft.outcome} onChange={(event) => setDraft({ ...draft, outcome: event.target.value as typeof draft.outcome })}><option value="supports">支持原判断</option><option value="conflicts">与原判断冲突</option><option value="unclear">仍无法判断</option></select></label><button className="primary-action mt-5">保存结果并进入校准账本</button></form>
      <section>
        <div className="result-separation"><ResultCount icon={Users} label="真人反馈" value={ledger.humanFeedbackCompleted} /><ResultCount icon={PackageCheck} label="样品表现" value={ledger.sampleCompleted} /><ResultCount icon={ShoppingBag} label="销售结果" value={ledger.salesCompleted} /></div>
        {state.results.length === 0 ? <EmptyState title="尚无真实结果回填" body="当前系统判断仍是待验证假设，不能被包装成已验证成果。" /> : <div className="mt-4 space-y-3">{state.results.map((item) => { const Icon = resultMeta[item.type].icon; return <article key={item.id} className={`result-record ${item.outcome}`}><Icon className="h-5 w-5" /><div><div className="flex flex-wrap gap-2"><strong>{resultMeta[item.type].label}</strong><span className="meta-chip">{item.id}</span></div><p>{item.summary}</p><small>{item.source} · {item.recordedAt}</small><div className="mt-3 flex items-start gap-2 text-xs">{item.outcome === "conflicts" ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{item.ruleChange}</div></div></article>; })}</div>}
      </section>
    </div>
  </div>;
}

function ResultCount({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return <div><Icon className="h-5 w-5" /><span>{label}</span><strong>{value}</strong><small>已完成并独立记录</small></div>;
}
