"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { ArrowLeft, BookOpenCheck, History } from "lucide-react";
import { NewcomerGuide, NewcomerGuideButton } from "@/components/decision/newcomer-guide";
import { AuditDrawer } from "@/components/demo/audit-drawer";
import { useRuntimeBoundary } from "@/components/system/runtime-boundary-provider";
import { ProductWorkbenchShell } from "@/components/workbench/product-workbench-shell";

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const marketing = pathname === "/" || pathname.startsWith("/proof") || pathname.startsWith("/pilot") || pathname.startsWith("/enterprise-demo") || pathname.startsWith("/judge-kit");
  const [auditOpen, setAuditOpen] = useState(false);
  const { config, activeSpace } = useRuntimeBoundary();

  if (marketing) {
    return <div className="min-h-screen bg-[#FAF8F5] text-[#2D3436]">
      <header className="site-header"><div className="mx-auto flex h-[72px] max-w-[1360px] items-center gap-5 px-4 sm:px-6 lg:px-8">
        <Brand />
        <span className="enterprise-preview-badge hidden sm:inline-flex">v0.4.0 · 公开互动演示</span>
        <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="展示站导航"><Link href="/#mechanism" className="nav-link">工作原理</Link><Link href="/enterprise-demo" aria-current={pathname.startsWith("/enterprise-demo") ? "page" : undefined} className={`nav-link ${pathname.startsWith("/enterprise-demo") ? "nav-link-active" : ""}`}>企业闭环</Link><Link href="/judge-kit" aria-current={pathname.startsWith("/judge-kit") ? "page" : undefined} className={`nav-link ${pathname.startsWith("/judge-kit") ? "nav-link-active" : ""}`}>评委入口</Link><Link href="/proof" aria-current={pathname.startsWith("/proof") ? "page" : undefined} className={`nav-link ${pathname.startsWith("/proof") ? "nav-link-active" : ""}`}>成果证明</Link><Link href="/pilot" aria-current={pathname.startsWith("/pilot") ? "page" : undefined} className={`nav-link ${pathname.startsWith("/pilot") ? "nav-link-active" : ""}`}>企业试点</Link></nav>
        <Link href="/workspace" className="primary-action ml-auto lg:ml-1"><span className="hidden sm:inline">{config.isPublicDemo ? "进入模拟研究实验室" : "打开本地集成工作区"}</span><span className="sm:hidden">开始体验</span></Link>
      </div></header>
      <main>{children}</main>
      <footer className="border-t border-[#DFE6E9] bg-[#F3F1EC] px-5 py-6 text-center text-xs leading-6 text-[#636E72]">Evolution Lab · Next-Dollar Gate v0.4.0。公开站仅提供固定模拟演示和系统验收证据；真实闭环仅在 local_integrated 本地运行，不是云生产系统。</footer>
    </div>;
  }

  const realOpen = pathname.startsWith("/real") && config.isLocalIntegrated;
  const localWorkbench = config.isLocalIntegrated && !realOpen;
  return <div className="min-h-screen bg-[#FAF8F5] text-[#2D3436]" data-build-profile={config.buildProfile} data-active-space={activeSpace}>
    <header className="site-header">
      <div className="mx-auto flex h-[72px] max-w-[1360px] items-center gap-4 px-4 lg:px-6">
        <Brand />
        <span className={`hidden rounded-full px-2 py-1 text-[10px] font-bold sm:inline-flex ${realOpen || localWorkbench ? "bg-[#E8F2EB] text-[#315C46]" : "bg-[#F5EBDD] text-[#8A5A33]"}`}>{realOpen ? "本地 Evidence→Gate · SQLite" : localWorkbench ? "本地产品工作台 · SQLite" : "独立模拟研究实验室"}</span>
        <div className="flex-1" />
        <div className="ml-auto flex items-center gap-2">
          {localWorkbench ? <Link href="/real" className="secondary-action"><BookOpenCheck className="h-4 w-4"/>Evidence 与固定 Gate</Link> : !realOpen ? <><Link href="/opportunities" className="secondary-action shell-simulation-link"><BookOpenCheck className="h-4 w-4" />模拟研究实验室</Link><button onClick={() => setAuditOpen(true)} className="icon-button shell-audit-button" aria-label="查看模拟操作记录"><History className="h-4 w-4" /></button><NewcomerGuideButton /></> : <Link href="/workspace" className="secondary-action" aria-label="返回产品工作台"><ArrowLeft className="h-4 w-4"/><span className="hidden sm:inline">返回产品工作台</span></Link>}
        </div>
      </div>
    </header>
    {realOpen ? <main>{children}</main> : <ProductWorkbenchShell>{children}</ProductWorkbenchShell>}
    <footer className="border-t border-[#DFE6E9] bg-[#F3F1EC] px-4 py-3 text-center text-xs leading-5 text-[#636E72]">{realOpen || localWorkbench ? "v0.4.0 本地单用户产品工作台 · 人员身份为人工自述，不是多用户生产、RBAC或企业审批平台。" : "v0.4.0 Public Demo · 独立模拟研究实验室。所有记录均为演示夹具，不用于生产、投资或经营决策。"}</footer>
    {!realOpen && !localWorkbench ? <><NewcomerGuide /><AuditDrawer open={auditOpen} onClose={() => setAuditOpen(false)} /></> : null}
  </div>;
}

function Brand() {
  return <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="Evolution Lab · Next-Dollar Gate 首页"><div className="brand-mark"><span /><span /><span /></div><div><p className="text-[15px] font-semibold tracking-wide text-[#26312D]">Evolution Lab</p><p className="text-[10px] tracking-[0.08em] text-[#6F7D77]">新品投前决策与证据验证工作台</p></div></Link>;
}
