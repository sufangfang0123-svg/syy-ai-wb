"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { BookOpenCheck, ClipboardCheck, FileSearch, FlaskConical, History, LayoutDashboard, Menu, Network, RotateCcw, X } from "lucide-react";
import { NewcomerGuide, NewcomerGuideButton } from "@/components/decision/newcomer-guide";
import { AuditDrawer } from "@/components/demo/audit-drawer";
import { useDecision } from "@/components/decision/decision-provider";

const appNav = [
  { href: "/workspace", label: "决策项目", phase: "01", icon: LayoutDashboard },
  { href: "/evidence", label: "证据库", phase: "02", icon: FileSearch },
  { href: "/assumptions", label: "风险假设", phase: "03", icon: Network },
  { href: "/tests", label: "下一验证", phase: "04", icon: FlaskConical },
  { href: "/decision", label: "投前决策单", phase: "05", icon: ClipboardCheck },
  { href: "/results", label: "结果回流", phase: "06", icon: RotateCcw },
];

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const marketing = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const { state } = useDecision();

  if (marketing) return <div className="min-h-screen bg-[#FAF8F5] text-[#2D3436]"><header className="site-header"><div className="mx-auto flex h-[72px] max-w-[1500px] items-center gap-5 px-5 lg:px-10"><Brand /><nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="展示站导航"><a href="#mechanism" className="nav-link">工作原理</a><a href="#case" className="nav-link">棉品案例</a><a href="#versions" className="nav-link">产品版本</a></nav><Link href="/workspace" className="primary-action ml-2">进入企业工作台</Link></div></header><main>{children}</main><footer className="border-t border-[#DFE6E9] bg-[#F3F1EC] px-5 py-6 text-center text-xs leading-6 text-[#636E72]">Evolution Lab提供决策支持，不替代真人研究、样品测试、合规审核或负责人最终决定。页面案例均为显著标注的模拟数据。</footer></div>;

  return <div className="min-h-screen bg-[#FAF8F5] text-[#2D3436]"><header className="site-header"><div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-4 px-4 lg:px-6"><Brand /><span className={`hidden rounded-full px-2 py-1 text-[10px] font-bold sm:inline-flex ${state.mode === "demo" ? "bg-[#F5EBDD] text-[#8A5A33]" : "bg-[#E8F2EB] text-[#315C46]"}`}>{state.mode === "demo" ? "模拟数据空间" : "真实项目空间"}</span><nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex" aria-label="企业决策工作流">{appNav.map(({ href, label, phase, icon: Icon }) => { const active = pathname.startsWith(href); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`nav-link ${active ? "nav-link-active" : ""}`}><span className="nav-phase">{phase}</span><Icon className="h-4 w-4" />{label}</Link>; })}</nav><div className="ml-auto flex items-center gap-2"><Link href="/opportunities" className="secondary-action hidden lg:inline-flex"><BookOpenCheck className="h-4 w-4" />研究实验室</Link><button onClick={() => setAuditOpen(true)} className="icon-button hidden sm:inline-flex" aria-label="查看审计日志"><History className="h-4 w-4" /></button><NewcomerGuideButton /><button onClick={() => setMenuOpen(!menuOpen)} className="icon-button xl:hidden" aria-expanded={menuOpen} aria-controls="enterprise-nav" aria-label="打开导航菜单">{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div></div>{menuOpen ? <nav id="enterprise-nav" className="mobile-workflow-nav" aria-label="移动端企业决策工作流">{appNav.map(({ href, label, phase, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`nav-link justify-start ${pathname.startsWith(href) ? "nav-link-active" : ""}`}><span className="nav-phase">{phase}</span><Icon className="h-4 w-4" />{label}</Link>)}</nav> : null}</header><main>{children}</main><footer className="border-t border-[#DFE6E9] bg-[#F3F1EC] px-4 py-3 text-center text-xs text-[#636E72]">{state.mode === "demo" ? "模拟数据空间：操作不会写入企业真实数据。" : "真实项目草稿仅保存在当前浏览器；正式企业版需要身份、权限、后端审计与加密存储。"} AI只提供可追溯的决策支持，最终决定由责任人确认。</footer><NewcomerGuide /><AuditDrawer open={auditOpen} onClose={() => setAuditOpen(false)} /></div>;
}

function Brand() { return <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="Evolution Lab展示站"><div className="brand-mark"><span /><span /><span /></div><div><p className="text-[15px] font-semibold tracking-wide text-[#26312D]">Evolution Lab</p><p className="text-[10px] uppercase tracking-[0.16em] text-[#6F7D77]">新品投前决策引擎</p></div></Link>; }
