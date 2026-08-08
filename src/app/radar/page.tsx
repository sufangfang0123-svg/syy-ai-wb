"use client";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Play, Radar, Radio, RefreshCw } from "lucide-react";
import { useEvolution } from "@/components/demo/evolution-provider";
import { EvidenceBadge } from "@/components/evidence/evidence-badge";

const sources = [
  { name: "公开社交信号", status: "演示样例", coverage: 68, note: "仅公开可见内容" },
  { name: "真人研究", status: "部分接入", coverage: 42, note: "访谈与概念测试" },
  { name: "企业经营数据", status: "待授权", coverage: 0, note: "不在前端模拟" },
  { name: "合成压力测试", status: "可用", coverage: 100, note: "明确标为D级" },
];

export default function RadarPage() {
  const { state } = useEvolution();
  const [running, setRunning] = useState(false);
  const [lastScan, setLastScan] = useState("08:30");
  const [focus, setFocus] = useState("全部场景");
  const filtered = useMemo(() => focus === "全部场景" ? state.evidence : state.evidence.filter((item) => item.scenario.includes(focus)), [focus, state.evidence]);
  const runScan = () => { setRunning(true); window.setTimeout(() => { setRunning(false); setLastScan(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })); }, 900); };

  return <div className="page-frame"><header className="page-heading"><div><p className="section-kicker">Signal Radar</p><h1>全网雷达</h1><p className="page-description">把公开信号、真人研究与企业数据接入状态分开显示。跨平台只比较覆盖，不直接推断需求强弱。</p></div><button className="primary-action" onClick={runScan} disabled={running}>{running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}{running ? "扫描中" : "运行演示扫描"}</button></header>
    <section className="stat-grid"><Stat icon={Radio} label="演示信号" value={state.evidence.length} /><Stat icon={Activity} label="真人证据" value={state.evidence.filter((item) => item.isHuman).length} /><Stat icon={AlertTriangle} label="待验证假设" value={state.evidence.filter((item) => item.level === "D").length} /><Stat icon={Radar} label="上次扫描" value={lastScan} /></section>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]"><section className="panel-surface"><div className="panel-title-row"><div><p className="section-kicker">Incoming Signals</p><h2>最新证据流</h2></div><select className="field-select" value={focus} onChange={(event) => setFocus(event.target.value)}><option>全部场景</option><option>短期出差</option><option>家庭补给</option><option>公共空间</option></select></div><div className="signal-stream">{filtered.slice(0, 9).map((item) => <article key={item.id} className="stream-row"><div className="stream-marker" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><EvidenceBadge level={item.level} /><span className="platform-chip">{item.platform}</span><span className="text-xs text-[#84908A]">{item.date}</span></div><strong>{item.title}</strong><p>{item.excerpt}</p><div className="flex gap-3 text-xs text-[#748079]"><span>场景：{item.scenario}</span><span>痛点：{item.painPoint}</span></div></div></article>)}</div></section><div className="space-y-6"><section className="panel-surface"><div className="panel-title-row"><div><p className="section-kicker">Source Readiness</p><h2>数据源状态</h2></div></div><div className="mt-4 space-y-3">{sources.map((item) => <div key={item.name} className="source-row"><div><strong>{item.name}</strong><p>{item.note}</p></div><div className="text-right"><span>{item.status}</span><div className="source-meter"><i style={{ width: `${item.coverage}%` }} /></div></div></div>)}</div></section><section className="panel-surface"><p className="section-kicker">Stop Conditions</p><h2 className="section-title">采集停止条件</h2><ul className="rule-list"><li><AlertTriangle />403、429、验证码或平台限制</li><li><AlertTriangle />登录墙、敏感个人信息或账号异常</li><li><AlertTriangle />需要发布、互动或绕过安全机制</li><li><CheckCircle2 />保存状态，转人工处理并记录审计</li></ul></section></div></div>
  </div>;
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) { return <div className="stat-card"><Icon className="h-5 w-5" /><span>{label}</span><strong>{value}</strong></div>; }
