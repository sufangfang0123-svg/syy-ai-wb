import { EvidenceLevel } from "@/domain/types";
import { getUpgradeRequirements, nextEvidenceLevel } from "@/services/evidence-service";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { EvidenceBadge } from "./evidence-badge";

export function EvidenceUpgradePath({ level, completed = 1 }: { level: EvidenceLevel; completed?: number }) {
  const next = nextEvidenceLevel(level);
  const requirements = getUpgradeRequirements(level);
  return (
    <section className="evidence-surface rounded-2xl p-4" aria-labelledby="evidence-upgrade-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p id="evidence-upgrade-title" className="text-sm font-semibold text-[#2D3436]">证据升级路径</p>
          <p className="text-xs text-[#636E72]">系统指导团队补齐下一阶段决策依据</p>
        </div>
        <div className="flex items-center gap-2">
          <EvidenceBadge level={level} compact />
          <ArrowRight className="h-4 w-4 text-[#7D8B85]" />
          <EvidenceBadge level={next} compact />
        </div>
      </div>
      <div className="space-y-2">
        {requirements.map((requirement, index) => (
          <div key={requirement} className="flex items-start gap-2 text-xs text-[#44504C]">
            {index < completed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5B8C5A]" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[#A7B1AD]" />}
            <span>{requirement}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
