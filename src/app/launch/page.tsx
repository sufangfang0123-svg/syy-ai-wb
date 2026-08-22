"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Filter, FlaskConical, GitCompareArrows, ShieldAlert } from "lucide-react";
import { useProductWorkbench } from "@/components/workbench/product-workbench-provider";
import { LocalWorkbenchStage } from "@/components/workbench/local-workbench-stage";

export default function LaunchPage() {
  const {mode}=useProductWorkbench();
  return mode==="local_api"?<LocalWorkbenchStage stage="scenarios"/>:<PublicLaunchPage/>;
}

function PublicLaunchPage() {
  const { state, selectedConcept, scenarios, reviewScenario } = useProductWorkbench();
  const [persona, setPersona] = useState("全部");
  const [channel, setChannel] = useState("全部");
  const [selected, setSelected] = useState<string[]>([]);
  const [owner, setOwner] = useState("演示负责人");
  const [note, setNote] = useState("");
  const visible = useMemo(() => scenarios.filter((item) => (persona === "全部" || item.persona === persona) && (channel === "全部" || item.channel === channel)), [scenarios, persona, channel]);
  const personas = ["全部", ...new Set(scenarios.map((item) => item.persona))];
  const channels = ["全部", ...new Set(scenarios.map((item) => item.channel))];
  const reviewMap = new Map(state.scenarioReviews.map((item) => [item.scenarioId, item]));
  const toggleCompare = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
  return <div className="page-frame">
    <header className="page-heading"><div><p className="section-kicker">Deterministic scenario matrix</p><h1>数字实验工作台</h1><p className="page-description">围绕当前概念形成100个确定性情景组合，用于整理和缩小待验证范围；刷新后组合和分数保持一致。</p></div><span className="simulation-chip">100 / 100 个固定组合</span></header>
    <section className="scenario-boundary"><ShieldAlert className="h-5 w-5" /><p>数字情景实验用于整理和缩小待验证范围，不替代真实用户研究、渠道测试或企业最终决策。优先级不是销量、ROI或爆款概率预测。</p></section>
    <section className="scenario-toolbar"><div><Filter className="h-4 w-4" /><select value={persona} onChange={(event) => setPersona(event.target.value)} aria-label="按人群筛选">{personas.map((item) => <option key={item}>{item}</option>)}</select><select value={channel} onChange={(event) => setChannel(event.target.value)} aria-label="按渠道筛选">{channels.map((item) => <option key={item}>{item}</option>)}</select></div><p>当前概念：<strong>{selectedConcept.name}</strong> · 已复核 {state.scenarioReviews.length} 个</p></section>
    {selected.length ? <section className="scenario-compare"><header><GitCompareArrows className="h-4 w-4" /><strong>对比中的情景（最多3个）</strong><button onClick={() => setSelected([])}>清空</button></header><div>{selected.map((id) => { const item = scenarios.find((scenario) => scenario.id === id)!; return <article key={id}><span>{item.id}</span><strong>{item.persona}</strong><p>{item.sellingPoint} · {item.channel}</p><b>{item.priority}</b></article>; })}</div></section> : null}
    <section className="scenario-table" aria-label="100个数字情景组合"><header><span>情景</span><span>人群 / 卖点</span><span>渠道 / CTA</span><span>演示优先级</span><span>状态与操作</span></header>{visible.map((item) => { const review = reviewMap.get(item.id); return <article key={item.id} className={review?.stale ? "stale" : ""}><label><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleCompare(item.id)} aria-label={`对比${item.id}`} /><span>{item.id}</span><small>{item.assumptionId}</small></label><div><strong>{item.persona}</strong><small>{item.sellingPoint}</small></div><div><strong>{item.channel}</strong><small>{item.cta}</small></div><button className="priority-cell" title={item.rule} onClick={() => toggleCompare(item.id)}><b>{item.priority}</b><small>公式可查</small></button><div><span className={`review-pill review-${review?.status ?? "pending"}`}>{review?.stale ? "stale" : review?.status ?? "未复核"}</span><button onClick={() => reviewScenario(item.id, "shortlisted", owner, note)}>加入候选</button><button onClick={() => reviewScenario(item.id, "validation", owner, note)}>进入Validation</button></div></article>; })}</section>
    <section className="panel-surface mt-6"><div className="panel-title-row"><div><p className="section-kicker">Human review</p><h2>人工判断与责任人</h2></div><span className="meta-chip">不会自动生成或择优推荐实验</span></div><div className="form-grid mt-4"><label className="form-field"><span>负责人</span><input value={owner} onChange={(event) => setOwner(event.target.value)} /></label><label className="form-field"><span>判断说明</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="记录为什么把某个情景加入候选或Validation" /></label></div><div className="mt-4 flex flex-wrap gap-3"><Link href="/tests" className="primary-action">查看既有Validation记录<ArrowRight className="h-4 w-4" /></Link><Link href="/evidence" className="secondary-action"><FlaskConical className="h-4 w-4" />进入预验证Gate</Link></div><p className="mt-3 text-xs text-[#6F7D77]">公开演示仅记录情景与Validation候选关系；真实项目必须在本地工作区人工创建Validation，未确认内容不影响Gate。</p></section>
  </div>;
}
