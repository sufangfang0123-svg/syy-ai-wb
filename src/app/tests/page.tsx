"use client";

import Link from "next/link";
import { ArrowRight, Beaker, CheckCircle2, MinusCircle, StopCircle } from "lucide-react";
import { useDecision } from "@/components/decision/decision-provider";
import { DataBoundary, EmptyState, WorkspaceHeading } from "@/components/decision/workspace-ui";
import { formatStatusCounts, getValidationLedger } from "@/lib/validation-ledger";

export default function TestsPage() {
  const { state } = useDecision();
  const test = state.tests[0];
  const ledger = getValidationLedger(state);
  return <div className="page-frame">
    <WorkspaceHeading eyebrow="固定模拟验证" title="验证方案记录" description="展示固定夹具如何记录一个主变量、预算与通过、补证、停止阈值；不表示系统已自动生成实验或找到全局最低成本方案。" />
    <DataBoundary />
    {!test ? <EmptyState title="尚未记录验证方案" body="没有已配置夹具时，本页不生成或推荐实验。" /> : <div className="test-layout"><section className="test-protocol"><div className="flex flex-wrap items-start justify-between gap-3" data-guide="test-hypothesis"><div><span className="simulation-chip">固定演示方案 · {test.isDigital ? "数字实验" : "真人概念验证"} · {test.status === "proposed" ? "待执行" : test.status === "running" ? "进行中" : "已完成"}</span><h2 className="mt-4 text-2xl font-semibold">{test.hypothesis}</h2></div><Beaker className="h-8 w-8 text-[#5B8C5A]" /></div><div className="mt-7 grid gap-4 md:grid-cols-2"><Protocol label="唯一主变量" value={test.primaryVariable} /><Protocol label="基准组" value={test.baseline} /><Protocol label="预算" value={`¥${test.budget.toLocaleString("zh-CN")}`} /><Protocol label="周期与样本" value={`${test.duration} · ${test.sample}`} /></div><div className="mt-6"><p className="field-label">控制条件</p><div className="mt-3 flex flex-wrap gap-2">{test.controls.map((item) => <span key={item} className="control-chip">{item}</span>)}</div></div><div className="threshold-grid mt-7" data-guide="test-thresholds"><Threshold icon={CheckCircle2} tone="pass" title="通过" body={test.passThreshold} /><Threshold icon={MinusCircle} tone="supplement" title="补证" body={test.supplementThreshold} /><Threshold icon={StopCircle} tone="stop" title="停止" body={test.stopThreshold} /></div></section><aside className="space-y-5"><section className="panel-surface"><p className="section-kicker">Simulation fixture</p><h2 className="mt-2 text-xl font-semibold">验证方案说明</h2><p className="mt-4 text-sm leading-6 text-[#65726B]">本固定夹具用约{Math.round(test.budget / (state.project.nextInvestmentAmount || test.budget) * 100)}%的下一笔投入演示如何验证价格与组织方式假设；实际方案、金额和执行顺序均由负责人确认。</p></section><section className="panel-surface"><p className="section-kicker">Experiment ledger</p><h2 className="mt-2 text-xl font-semibold">按状态与类型分开计数</h2><div className="mt-4 space-y-3"><Count label="数字实验" value={formatStatusCounts(ledger.digital)} note="情景与规则测试" /><Count label="真人校准" value={formatStatusCounts(ledger.human)} note="待执行方案不计为已完成真人研究" /><Count label="样品验证" value={`已完成 ${ledger.sampleCompleted}`} note="仅来自真实结果回填" /><Count label="销售结果" value={`已完成 ${ledger.salesCompleted}`} note="仅来自真实结果回填" /></div><p className="data-caution">不得通过刷新随机结果、改写文案或重复运行来凑满“100次”。</p></section><Link href="/decision" className="primary-action w-full">查看模拟投前决策单<ArrowRight className="h-4 w-4" /></Link></aside></div>}
  </div>;
}

function Protocol({ label, value }: { label: string; value: string }) { return <div className="protocol-field"><span>{label}</span><strong>{value}</strong></div>; }
function Threshold({ icon: Icon, tone, title, body }: { icon: typeof CheckCircle2; tone: string; title: string; body: string }) { return <article className={`threshold-card ${tone}`}><Icon className="h-5 w-5" /><strong>{title}</strong><p>{body}</p></article>; }
function Count({ label, value, note }: { label: string; value: string; note: string }) { return <div className="count-row"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
