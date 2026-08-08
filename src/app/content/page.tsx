"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Check, FileCheck2, GitCompareArrows, ShieldCheck, Sparkles } from "lucide-react";
import { useEvolution } from "@/components/demo/evolution-provider";
import { EvidenceBadge } from "@/components/evidence/evidence-badge";
import { DATA_TYPE_LABELS } from "@/domain/constants";

const channels = ["全部", "小红书", "抖音", "视频号", "电商", "直播", "私域"];
const flow = ["产品事实", "渠道适配", "A/B变体", "合规预检", "小流量实验", "结果归因", "产品回写"];

export default function ContentPage() {
  const { state } = useEvolution();
  const [channel, setChannel] = useState("全部");
  const [variant, setVariant] = useState<"A" | "B">("A");
  const [claimId, setClaimId] = useState(state.claims[0].claimId);
  const claim = state.claims.find((item) => item.claimId === claimId) ?? state.claims[0];
  const evidence = state.evidence.filter((item) => claim.evidenceIds.includes(item.id));
  const assets = useMemo(() => state.contentAssets.filter((item) => (channel === "全部" || item.channel === channel) && item.variant === variant), [state.contentAssets, channel, variant]);

  return <div className="page-frame">
    <header className="page-heading"><div><p className="section-kicker">Evidence-aware Content Hub</p><h1>Claim Spine 与内容中枢</h1><p className="page-description">所有传播表达从可追溯主张出发，经过渠道适配、合规预检和实验回流；AI负责生成变体，不获得未经审核的事实。</p></div><span className="simulation-chip"><Sparkles className="h-3.5 w-3.5" /> 内容指标为D级模拟</span></header>

    <section className="content-flow">{flow.map((item, index) => <div key={item} className="content-flow-step"><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong>{index < flow.length - 1 ? <ArrowRight className="h-4 w-4" /> : null}</div>)}</section>

    <div className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
      <section className="panel-surface"><div className="panel-title-row"><div><p className="section-kicker">Claim Spine</p><h2>主张脊柱</h2></div><span className="count-chip">{state.claims.length} 条</span></div><div className="mt-5 space-y-3">{state.claims.map((item) => <button key={item.claimId} onClick={() => setClaimId(item.claimId)} className={`claim-card ${claimId === item.claimId ? "claim-card-active" : ""}`}><div className="flex items-center justify-between gap-3"><span className="font-mono text-xs text-[#75817C]">{item.claimId}</span><div className="flex items-center gap-2"><EvidenceBadge level={item.evidenceLevel} /><span className={`review-pill review-${item.reviewStatus}`}>{item.reviewStatus}</span></div></div><strong>{item.claimText}</strong><p>{item.allowedChannels.join(" · ")}</p></button>)}</div></section>

      <section className="panel-surface"><div className="panel-title-row"><div><p className="section-kicker">Claim Detail</p><h2>{claim.claimText}</h2></div>{claim.approved ? <span className="approval-badge"><Check className="h-3.5 w-3.5" />已批准</span> : <span className="warning-badge"><AlertTriangle className="h-3.5 w-3.5" />待审核</span>}</div><div className="claim-detail-grid"><div><span>允许渠道</span><p>{claim.allowedChannels.join(" / ")}</p></div><div><span>审核状态</span><p>{claim.reviewStatus}</p></div><div className="col-span-full"><span>禁止表达</span><div className="mt-2 flex flex-wrap gap-2">{claim.prohibitedExpressions.map((item) => <span key={item} className="risk-term">{item}</span>)}</div></div></div><div className="mt-5"><p className="field-label">证据链</p><div className="mt-2 grid gap-2 md:grid-cols-2">{evidence.map((item) => <article key={item.id} className="evidence-mini"><div><EvidenceBadge level={item.level} /><span>{item.platform}</span></div><strong>{item.title}</strong><p>{item.excerpt}</p></article>)}</div></div><p className="data-caution"><ShieldCheck className="h-4 w-4" />技术和材料类主张需由企业技术与合规责任人确认；待确认内容不可自动发布。</p></section>
    </div>

    <section className="mt-6 panel-surface"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="section-kicker">Channel Studio</p><h2 className="section-title">渠道内容 A/B 工作台</h2></div><div className="segmented compact"><button className={variant === "A" ? "active" : ""} onClick={() => setVariant("A")}>版本 A</button><button className={variant === "B" ? "active" : ""} onClick={() => setVariant("B")}>版本 B</button></div></div><div className="channel-filter mt-5">{channels.map((item) => <button key={item} onClick={() => setChannel(item)} className={channel === item ? "active" : ""}>{item}</button>)}</div>{assets.length ? <div className="asset-grid">{assets.map((asset) => <article key={asset.id} className="asset-card"><div className="flex items-center justify-between"><span className="channel-pill">{asset.channel}</span><span className={`review-pill review-${asset.status}`}>{asset.status}</span></div><h3>{asset.title}</h3><p>{asset.structure}</p><div className="asset-metric"><GitCompareArrows className="h-4 w-4" /><div><span>{asset.metricLabel}</span><strong>{asset.metricValue}%</strong></div></div><div className="flex items-center justify-between border-t border-[#E7E9E7] pt-3 text-xs text-[#748079]"><span>{DATA_TYPE_LABELS[asset.dataType]}</span><EvidenceBadge level="D" /></div></article>)}</div> : <div className="empty-state"><FileCheck2 className="h-7 w-7" /><p>当前筛选下没有内容变体。切换渠道或 A/B 版本继续查看。</p></div>}</section>

    <section className="mt-6 attribution-strip"><div><span>A胜出依据</span><strong>模拟收藏倾向 + 结构理解度</strong></div><ArrowRight className="h-4 w-4" /><div><span>不能推出</span><strong>真实成交或投放ROI</strong></div><ArrowRight className="h-4 w-4" /><div><span>回写产品</span><strong>清单式解释优先，价格仍需真人验证</strong></div></section>
  </div>;
}
