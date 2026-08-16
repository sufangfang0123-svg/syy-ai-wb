"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Clock3, Printer, ShieldAlert, UserCheck } from "lucide-react";
import { useDecision } from "@/components/decision/decision-provider";
import { DataBoundary, WorkspaceHeading, recommendationLabel } from "@/components/decision/workspace-ui";
import { DecisionRecommendation } from "@/domain/decision-types";
import { useProductWorkbench } from "@/components/workbench/product-workbench-provider";

const choices: DecisionRecommendation[] = ["continue", "supplement", "stop"];

export default function DecisionPage() {
  const { state, isHydrated, confirmDecision } = useDecision();
  const { state: workbench, selectedConcept } = useProductWorkbench();
  const { decision, project } = state;
  const test = state.tests.find((item) => item.id === decision.testId);
  const risks = state.assumptions.filter((item) => decision.dangerousAssumptionIds.includes(item.id));
  const [choice, setChoice] = useState<"pending" | DecisionRecommendation>(decision.humanDecision);
  const [note, setNote] = useState(decision.humanNote === "等待责任人确认。" ? "" : decision.humanNote);
  const [message, setMessage] = useState(decision.humanDecision === "pending" ? "" : "已读取负责人最近一次确认");
  const [printMessage, setPrintMessage] = useState("");
  useEffect(() => {
    if (!isHydrated) return;
    setChoice(decision.humanDecision);
    setNote(decision.humanNote === "等待责任人确认。" ? "" : decision.humanNote);
    setMessage((current) => current || (decision.humanDecision === "pending" ? "" : "已读取负责人最近一次确认"));
  }, [isHydrated, decision.humanDecision, decision.humanNote, decision.humanDecidedAt]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (choice === "pending" || !note.trim()) return;
    confirmDecision(choice, note.trim());
    setMessage(`已记录“${recommendationLabel[choice]}”，系统建议未被覆盖`);
  };
  const differs = choice !== "pending" && choice !== decision.recommendation;
  const printDecision = () => {
    setPrintMessage("已打开系统打印窗口，可选择“另存为PDF”。");
    window.print();
  };

  return <div className="page-frame">
    <WorkspaceHeading eyebrow="Pre-investment brief" title="新品投前决策单" description="一页内说明这笔钱该不该花、依据是什么、限制在哪里，以及负责人最终作出了什么决定。" actions={<div className="decision-print-actions"><button type="button" className="secondary-action" onClick={printDecision} aria-describedby="decision-print-status"><Printer className="h-4 w-4" />打印 / 保存为PDF</button><span id="decision-print-status" role="status" aria-live="polite">{printMessage}</span></div>} />
    <DataBoundary />
    <section className="decision-workflow-summary" aria-label="完整工作流汇总"><div><span>已确认Evidence</span><strong>{decision.evidenceIds.length} 条</strong><small>{decision.evidenceIds.join(" · ")}</small></div><div><span>当前产品概念</span><strong>{selectedConcept.name}</strong><small>{selectedConcept.id} · V{selectedConcept.version} · {selectedConcept.locked ? "已锁定" : "待锁定"}</small></div><div><span>数字实验</span><strong>{workbench.scenarioReviews.length} 个已复核</strong><small>{workbench.scenarioReviews.filter((item) => item.status === "validation").length} 个进入Validation候选</small></div><div><span>已审核内容</span><strong>{workbench.contentAssets.filter((item) => item.reviewStatus === "approved").length} 条</strong><small>固定演示内容版本</small></div><div><span>反馈记录</span><strong>{workbench.feedbackRecords.length} 条</strong><small>模拟与人工录入分层</small></div><div><span>下一轮负责人</span><strong>{project.owner}</strong><small>{workbench.nextRoundItems[0] ?? "待人工填写"}</small></div></section>
    <article className="decision-sheet" data-print-content>
      <header>
        <div><span className="simulation-chip">模拟决策单 · {decision.id}</span><h2>{project.name}</h2><p>{project.stage} · 演示建议日期 {decision.decidedAt}</p></div>
        <div className="min-w-[160px] space-y-2"><div className={`decision-verdict ${decision.recommendation}`} data-guide="decision-verdict"><span>系统建议（只读）</span><strong>{recommendationLabel[decision.recommendation]}</strong><small>置信程度：{decision.confidence === "high" ? "较高" : decision.confidence === "medium" ? "中等" : "较低"}</small></div><a href="#human-decision" className="secondary-action w-full" data-guide="decision-confirm"><UserCheck className="h-4 w-4" />前往人工确认</a></div>
      </header>
      <div className="decision-sheet-grid">
        <section>
          <DecisionField label="下一笔计划投入" value={`${project.nextAction || "待填写"}${project.nextInvestmentAmount === null ? "" : ` · ¥${project.nextInvestmentAmount.toLocaleString("zh-CN")}`}`} />
          <DecisionField label="判断依据" value={decision.rationale} />
          <DecisionField label="置信程度限制" value={decision.confidenceLimit} warning />
          <div className="mt-6"><p className="field-label">当前最危险假设</p><div className="mt-3 space-y-3">{risks.length ? risks.map((item) => <div key={item.id} className="decision-risk"><ShieldAlert className="h-4 w-4" /><div><strong>{item.statement}</strong><p>{item.errorCost}</p></div></div>) : <p className="empty-inline">数据不足，尚未识别关键假设。</p>}</div></div>
        </section>
        <aside>
          <p className="field-label">已记录的验证方案</p>
          {test ? <div className="next-test-card"><span>固定演示方案 · {test.status === "proposed" ? "待执行" : test.status === "running" ? "进行中" : "已完成"}</span><h3>{test.primaryVariable}</h3><p>{test.hypothesis}</p><div><strong>¥{test.budget.toLocaleString("zh-CN")}</strong><small>{test.duration} · {test.sample}</small></div></div> : <p className="empty-inline">尚无已记录的验证方案。</p>}
          <p className="field-label mt-6">追溯信息</p>
          <div className="trace-list"><p><span>证据ID</span><strong>{decision.evidenceIds.join("、") || "无"}</strong></p><p><span>模拟规则快照</span><strong>{decision.ruleVersion}</strong></p><p><span>演示夹具版本</span><strong>{decision.modelVersion}</strong></p><p><span>责任人</span><strong>{decision.owner}</strong></p></div>
        </aside>
      </div>
      <form id="human-decision" className="human-decision-panel" onSubmit={submit}>
        <header><div><p className="section-kicker">Human decision</p><h3 className="mt-2 text-lg font-semibold">由责任人作出最终决定</h3><p className="mt-2 text-xs leading-5 text-[#6F7D77]">确认只记录人工决定与理由，不会改写上方系统建议，也不会自动触发预算、订单或审批。</p></div><span className="simulation-chip"><UserCheck className="h-3.5 w-3.5" />{decision.humanDecision === "pending" ? "待确认" : "已确认"}</span></header>
        <div className="human-decision-options" role="group" aria-label="人工决定">{choices.map((item) => <button type="button" key={item} className={choice === item ? "active" : ""} aria-pressed={choice === item} onClick={() => { setChoice(item); setMessage(""); }}>{recommendationLabel[item]}</button>)}</div>
        <label className="form-field mt-4"><span>决定理由（必填）</span><textarea value={note} onChange={(event) => { setNote(event.target.value); setMessage(""); }} placeholder="例如：先取得供应商报价与24名目标用户选择结果，再决定是否支付包装开模费。" /></label>
        {differs ? <p className="decision-delta"><AlertTriangle className="h-4 w-4 shrink-0" />人工决定与系统建议不同。系统会同时保留两者，便于后续审计与复盘。</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-3"><button className="primary-action" disabled={choice === "pending" || !note.trim()}>确认并记录人工决定</button><span role="status" aria-live="polite" className="text-xs text-[#536B5E]">{message}</span></div>
      </form>
      <footer><div><Clock3 className="h-4 w-4" /><span>模拟人工决定：{decision.humanDecision === "pending" ? "待演示确认" : `${recommendationLabel[decision.humanDecision]} · ${decision.humanDecidedAt ? new Date(decision.humanDecidedAt).toLocaleString("zh-CN") : "时间未记录"}`}</span></div><p>本页只演示人工确认交互，不改变真实预算、订单或审批状态。</p></footer>
    </article>
    <div className="mt-6 flex justify-end"><Link href="/results" className="primary-action">查看模拟结果回流<ArrowRight className="h-4 w-4" /></Link></div>
  </div>;
}

function DecisionField({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <div className={`decision-field ${warning ? "warning" : ""}`}>{warning ? <ShieldAlert className="h-4 w-4" /> : <Check className="h-4 w-4" />}<div><span>{label}</span><p>{value}</p></div></div>;
}
