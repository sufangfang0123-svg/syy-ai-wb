"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Clipboard, Download, FileEdit, GitCompareArrows, ShieldAlert } from "lucide-react";
import { useProductWorkbench } from "@/components/workbench/product-workbench-provider";
import { LocalWorkbenchStage } from "@/components/workbench/local-workbench-stage";
import { ReviewStatus } from "@/domain/product-workbench-types";

const channels = ["全部", "小红书", "抖音", "电商", "视频号", "私域"] as const;
const reviewLabels: Record<ReviewStatus, string> = { pending: "待审核", approved: "已通过", changes: "需修改", rejected: "不采用" };

export default function ContentPage() {
  const {mode}=useProductWorkbench();
  return mode==="local_api"?<LocalWorkbenchStage stage="content"/>:<PublicContentPage/>;
}

function PublicContentPage() {
  const { state, selectedConcept, updateContent, reviewContent } = useProductWorkbench();
  const [channel, setChannel] = useState<(typeof channels)[number]>("全部");
  const [variant, setVariant] = useState<"A" | "B">("A");
  const assets = useMemo(() => state.contentAssets.filter((item) => (channel === "全部" || item.channel === channel) && item.variant === variant), [state.contentAssets, channel, variant]);
  const [activeId, setActiveId] = useState(state.contentAssets[0].id);
  const active = state.contentAssets.find((item) => item.id === activeId) ?? assets[0] ?? state.contentAssets[0];
  const [draft, setDraft] = useState(active.editedText || active.originalText);
  const [reviewNote, setReviewNote] = useState(active.reviewNote);
  const [message, setMessage] = useState("");
  const choose = (id: string) => { const item = state.contentAssets.find((asset) => asset.id === id)!; setActiveId(id); setDraft(item.editedText || item.originalText); setReviewNote(item.reviewNote); setMessage(""); };
  const copy = async () => { await navigator.clipboard.writeText(active.editedText || active.originalText); setMessage("已复制当前版本"); };
  const exportPack = () => { const payload = state.contentAssets.filter((item) => item.conceptId === selectedConcept.id).map(({ originalText, ...item }) => ({ ...item, text: item.editedText || originalText, fixtureBoundary: "DEMO / 固定演示内容 / 未自动发布" })); const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const href = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = href; anchor.download = `${selectedConcept.id}-demo-content-pack.json`; anchor.click(); URL.revokeObjectURL(href); setMessage("已导出演示内容包"); };
  return <div className="page-frame">
    <header className="page-heading"><div><p className="section-kicker">Omnichannel content operations</p><h1>全渠道内容营销中枢</h1><p className="page-description">围绕当前概念管理五类渠道、A/B版本、人工编辑、合规审核与反馈追溯；不连接平台账号，不自动发布或投放。</p></div><button className="secondary-action" onClick={exportPack}><Download className="h-4 w-4" />导出演示内容包</button></header>
    <section className="content-context"><div><span>产品概念</span><strong>{selectedConcept.name}</strong><small>{selectedConcept.id} · V{selectedConcept.version}</small></div><div><span>产品基因</span><strong>{selectedConcept.genes.join(" · ")}</strong><small>比赛概念方案，非全棉时代正式产品</small></div><div><span>内容边界</span><strong>固定演示内容</strong><small>未调用真实AI、未连接平台</small></div></section>
    <div className="channel-filter mt-5">{channels.map((item) => <button key={item} className={channel === item ? "active" : ""} onClick={() => setChannel(item)}>{item}</button>)}<span className="channel-filter-separator" /><button className={variant === "A" ? "active" : ""} onClick={() => setVariant("A")}>A版</button><button className={variant === "B" ? "active" : ""} onClick={() => setVariant("B")}>B版</button></div>
    <div className="content-studio-layout">
      <aside className="content-asset-list"><header><span>内容版本</span><strong>{assets.length}</strong></header>{assets.map((item) => <button key={item.id} className={active.id === item.id ? "active" : ""} onClick={() => choose(item.id)}><div><span>{item.channel} · {item.variant}版</span><em className={`review-pill review-${item.reviewStatus}`}>{item.stale ? "stale" : reviewLabels[item.reviewStatus]}</em></div><strong>{item.contentGoal}</strong><small>{item.id} · V{item.version}</small></button>)}</aside>
      <section className="content-editor panel-surface"><div className="panel-title-row"><div><p className="section-kicker">{active.channel} · Variant {active.variant}</p><h2>{active.contentGoal}</h2></div><span className="simulation-chip">固定演示内容</span></div><div className="content-metadata"><p><span>目标人群</span>{active.audience}</p><p><span>使用场景</span>{active.scenario}</p><p><span>核心卖点</span>{active.sellingPoint}</p><p><span>CTA</span>{active.cta}</p></div><div className="content-diff"><article><span>固定原始版本</span><pre>{active.originalText}</pre></article><article><span>人工版本</span><textarea aria-label="人工内容版本" value={draft} onChange={(event) => setDraft(event.target.value)} /></article></div><div className="mt-4 flex flex-wrap gap-3"><button className="primary-action" onClick={() => { updateContent(active.id, draft); setMessage("人工版本已保存"); }}><FileEdit className="h-4 w-4" />保存人工版本</button><button className="secondary-action" onClick={copy}><Clipboard className="h-4 w-4" />复制单条内容</button><span role="status" aria-live="polite" className="self-center text-xs text-[#315C46]">{message}</span></div></section>
      <aside className="content-review panel-surface"><p className="section-kicker">Review & trace</p><h2 className="section-title">审核与追溯</h2><div className="trace-chips">{active.evidenceIds.map((id) => <Link key={id} href="/evidence">Evidence {id}</Link>)}<Link href="/evolution">概念 {active.conceptId}</Link></div><div className="risk-stack mt-4"><p><ShieldAlert className="h-4 w-4" />{active.complianceRisk}</p></div><label className="form-field mt-4"><span>审核意见</span><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} /></label><div className="review-actions">{(["pending", "approved", "changes", "rejected"] as ReviewStatus[]).map((status) => <button key={status} className={active.reviewStatus === status ? "active" : ""} onClick={() => reviewContent(active.id, status, reviewNote)}>{status === "approved" ? <Check className="h-3.5 w-3.5" /> : status === "changes" ? <FileEdit className="h-3.5 w-3.5" /> : status === "rejected" ? "×" : "·"}{reviewLabels[status]}</button>)}</div><div className="content-lineage"><GitCompareArrows className="h-4 w-4" /><p>反馈可从<Link href="/results">转化反馈</Link>回到此版本；概念实质变更时本版本会显示 stale。</p></div></aside>
    </div>
  </div>;
}
