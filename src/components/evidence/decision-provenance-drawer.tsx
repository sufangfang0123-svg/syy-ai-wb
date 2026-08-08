"use client";

import { FITNESS_LABELS } from "@/domain/constants";
import { Evidence, FitnessDimensionKey, FitnessScore } from "@/domain/types";
import { X, Database, UserCheck, RefreshCw, ShieldAlert } from "lucide-react";
import { EvidenceBadge } from "./evidence-badge";

export function DecisionProvenanceDrawer({
  open,
  onClose,
  metric,
  score,
  evidence,
  fitness,
}: {
  open: boolean;
  onClose: () => void;
  metric: FitnessDimensionKey;
  score: number;
  evidence: Evidence[];
  fitness: FitnessScore;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-[#17231F]/30" role="dialog" aria-modal="true" aria-label="决策证据链">
      <button aria-label="关闭证据链" className="absolute inset-0 cursor-default" onClick={onClose} />
      <aside className="relative h-full w-full max-w-[520px] overflow-y-auto border-l border-[#D7DFDB] bg-[#FAF8F5] p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5B8C5A]">Decision Provenance</p>
            <h2 className="mt-1 text-2xl font-semibold text-[#26312D]">{FITNESS_LABELS[metric]} {score}</h2>
            <p className="mt-1 text-sm text-[#636E72]">该分数是证据加权后的决策辅助值，不是成功概率。</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-[#D7DFDB] p-2 hover:bg-white" aria-label="关闭"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Metric icon={Database} label="Evidence Coverage" value={`${fitness.evidenceCoverage}%`} />
          <Metric icon={RefreshCw} label="数据新鲜度" value={fitness.freshness === "high" ? "高" : "中"} />
          <Metric icon={ShieldAlert} label="风险扣分" value={`−${fitness.riskPenalty}`} />
          <Metric icon={UserCheck} label="人工复核率" value="85%" />
        </div>
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold text-[#2D3436]">关联证据</h3>
          {evidence.map((item) => (
            <article key={item.id} className="evidence-surface rounded-xl p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-[#52625B]">{item.id}</span>
                <EvidenceBadge level={item.level} compact />
              </div>
              <p className="text-sm font-medium text-[#2D3436]">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-[#636E72]">{item.excerpt}</p>
              <p className="mt-2 text-[11px] text-[#7D8B85]">{item.platform} · {item.date} · {item.isHuman ? "真人研究" : item.dataType === "syntheticSimulation" ? "模拟演示" : "可追溯观察"}</p>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return <div className="rounded-xl border border-[#DFE6E9] bg-white p-3"><Icon className="mb-2 h-4 w-4 text-[#5B8C5A]" /><p className="text-[11px] text-[#7D8B85]">{label}</p><p className="mt-0.5 text-lg font-semibold text-[#2D3436]">{value}</p></div>;
}
