export type EvidenceLevel = "A" | "B" | "C" | "D";

export type SourceType =
  | "enterprise"
  | "humanResearch"
  | "official"
  | "academic"
  | "social"
  | "competitor"
  | "syntheticAI";

export type DataType =
  | "publicEvidence"
  | "humanResearch"
  | "enterpriseData"
  | "syntheticSimulation";

export interface Evidence {
  id: string;
  title: string;
  excerpt: string;
  sourceType: SourceType;
  dataType: DataType;
  level: EvidenceLevel;
  date: string;
  persona: string;
  scenario: string;
  painPoint: string;
  sentiment: "positive" | "neutral" | "negative";
  platform: string;
  engagement?: { likes: number; replies: number };
  isHuman: boolean;
  sourceUrl?: string;
  reviewed: boolean;
  opportunityIds: string[];
}

export interface CounterEvidence {
  id: string;
  statement: string;
  alternative: string;
  nonPurchaseReason: string;
  riskyAssumption: string;
  evidenceId: string;
}

export interface Opportunity {
  id: string;
  name: string;
  persona: string;
  scenario: string;
  jtbd: string;
  painPoint: string;
  alternative: string;
  hypothesis: string;
  evidenceIds: string[];
  counterEvidence: CounterEvidence[];
  missingEvidence: string[];
  owner: string;
}

export interface AuditLog {
  id: string;
  action: string;
  createdAt: string;
  object: string;
  oldValue: string;
  newValue: string;
  source: string;
  aiGenerated: boolean;
}

export interface EvolutionState {
  evidence: Evidence[];
  opportunities: Opportunity[];
  auditLogs: AuditLog[];
  selectedOpportunityId: string;
  demoStep: number | null;
}
