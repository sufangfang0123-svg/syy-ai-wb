"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowRight, Bot, CheckCircle2, FlaskConical, Play, RefreshCw, ShieldAlert, Users } from "lucide-react";
import { useEvolution } from "@/components/demo/evolution-provider";
import { EvidenceBadge } from "@/components/evidence/evidence-badge";

const stages = [
  { range: "01—20", key: "concept", name: "概念生存", pressure: "需求真实性 / 替代方案" },
  { range: "21—50", key: "genome", name: "基因变异", pressure: "关键任务 / 体验结构" },
  { range: "51—75", key: "content", name: "内容对战", pressure: "理解度 / 信息可信度" },
  { range: "76—90", key: "business", name: "商业审判", pressure: "成本区间 / 供应链约束" },
  { range: "91—100", key: "reality", name: "现实校准", pressure: "真人意愿 / 真实行为" },
];

const concepts = [
  { label: "A", name: "按旅程选模块", share: 44, reason: "更容易理解使用方式" },
  { label: "B", name: "固定三日组合", share: 31, reason: "省事，但适配范围有限" },
  { label: "C", name: "常规装 + 分装袋", share: 25, reason: "价格更熟悉，准备步骤较多" },
];

const scenarios = [
  { name: "谨慎", range: "31%—38%", note: "价格敏感度较高，补充装采用较慢" },
  { name: "基准", range: "39%—48%", note: "便携价值成立，79元仍需分层验证" },
  { name: "积极", range: "49%—57%", note: "高频出行人群集中且内容解释充分" },
];

export default function LaunchPage() {
  const { state, currentVersion, advanceExperiment } = useEvolution();
  const [view, setView] = useState<"synthetic" | "human" | "delta">("delta");
  const [scenario, setScenario] = useState("基准");
  const latest = state.experiments.at(-1)!;
  const stageIndex = stages.findIndex((stage) => stage.key === latest.experimentType);
  const stage = stages[Math.max(0, stageIndex)];
  const completed = Math.max(1, Math.min(100, latest.round));
  const statusCopy = latest.result === "pending" ? "等待本轮证据" : latest.result === "eliminate" ? "已淘汰" : "继续进化";
  const calibrationAverage = useMemo(() => Math.round(state.calibrations.reduce((sum, item) => sum + Math.abs(item.syntheticValue - item.humanValue), 0) / state.calibrations.length), [state.calibrations]);

  return <div className="page-frame">
    <header className="page-heading"><div><p className="section-kicker">Experiment Protocol</p><h1>虚拟上市与现实校准</h1><p className="page-description">将产品放入结构化选择压力中；合成消费者负责压力测试，真人研究负责校准，不把模拟偏好写成市场销量。</p></div><span className="simulation-chip"><Bot className="h-3.5 w-3.5" /> D级模拟进行中</span></header>

    <section className="experiment-progress data-surface">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="section-kicker">Round {String(completed).padStart(3, "0")}</p><h2 className="section-title">{stage.name} · {statusCopy}</h2></div><button className="primary-action" onClick={advanceExperiment} disabled={completed >= 100}><Play className="h-4 w-4 fill-current" />{completed >= 100 ? "协议已完成" : "运行下一轮"}</button></div>
      <div className="round-meter mt-6"><span style={{ width: `${completed}%` }} /></div>
      <div className="mt-5 grid gap-3 md:grid-cols-5">{stages.map((item, index) => <article key={item.key} className={`stage-card ${index === stageIndex ? "stage-card-active" : ""} ${index < stageIndex ? "stage-card-done" : ""}`}><span>{item.range}</span><strong>{item.name}</strong><small>{item.pressure}</small></article>)}</div>
    </section>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
      <section className="panel-surface"><div className="panel-title-row"><div><p className="section-kicker">Synthetic Stress Test</p><h2>概念选择压力</h2></div><EvidenceBadge level="D" /></div><div className="mt-5 space-y-3">{concepts.map((concept) => <div key={concept.label} className="concept-choice"><span className="concept-letter">{concept.label}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><strong>{concept.name}</strong><span className="font-semibold text-[#315C46]">{concept.share}%</span></div><div className="choice-bar"><span style={{ width: `${concept.share}%` }} /></div><p>{concept.reason}</p></div></div>)}</div><p className="data-caution"><ShieldAlert className="h-4 w-4" />以上为合成消费者选择份额，只用于发现分歧与反例，不代表真实市场份额或购买转化。</p></section>

      <section className="panel-surface"><div className="panel-title-row"><div><p className="section-kicker">Scenario Planning</p><h2>商业情景区间</h2></div><span className="meta-chip">非销量预测</span></div><div className="segmented mt-5">{scenarios.map((item) => <button key={item.name} onClick={() => setScenario(item.name)} className={scenario === item.name ? "active" : ""}>{item.name}</button>)}</div>{scenarios.filter((item) => item.name === scenario).map((item) => <div key={item.name} className="scenario-result"><p>目标人群中的概念考虑区间</p><strong>{item.range}</strong><span>{item.note}</span></div>)}<div className="mt-4 grid grid-cols-3 gap-2"><MiniFact label="候选价带" value="69—89元" /><MiniFact label="成本状态" value="待BOM" /><MiniFact label="供应链" value="需验证" /></div></section>
    </div>

    <section className="mt-6 panel-surface"><div className="panel-title-row"><div><p className="section-kicker">Reality Check</p><h2>合成结果 × 真人研究</h2></div><div className="segmented compact"><button onClick={() => setView("synthetic")} className={view === "synthetic" ? "active" : ""}>AI模拟</button><button onClick={() => setView("human")} className={view === "human" ? "active" : ""}>真人</button><button onClick={() => setView("delta")} className={view === "delta" ? "active" : ""}>偏差</button></div></div><div className="calibration-grid">{state.calibrations.map((item) => { const delta = item.syntheticValue - item.humanValue; const value = view === "synthetic" ? item.syntheticValue : view === "human" ? item.humanValue : Math.abs(delta); return <article key={item.id} className="calibration-card"><div className="flex items-center justify-between"><EvidenceBadge level={item.evidenceLevel} /><span className="text-xs text-[#7D8B85]">{item.id}</span></div><h3>{item.metric}</h3><div className="calibration-value">{view === "delta" ? (delta > 0 ? "+" : "−") : ""}{value}{item.unit}</div><p>{item.conclusion}</p><div className="calibration-action"><RefreshCw className="h-3.5 w-3.5" />{item.action}</div></article>; })}</div><div className="reality-summary"><Users className="h-5 w-5" /><div><strong>当前平均校准偏差 {calibrationAverage} 个百分点</strong><p>最大偏差来自价格接受度。系统已把该差异回写为下一轮价格分层访谈任务，不能用合成结果替代真人结论。</p></div><ArrowRight className="ml-auto h-5 w-5" /></div></section>

    <section className="mt-6 decision-output"><div><CheckCircle2 className="h-5 w-5" /><div><p>本轮系统输出</p><strong>{currentVersion.label} 暂时存活；继续验证价格与小规格包装可行性</strong></div></div><span>负责人：商品经理 / 供应链 / 真人研究</span></section>
  </div>;
}

function MiniFact({ label, value }: { label: string; value: string }) { return <div className="mini-fact"><span>{label}</span><strong>{value}</strong></div>; }
