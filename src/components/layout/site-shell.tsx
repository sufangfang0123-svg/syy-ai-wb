"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { ArrowLeft, BookOpenCheck, ClipboardCheck, FileSearch, FlaskConical, History, LayoutDashboard, Menu, Network, RotateCcw, Server, X } from "lucide-react";
import { NewcomerGuide, NewcomerGuideButton } from "@/components/decision/newcomer-guide";
import { AuditDrawer } from "@/components/demo/audit-drawer";
import { ServiceStatus } from "@/components/system/service-status";
import { useRuntimeBoundary } from "@/components/system/runtime-boundary-provider";

const appNav = [
  { href: "/workspace", label: "模拟项目", phase: "01", icon: LayoutDashboard },
  { href: "/evidence", label: "模拟证据", phase: "02", icon: FileSearch },
  { href: "/assumptions", label: "模拟假设", phase: "03", icon: Network },
  { href: "/tests", label: "模拟验证", phase: "04", icon: FlaskConical },
  { href: "/decision", label: "模拟决策", phase: "05", icon: ClipboardCheck },
  { href: "/results", label: "模拟回流", phase: "06", icon: RotateCcw },
];

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const marketing = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const { config, activeSpace } = useRuntimeBoundary();

  if (marketing) {
    return <div className="min-h-screen bg-[#FAF8F5] text-[#2D3436]">
      <header className="site-header"><div className="mx-auto flex h-[72px] max-w-[1360px] items-center gap-5 px-4 sm:px-6 lg:px-8">
        <Brand />
        <span className="enterprise-preview-badge hidden sm:inline-flex">v0.1.1 · 企业试点演示版</span>
        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="展示站导航"><a href="#mechanism" className="nav-link">工作原理</a><a href="#case" className="nav-link">棉品模拟案例</a><a href="#versions" className="nav-link">实施状态</a></nav>
        <Link href="/workspace" className="primary-action ml-1"><span className="hidden sm:inline">{config.isPublicDemo ? "进入模拟研究实验室" : "打开本地集成工作区"}</span><span className="sm:hidden">开始体验</span></Link>
      </div></header>
      <main>{children}</main>
      <footer className="border-t border-[#DFE6E9] bg-[#F3F1EC] px-5 py-6 text-center text-xs leading-6 text-[#636E72]">v0.1.1 Enterprise Preview · Phase 1A-0。当前公开站仅提供方法展示与独立模拟研究实验室，不执行真实采集、真实AI分析或真实项目决策。</footer>
    </div>;
  }

  const realBoundaryOpen = activeSpace === "real-boundary";
  return <div className="min-h-screen bg-[#FAF8F5] text-[#2D3436]" data-build-profile={config.buildProfile} data-active-space={activeSpace}>
    <header className="site-header">
      <div className="mx-auto flex h-[72px] max-w-[1360px] items-center gap-4 px-4 lg:px-6">
        <Brand />
        <span className={`hidden rounded-full px-2 py-1 text-[10px] font-bold sm:inline-flex ${realBoundaryOpen ? "bg-[#E8F2EB] text-[#315C46]" : "bg-[#F5EBDD] text-[#8A5A33]"}`}>{realBoundaryOpen ? "本地真实服务边界" : "独立模拟研究实验室"}</span>
        {!realBoundaryOpen ? <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex" aria-label="模拟决策流程">{appNav.map(({ href, label, phase, icon: Icon }) => { const active = pathname.startsWith(href); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`nav-link ${active ? "nav-link-active" : ""}`}><span className="nav-phase">{phase}</span><Icon className="h-4 w-4" />{label}</Link>; })}</nav> : <div className="flex-1" />}
        <div className="ml-auto flex items-center gap-2">
          {!realBoundaryOpen ? <><Link href="/opportunities" className="secondary-action hidden lg:inline-flex"><BookOpenCheck className="h-4 w-4" />模拟研究实验室</Link><button onClick={() => setAuditOpen(true)} className="icon-button hidden sm:inline-flex" aria-label="查看模拟操作记录"><History className="h-4 w-4" /></button><NewcomerGuideButton /></> : null}
          {!realBoundaryOpen ? <button onClick={() => setMenuOpen(!menuOpen)} className="icon-button xl:hidden" aria-expanded={menuOpen} aria-controls="simulation-nav" aria-label="打开模拟流程导航">{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button> : null}
        </div>
      </div>
      {menuOpen && !realBoundaryOpen ? <nav id="simulation-nav" className="mobile-workflow-nav" aria-label="移动端模拟决策流程">{appNav.map(({ href, label, phase, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`nav-link justify-start ${pathname.startsWith(href) ? "nav-link-active" : ""}`}><span className="nav-phase">{phase}</span><Icon className="h-4 w-4" />{label}</Link>)}</nav> : null}
    </header>
    <main>{realBoundaryOpen ? <RealServiceBoundary /> : children}</main>
    <footer className="border-t border-[#DFE6E9] bg-[#F3F1EC] px-4 py-3 text-center text-xs leading-5 text-[#636E72]">{realBoundaryOpen ? "本地服务健康检查已通过，但 Phase 1A-0 不提供真实项目数据操作。" : "v0.1.1 Enterprise Preview · 独立模拟研究实验室。所有记录均为演示数据，只保存在当前浏览器，不用于生产、投资或经营决策。"}</footer>
    {!realBoundaryOpen ? <><NewcomerGuide /><AuditDrawer open={auditOpen} onClose={() => setAuditOpen(false)} /></> : null}
  </div>;
}

function RealServiceBoundary() {
  const { openDemo } = useRuntimeBoundary();
  return <div className="page-frame" data-testid="real-service-boundary">
    <div className="mx-auto max-w-4xl">
      <div className="page-heading"><div><p className="section-kicker">Phase 1A-0 boundary</p><h1>真实项目服务边界</h1><p className="page-description">本地后端健康检查已经通过，因此入口可见。当前切片不创建、不读取、不缓存任何真实项目。</p></div><Server className="h-8 w-8 text-[#315C46]" /></div>
      <ServiceStatus />
      <section className="panel-surface mt-5"><h2 className="text-lg font-semibold">当前可确认的事实</h2><ul className="rule-list mt-4"><li>真实项目入口只在 local_integrated 构建中存在。</li><li>后端不可用时入口立即关闭。</li><li>没有 FastAPI、数据库、项目创建或规则计算能力。</li><li>不会使用 localStorage 作为真实项目的替代存储。</li></ul><button type="button" onClick={openDemo} className="secondary-action mt-5"><ArrowLeft className="h-4 w-4" />返回模拟研究实验室</button></section>
    </div>
  </div>;
}

function Brand() {
  return <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="Evolution Lab展示站"><div className="brand-mark"><span /><span /><span /></div><div><p className="text-[15px] font-semibold tracking-wide text-[#26312D]">Evolution Lab</p><p className="text-[10px] uppercase tracking-[0.16em] text-[#6F7D77]">新品投前决策引擎</p></div></Link>;
}
