"use client";

import { EVIDENCE_LEVELS } from "@/domain/constants";
import { EvidenceLevel } from "@/domain/types";
import { ShieldCheck } from "lucide-react";

const styles: Record<EvidenceLevel, string> = {
  A: "border-[#315C46] bg-[#315C46] text-white",
  B: "border-[#87BFA0] bg-[#DCEFE3] text-[#315C46]",
  C: "border-[#91B8D8] bg-[#EAF3FA] text-[#315F7D]",
  D: "border-[#C8CED0] bg-[#F0F1F1] text-[#636E72]",
};

export function EvidenceBadge({ level, compact = false }: { level: EvidenceLevel; compact?: boolean }) {
  const meta = EVIDENCE_LEVELS[level];
  return (
    <span
      tabIndex={0}
      aria-label={`${level}级证据：${meta.definition}`}
      title={`${meta.definition}\n可用于：${meta.decision}\n限制：${meta.limitation}`}
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"} ${styles[level]}`}
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {level}级
    </span>
  );
}
