"use client";

import { usePathname } from "next/navigation";
import { RotateCcw, X, Bot, UserRound } from "lucide-react";
import { useDecision } from "@/components/decision/decision-provider";
import { useEvolution } from "./evolution-provider";

const decisionRoutes = ["/workspace", "/evidence", "/assumptions", "/tests", "/decision", "/results"];

export function AuditDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { state: evolutionState, resetDemo } = useEvolution();
  const { state: decisionState, clearDemoData } = useDecision();
  const decisionScope = decisionRoutes.some((route) => pathname.startsWith(route));
  if (!open) return null;

  const logs = decisionScope
    ? decisionState.auditLogs.map((log) => ({ id: log.id, action: log.action, object: log.object, summary: log.summary, createdAt: log.createdAt, source: `${log.source} · 模拟`, aiGenerated: false }))
    : evolutionState.auditLogs.map((log) => ({ id: log.id, action: log.action, object: log.object, summary: `${log.oldValue} → ${log.newValue}`, createdAt: log.createdAt, source: `${log.source} · 研究实验室模拟`, aiGenerated: log.aiGenerated }));
  const title = decisionScope ? "模拟决策审计" : "研究实验室审计";
  const description = decisionScope ? "仅记录模拟决策流程的对象变化，不等同于企业可信身份审计。" : "仅记录研究实验室的模拟进化操作，不与决策流程日志混合。";
  const reset = decisionScope ? clearDemoData : resetDemo;

  return <div className="fixed inset-0 z-[90] flex justify-end bg-[#17231F]/30" role="dialog" aria-modal="true" aria-label={title}>
    <button className="absolute inset-0" onClick={onClose} aria-label={`关闭${title}`} />
    <aside className="relative h-full w-full max-w-[460px] overflow-y-auto bg-[#FAF8F5] p-6 shadow-2xl">
      <div className="mb-6 flex items-start justify-between"><div><p className="section-kicker">Audit Log · Simulation</p><h2 className="text-2xl font-semibold text-[#26312D]">{title}</h2><p className="mt-1 text-sm text-[#636E72]">{description}</p></div><button onClick={onClose} className="icon-button" aria-label="关闭"><X className="h-4 w-4" /></button></div>
      <div className="space-y-3" data-testid={decisionScope ? "decision-audit-log" : "research-audit-log"}>{logs.length ? logs.map((log) => <article key={log.id} className="rounded-xl border border-[#DFE6E9] bg-white p-4"><div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs font-semibold text-[#315C46]">{log.action}</span><span className="text-[11px] text-[#8A9590]">{log.createdAt}</span></div><p className="text-sm font-medium text-[#2D3436]">{log.object}</p><p className="mt-1 text-xs text-[#636E72]">{log.summary}</p><div className="mt-3 flex items-center gap-2 text-[11px] text-[#7D8B85]">{log.aiGenerated ? <Bot className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}{log.source}</div></article>) : <p className="empty-inline">当前范围尚无模拟操作记录。</p>}</div>
      <button onClick={reset} className="secondary-action mt-6 w-full justify-center"><RotateCcw className="h-4 w-4" />恢复当前模拟空间初始状态</button>
    </aside>
  </div>;
}
