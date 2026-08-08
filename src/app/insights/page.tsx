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
    <div className="mt-6 insights-layout"><section className="panel-surface"><div className="panel-title-row"><div><p className="section-kicker">Evidence Library</p><h2>可追溯信号</h2></div><div className="segmented compact">{(["ALL", "A", "B", "C", "D"] as const).map((item) => <button key={item} onClick={() => setLevel(item)} className={level === item ? "active" : ""}>{item}</button>)}</div></div><div className="insight-list">{filtered.map((item) => <button key={item.id} onClick={() => setSelected(item.id)} className={selected === item.id ? "active" : ""}><EvidenceBadge level={item.level} /><div><strong>{item.title}</strong><p>{item.excerpt}</p><span>{item.platform} · {item.scenario}</span></div></button>)}</div></section><section className="panel-surface insight-detail"><div className="flex items-center justify-between"><EvidenceBadge level={active.level} /><span className="text-xs text-[#7C8882]">{active.id}</span></div><h2>{active.title}</h2><blockquote>{active.excerpt}</blockquote><dl><div><dt>来源</dt><dd>{active.platform} / {active.date}</dd></div><div><dt>人群</dt><dd>{active.persona}</dd></div><div><dt>场景</dt><dd>{active.scenario}</dd></div><div><dt>痛点</dt><dd>{active.painPoint}</dd></div><div><dt>真人研究</dt><dd>{active.isHuman ? "是" : "否 / 不可确认"}</dd></div><div><dt>人工复核</dt><dd>{active.reviewed ? "已复核" : "待复核"}</dd></div></dl><p className="data-caution">单条信号不能独立支持产品结论。需结合独立支持证据、反对证据、替代方案和待真人验证问题。</p></section><section className="panel-surface"><p className="section-kicker">Pain Clusters</p><h2 className="section-title">痛点结构</h2><div className="cluster-bars">{painClusters.map(([name, count], index) => <div key={name}><div><span>{name}</span><strong>{count}</strong></div><i><b style={{ width: `${Math.max(24, 100 - index * 13)}%` }} /></i></div>)}</div><div className="mt-6 rounded-2xl bg-[#EDF3EE] p-4"><p className="text-xs font-semibold uppercase tracking-wider text-[#668071]">Interpretation</p><p className="mt-2 text-sm leading-6 text-[#4D5C55]">“携带体积、操作步骤、组合灵活度”共同指向外出准备成本，但价格和供应链形成明显反证。</p></div></section></div>
  </div>;
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) { return <div className="stat-card"><Icon className="h-5 w-5" /><span>{label}</span><strong>{value}</strong></div>; }
