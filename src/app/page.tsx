"use client";

import Link from "next/link";
import { ArrowRight, Banknote, CheckCircle2, ClipboardCheck, FileSearch, FlaskConical, Network, PackageCheck, ShieldAlert } from "lucide-react";
import { useDecision } from "@/components/decision/decision-provider";
import { useRuntimeBoundary } from "@/components/system/runtime-boundary-provider";
import { getValidationLedger } from "@/lib/validation-ledger";

const mechanism = [
  [Banknote, "说明下一笔投入", "打样、开模、备货、推广或下一道验证所需资源。"],
  [FileSearch, "核对证据", "来源、样本、适用范围、冲突和限制都应可追溯。"],
  [Network, "识别风险假设", "同时查看错误代价和证据缺口，而不是只看热度。"],
  [FlaskConical, "设计最低成本验证", "锁定一个主变量，并预设通过、补证和停止阈值。"],
  [ClipboardCheck, "形成决策记录", "系统输出和人工决定分开记录，结果继续回流。"],
] as const;

export default function ProductSite() {
  const { state } = useDecision();
  const { config } = useRuntimeBoundary();
  const project = state.project;
  const decision = state.decision;
  const ledger = getValidationLedger(state);
  const workspaceLabel = config.isPublicDemo ? "进入模拟研究实验室" : "打开本地集成工作区";

  return <div>
    <section className="hero-section"><div className="mx-auto grid max-w-[1500px] items-center gap-12 px-5 py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-10 lg:py-28">
      <div><p className="section-kicker">Evolution Lab · Next-Dollar Gate</p><h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#26312D] md:text-7xl">先别急着做新品。<span className="mt-3 block text-[#315C46]">先判断下一笔钱值不值得花。</span></h1><p className="mt-7 max-w-2xl text-lg leading-8 text-[#627169]">在支付打样、开模、备货或推广费用前，用结构化证据识别最危险的假设，并设计成本更低的下一项验证。</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/workspace" className="primary-action px-5 py-3">{workspaceLabel}<ArrowRight className="h-4 w-4" /></Link><a href="#case" className="secondary-action px-5 py-3">查看棉品模拟案例</a></div><p className="mt-4 text-xs text-[#7A867F]">当前公开站仅提供展示与模拟流程，不运行真实采集、真实模型或真实项目决策。</p></div>
      <div className="decision-hero-card"><div className="flex items-center justify-between gap-3"><span className="simulation-chip">模拟案例 · {project.id}</span><span className="decision-status supplement">模拟结论</span></div><p className="mt-7 text-xs font-bold uppercase tracking-[.16em] text-white/50">Next investment</p><h2 className="mt-2 text-2xl font-semibold text-white">{project.nextAction}</h2><p className="mt-2 text-5xl font-semibold text-[#C6E2CE]">¥{project.nextInvestmentAmount?.toLocaleString("zh-CN")}</p><div className="mt-7 border-t border-white/10 pt-5"><p className="text-xs text-white/55">模拟风险假设</p><p className="mt-2 text-sm leading-6 text-white">{state.assumptions[0].statement}</p></div><div className="mt-5 rounded-xl bg-white/8 p-4"><p className="text-xs text-white/55">模拟验证预算</p><p className="mt-1 text-xl font-semibold text-white">¥{state.tests[0].budget.toLocaleString("zh-CN")} · {state.tests[0].duration}</p><p className="mt-2 text-xs leading-5 text-white/60">演示数据不能作为真实投入依据。</p></div></div>
    </div></section>

    <section id="mechanism" className="page-frame"><div className="max-w-3xl"><p className="section-kicker">One engine, one decision moment</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">不是生成更多创意，而是决定下一项证据</h2><p className="page-description">当前版本用显著标注的模拟数据展示方法；真实项目能力将按纵向切片逐步实现和验收。</p></div><div className="mt-8 grid gap-4 md:grid-cols-5">{mechanism.map(([Icon, title, body], index) => <article key={title} className="mechanism-card"><span>{String(index + 1).padStart(2, "0")}</span><Icon className="mt-8 h-6 w-6 text-[#5B8C5A]" /><h3>{title}</h3><p>{body}</p></article>)}</div></section>

    <section id="case" className="border-y border-[#DFE6E9] bg-white/60"><div className="page-frame"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">Simulation industry pack</p><h2 className="mt-3 text-3xl font-semibold">棉生万物 · 棉品模拟验证包</h2><p className="page-description">以下项目、证据、指标和结论均为演示夹具，只用于说明信息结构。</p></div><span className="simulation-chip">全部为模拟项目数据</span></div><div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <article className="panel-surface"><p className="section-kicker">Shared demo chain</p><h3 className="mt-2 text-xl font-semibold">{project.name}</h3><div className="mt-6 space-y-3">{[["模拟项目ID", project.id], ["模拟下一投入", `${project.nextAction} · ¥${project.nextInvestmentAmount?.toLocaleString("zh-CN")}`], ["模拟证据", decision.evidenceIds.join("、")], ["模拟验证", `${state.tests[0].id} · ${state.tests[0].primaryVariable}`], ["模拟Gate", "仅展示流程，不构成真实判断"]].map(([label, value]) => <div key={label} className="fact-row"><span>{label}</span><strong>{value}</strong></div>)}</div></article>
      <article className="panel-surface"><p className="section-kicker">Validation boundary</p><h3 className="mt-2 text-xl font-semibold">演示计数不冒充真实结果</h3><div className="mt-5 grid grid-cols-2 gap-3">{[["数字演示", `${ledger.digital.proposed}项待执行`, "不代表真实实验"], ["真人方案", `${ledger.human.proposed}项待执行`, "未执行不计完成"], ["样品结果", `${ledger.sampleCompleted}项完成`, "当前没有真实结果"], ["销售结果", `${ledger.salesCompleted}项完成`, "当前没有真实结果"]].map(([title, value, note]) => <div key={title} className="validation-count"><span>{title}</span><strong>{value}</strong><small>{note}</small></div>)}</div><div className="data-caution"><ShieldAlert className="h-4 w-4" />模拟页面中的分数、复核率和结果均不进入真实项目空间。</div></article>
    </div></div></section>

    <section id="versions" className="page-frame"><div className="text-center"><p className="section-kicker">Implementation status</p><h2 className="mt-3 text-3xl font-semibold">当前能力与明确边界</h2></div><div className="mx-auto mt-8 grid max-w-5xl gap-5 md:grid-cols-3">
      <StatusCard icon={PackageCheck} title="公开展示构建" status="当前可用" items={["产品说明", "模拟研究实验室", "真实项目入口关闭"]} />
      <StatusCard icon={CheckCircle2} title="本地集成构建" status="1A-0边界" items={["后端健康检查", "可用状态提示", "不保存真实项目"]} />
      <StatusCard icon={ShieldAlert} title="真实项目闭环" status="尚未实现" items={["数据库与恢复", "证据与规则计算", "人工决策与追溯"]} />
    </div><div className="mt-10 text-center"><Link href="/workspace" className="primary-action px-6 py-3">{workspaceLabel}<ArrowRight className="h-4 w-4" /></Link></div></section>
  </div>;
}

function StatusCard({ icon: Icon, title, status, items }: { icon: typeof PackageCheck; title: string; status: string; items: string[] }) {
  return <article className="version-card"><Icon className="h-6 w-6 text-[#5B8C5A]" /><h3>{title}</h3><p>{status}</p><ul>{items.map((item) => <li key={item}><CheckCircle2 className="h-4 w-4" />{item}</li>)}</ul></article>;
}
