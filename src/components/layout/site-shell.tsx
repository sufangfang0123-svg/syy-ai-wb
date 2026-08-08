"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { Activity, Aperture, BarChart3, BookOpenCheck, Dna, FileCheck2, FlaskConical, History, Menu, Radar, X } from "lucide-react";
import { GuidedDemo, GuidedDemoButton } from "@/components/demo/guided-demo";
import { AuditDrawer } from "@/components/demo/audit-drawer";

const nav = [
  { href: "/", label: "进化总览", icon: Aperture },
  { href: "/radar", label: "全网雷达", icon: Radar },
  { href: "/insights", label: "信号洞察", icon: Activity },
  { href: "/opportunities", label: "需求机会", icon: BookOpenCheck },
  { href: "/evolution", label: "产品进化", icon: Dna },
  { href: "/launch", label: "虚拟上市", icon: FlaskConical },
  { href: "/content", label: "内容中枢", icon: FileCheck2 },
];

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  return <div className="min-h-screen bg-[#FAF8F5] text-[#2D3436]"><header className="sticky top-0 z-50 border-b border-[#DFE6E9]/90 bg-[#FAF8F5]/95 backdrop-blur"><div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-5 px-4 lg:px-6"><Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="棉生万物首页"><div className="brand-mark"><span /><span /><span /></div><div><p className="text-[15px] font-semibold tracking-wide text-[#26312D]">棉生万物</p><p className="text-[10px] uppercase tracking-[0.2em] text-[#6F7D77]">Cotton Evolution Lab</p></div></Link><nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">{nav.map(({ href, label, icon: Icon }) => { const active = href === "/" ? pathname === "/" : pathname.startsWith(href); return <Link key={href} href={href} className={`nav-link ${active ? "nav-link-active" : ""}`}><Icon className="h-4 w-4" />{label}</Link>; })}</nav><div className="ml-auto flex items-center gap-2"><button onClick={() => setAuditOpen(true)} className="icon-button hidden sm:inline-flex" aria-label="查看审计日志"><History className="h-4 w-4" /></button><GuidedDemoButton /><button onClick={() => setMenuOpen(!menuOpen)} className="icon-button xl:hidden" aria-label="打开导航菜单">{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div></div>{menuOpen ? <nav className="grid grid-cols-2 gap-2 border-t border-[#DFE6E9] p-4 xl:hidden">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="nav-link justify-start"><Icon className="h-4 w-4" />{label}</Link>)}</nav> : null}</header><main>{children}</main><footer className="border-t border-[#DFE6E9] bg-[#F3F1EC] px-4 py-3 text-center text-xs text-[#636E72]">DEMO MODE · AI模拟仅用于预筛、压力测试和寻找反例，不等同于真实消费者预测。重大决策必须经过真人与企业责任人确认。</footer><GuidedDemo /><AuditDrawer open={auditOpen} onClose={() => setAuditOpen(false)} /></div>;
}
