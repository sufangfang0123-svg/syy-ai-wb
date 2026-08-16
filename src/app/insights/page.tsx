"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Filter, Layers3, MessageCircleWarning, Users } from "lucide-react";
import { useEvolution } from "@/components/demo/evolution-provider";
import { EvidenceBadge } from "@/components/evidence/evidence-badge";
import { EvidenceLevel } from "@/domain/types";

export default function InsightsPage() {
  const { state } = useEvolution();
  const [level, setLevel] = useState<"ALL" | EvidenceLevel>("ALL");
  const [selected, setSelected] = useState(state.evidence[0].id);
  const filtered = useMemo(() => level === "ALL" ? state.evidence : state.evidence.filter((item) => item.level === level), [level, state.evidence]);
  const active = state.evidence.find((item) => item.id === selected) ?? filtered[0] ?? state.evidence[0];
  const painClusters = useMemo(() => Object.entries(state.evidence.reduce<Record<string, number>>((acc, item) => { acc[item.painPoint] = (acc[item.painPoint] ?? 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6), [state.evidence]);

  return <div className="page-frame"><header className="page-heading"><div><p className="section-kicker">Insight Distillation</p><h1>信号洞察</h1><p className="page-description">先保留来源与不确定性，再聚类场景和痛点。系统输出的是待验证假设，不是无来源的确定性结论。</p></div><Link href="/opportunities" className="primary-action">形成机会卡<ArrowRight className="h-4 w-4" /></Link></header>
    <section className="stat-grid"><Stat icon={Layers3} label="信号条目" value={state.evidence.length} /><Stat icon={Users} label="涉及人群" value={new Set(state.evidence.map((item) => item.persona)).size} /><Stat icon={MessageCircleWarning} label="反向信号" value={state.evidence.filter((item) => item.sentiment === "negative").length} /><Stat icon={Filter} label="痛点簇" value={painClusters.length} /></section>
    <div className="mt-6 insights-layout"><section className="panel-surface"><div className="panel-title-row"><div><p className="section-kicker">Simulation Library</p><h2>模拟信号夹具</h2></div><div className="segmented compact">{(["ALL", "A", "B", "C", "D"] as const).map((item) => <button key={item} onClick={() => setLevel(item)} className={level === item ? "active" : ""}>{item}</button>)}</div></div><div className="insight-list">{filtered.map((item) => <button key={item.id} onClick={() => setSelected(item.id)} className={selected === item.id ? "active" : ""}><EvidenceBadge level={item.level} /><div><strong>{item.title}</strong><p>{item.excerpt}</p><span>{item.platform} · {item.scenario}</span></div></button>)}</div></section><section className="panel-surface insight-detail"><div className="flex items-center justify-between"><EvidenceBadge level={active.level} /><span className="simulation-chip">模拟夹具 · {active.id}</span></div><h2>{active.title}</h2><blockquote>{active.excerpt}</blockquote><dl><div><dt>模拟来源字段</dt><dd>{active.platform} / {active.date}</dd></div><div><dt>模拟人群</dt><dd>{active.persona}</dd></div><div><dt>场景</dt><dd>{active.scenario}</dd></div><div><dt>痛点</dt><dd>{active.painPoint}</dd></div><div><dt>数据类型</dt><dd>{active.isHuman ? "模拟人研夹具" : "模拟公开信号或情景"}</dd></div><div><dt>演示复核状态</dt><dd>{active.reviewed ? "夹具已标注" : "待演示复核"}</dd></div></dl><p className="data-caution">此处没有真实客户或真人研究数据。单条模拟信号不能支持产品结论；真实项目必须核验来源、反证、替代方案与待真人验证问题。</p></section><section className="panel-surface"><p className="section-kicker">Simulated clusters</p><h2 className="section-title">模拟痛点结构</h2><div className="cluster-bars">{painClusters.map(([name, count], index) => <div key={name}><div><span>{name}</span><strong>{count}</strong></div><i><b style={{ width: `${Math.max(24, 100 - index * 13)}%` }} /></i></div>)}</div><div className="mt-6 rounded-2xl bg-[#EDF3EE] p-4"><p className="text-xs font-semibold uppercase tracking-wider text-[#668071]">演示解释</p><p className="mt-2 text-sm leading-6 text-[#4D5C55]">固定夹具用来展示“携带体积、操作步骤、组合灵活度”与价格、供应链反证如何并列呈现，不代表真实需求强弱。</p></div></section></div>
  </div>;
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) { return <div className="stat-card"><Icon className="h-5 w-5" /><span>{label}</span><strong>{value}</strong></div>; }
