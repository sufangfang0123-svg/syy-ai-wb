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
  const [shortlistSelections, setShortlistSelections] = useState<string[]>([]);
  const [owner, setOwner] = useState("演示负责人");
  const [note, setNote] = useState("");
  const visible = useMemo(() => scenarios.filter((item) => (persona === "全部" || item.persona === persona) && (channel === "全部" || item.channel === channel)), [scenarios, persona, channel]);
  const personas = ["全部", ...new Set(scenarios.map((item) => item.persona))];
  const channels = ["全部", ...new Set(scenarios.map((item) => item.channel))];
  const reviewMap = new Map(state.scenarioReviews.map((item) => [item.scenarioId, item]));
  const toggleCompare = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
  const toggleShortlist = (id: string) => setShortlistSelections((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return <div className="page-frame">
    <header className="page-heading"><div><p className="section-kicker">Fixed demo candidate matrix</p><h1>数字情景候选宇宙</h1><p className="page-description">围绕固定演示概念形成100个组合。当前没有情景级输入，因此全部保持未评分；列表位置不代表优先级。</p></div><span className="simulation-chip">固定演示 · 100个未评分候选</span></header>
    <section className="scenario-boundary"><ShieldAlert className="h-5 w-5" /><p>这是用于说明人工筛选流程的固定演示矩阵，不是AI排名、高潜推荐、消费者实验、销量、ROI或爆款概率预测。</p></section>
    <section className="scenario-toolbar"><div><Filter className="h-4 w-4" /><select value={persona} onChange={(event) => setPersona(event.target.value)} aria-label="按人群筛选">{personas.map((item) => <option key={item}>{item}</option>)}</select><select value={channel} onChange={(event) => setChannel(event.target.value)} aria-label="按渠道筛选">{channels.map((item) => <option key={item}>{item}</option>)}</select></div><p>当前概念：<strong>{selectedConcept.name}</strong> · 已复核 {state.scenarioReviews.length} 个</p></section>
    {selected.length ? <section className="scenario-compare"><header><GitCompareArrows className="h-4 w-4" /><strong>人工对比中的情景（最多3个）</strong><button onClick={() => setSelected([])}>清空</button></header><div>{selected.map((id) => { const item = scenarios.find((scenario) => scenario.id === id)!; return <article key={id}><span>{item.id}</span><strong>{item.persona}</strong><p>{item.sellingPoint} · {item.channel}</p><b>未评分</b></article>; })}</div></section> : null}
    <section className="scenario-table" aria-label="100个未评分候选情景"><header><span>情景</span><span>人群 / 卖点</span><span>渠道 / CTA</span><span>评分状态</span><span>人工状态与操作</span></header>{visible.map((item) => { const review = reviewMap.get(item.id); const canRecord=Boolean(owner.trim()&&note.trim()); const selectedForShortlist=shortlistSelections.includes(item.id); return <article key={item.id} className={review?.stale ? "stale" : ""}><label><span className="mobile-field-label">情景与对比</span><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleCompare(item.id)} aria-label={`对比${item.id}`} /><span>{item.id}</span><small>{item.assumptionId}</small></label><div><span className="mobile-field-label">人群 / 卖点</span><strong>{item.persona}</strong><small>{item.sellingPoint}</small></div><div><span className="mobile-field-label">渠道 / CTA</span><strong>{item.channel}</strong><small>{item.cta}</small></div><div className="priority-cell" data-testid={`scenario-score-state-${item.id}`}><span className="mobile-field-label">评分状态</span><b>未评分</b><small>缺少情景级输入</small><small>{item.rule}</small></div><div><span className="mobile-field-label">人工状态与操作</span><span className={`review-pill review-${review?.status ?? "pending"}`}>{review?.stale ? "stale" : review?.status === "shortlisted" ? "人工 shortlist" : review?.status === "validation" ? "已进入验证" : "未复核"}</span>{!review||review.status==="unreviewed"?<label className="shortlist-check"><input type="checkbox" checked={selectedForShortlist} onChange={()=>toggleShortlist(item.id)} aria-label={`选择${item.id}加入人工shortlist`}/><span>明确选择</span></label>:null}<button disabled={!canRecord||!selectedForShortlist||Boolean(review&&review.status!=="unreviewed")} aria-describedby="scenario-review-requirements" onClick={() => {reviewScenario(item.id, "shortlisted", owner.trim(), note.trim());setShortlistSelections((current)=>current.filter((id)=>id!==item.id));}}>加入人工 shortlist</button><button disabled={!canRecord||review?.status!=="shortlisted"} aria-describedby="scenario-review-requirements" onClick={() => reviewScenario(item.id, "validation", owner.trim(), note.trim())}>标记进入验证</button></div></article>; })}</section>
    <section className="panel-surface mt-6"><div className="panel-title-row"><div><p className="section-kicker">Human review</p><h2>人工筛选理由与责任人</h2></div><span className="meta-chip">不会自动排序或形成shortlist</span></div><div className="form-grid mt-4"><label className="form-field"><span>负责人（模拟自述）</span><input value={owner} onChange={(event) => setOwner(event.target.value)} /></label><label className="form-field"><span>筛选理由（必填）</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="记录为什么把某个情景加入人工shortlist" /></label></div><p id="scenario-review-requirements" className="mt-3 text-xs text-[#6F7D77]">先明确勾选一个候选，并填写负责人和筛选理由。固定演示Evidence引用：{selectedConcept.evidenceIds.join(" · ") || "无"}。操作、理由、时间与引用会保存在模拟审计中。</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/tests" className="primary-action">查看既有Validation记录<ArrowRight className="h-4 w-4" /></Link><Link href="/evidence" className="secondary-action"><FlaskConical className="h-4 w-4" />进入预验证Gate</Link></div><p className="mt-3 text-xs text-[#6F7D77]">公开演示只记录模拟人工筛选；真实项目必须在本地工作区引用已确认Evidence并创建Validation，未确认内容不影响Gate。</p></section>
  </div>;
}
