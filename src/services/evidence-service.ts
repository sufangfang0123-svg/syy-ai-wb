import { Evidence, EvidenceLevel, Opportunity } from "@/domain/types";

const rank: EvidenceLevel[] = ["D", "C", "B", "A"];

export function getOpportunityEvidence(opportunity: Opportunity, evidence: Evidence[]): Evidence[] {
  return evidence.filter((item) => opportunity.evidenceIds.includes(item.id));
}

export function getUpgradeRequirements(level: EvidenceLevel): string[] {
  if (level === "D") return ["补充可追溯的公开观察", "检查至少一项反向证据", "完成一次人工复核"];
  if (level === "C") return ["完成不少于10名真人访谈", "使用结构化问题验证", "检查至少一项反向证据"];
  if (level === "B") return ["接入真实成交或重复行为", "完成小规模业务试点", "记录复购或持续使用"];
  return ["持续监测数据新鲜度", "复查样本偏差", "保留重大决策审计记录"];
}

export function nextEvidenceLevel(level: EvidenceLevel): EvidenceLevel {
  return rank[Math.min(rank.length - 1, rank.indexOf(level) + 1)];
}
