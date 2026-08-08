"use client";

import { useEvolution } from "./evolution-provider";
import { RotateCcw, X, Bot, UserRound } from "lucide-react";

export function AuditDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, resetDemo } = useEvolution();
  if (!open) return null;
  return <div className="fixed inset-0 z-[90] flex justify-end bg-[#17231F]/30" role="dialog" aria-modal="true" aria-label="审计日志"><button className="absolute inset-0" onClick={onClose} aria-label="关闭审计日志" /><aside className="relative h-full w-full max-w-[460px] overflow-y-auto bg-[#FAF8F5] p-6 shadow-2xl"><div className="mb-6 flex items-start justify-between"><div><p className="section-kicker">Audit Log</p><h2 className="text-2xl font-semibold text-[#26312D]">最近操作</h2><p className="mt-1 text-sm text-[#636E72]">记录对象变化、来源与AI参与状态</p></div><button onClick={onClose} className="icon-button" aria-label="关闭"><X className="h-4 w-4" /></button></div><div className="space-y-3">{state.auditLogs.map((log) => <article key={log.id} className="rounded-xl border border-[#DFE6E9] bg-white p-4"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-[#315C46]">{log.action}</span><span className="text-[11px] text-[#8A9590]">{log.createdAt}</span></div><p className="text-sm font-medium text-[#2D3436]">{log.object}</p><p className="mt-1 text-xs text-[#636E72]">{log.oldValue} → {log.newValue}</p><div className="mt-3 flex items-center gap-2 text-[11px] text-[#7D8B85]">{log.aiGenerated ? <Bot className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}{log.source}</div></article>)}</div><button onClick={resetDemo} className="secondary-action mt-6 w-full justify-center"><RotateCcw className="h-4 w-4" />恢复初始演示状态</button></aside></div>;
}
