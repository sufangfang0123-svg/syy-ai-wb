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

export type ReviewStatus = "pending" | "reviewed" | "approved" | "rejected";
export type OpportunityStatus = "active" | "validation" | "concept" | "rejected";
export type GateStatus = "PASS" | "WARNING" | "FAIL";
export type GateMode = "hard" | "soft";
export type VersionStatus = "survivor" | "testing" | "eliminated";

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

export type FitnessDimensionKey =
  | "demand"
  | "pain"
  | "brand"
  | "differentiation"
  | "communication"
  | "supply"
  | "commercial"
  | "compliance";

export interface FitnessDimensions {
  demand: number;
  pain: number;
  brand: number;
  differentiation: number;
  communication: number;
  supply: number;
  commercial: number;
  compliance: number;
}

export interface FitnessScore {
  dimensions: FitnessDimensions;
  rawFitness: number;
  evidenceFactor: number;
  riskPenalty: number;
  finalFitness: number;
  evidenceCoverage: number;
  freshness: "high" | "medium" | "low";
  evidenceIds: string[];
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
  evidenceLevel: EvidenceLevel;
  evidenceCoverage: number;
  aiConfidence: number;
  humanReviewRate: number;
  fitness: number;
  status: OpportunityStatus;
  validationPool: boolean;
  gatePreview: GateStatus[];
}

export type GenomeCategory = "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7" | "G8";

export interface GenomeValue {
  id: string;
  label: string;
  category: GenomeCategory;
  selected: boolean;
  locked: boolean;
  verified: boolean;
}

export interface ProductGenome {
  G1: GenomeValue[];
  G2: GenomeValue[];
  G3: GenomeValue[];
  G4: GenomeValue[];
  G5: GenomeValue[];
  G6: GenomeValue[];
  G7: GenomeValue[];
  G8: GenomeValue[];
}

export interface ProductVersion {
  id: string;
  label: string;
  parentId?: string;
  opportunityId: string;
  name: string;
  status: VersionStatus;
  fitness: FitnessScore;
  evidenceLevel: EvidenceLevel;
  mutation: string;
  genome: ProductGenome;
  createdAt: string;
  eliminatedBy?: string;
  learning?: string;
  revivable: boolean;
}

export interface GateDecision {
  id: "V1" | "V2" | "V3" | "V4" | "V5";
  name: string;
  mode: GateMode;
  status: GateStatus;
  aiRole: string;
  owner: string;
  reason: string;
  evidenceIds: string[];
}

export type ExperimentStage = "concept" | "genome" | "content" | "business" | "reality";

export interface Experiment {
  id: string;
  round: number;
  parentVersionId: string;
  experimentType: ExperimentStage;
  variable: string;
  hypothesis: string;
  evidenceLevel: EvidenceLevel;
  result: "pending" | "survive" | "evolve" | "eliminate";
  decision: string;
  nextVersionId?: string;
  createdAt: string;
}

export interface CalibrationResult {
  id: string;
  metric: string;
  syntheticValue: number;
  humanValue: number;
  unit: "%" | "score";
  conclusion: string;
  action: string;
  evidenceLevel: EvidenceLevel;
}

export interface ClaimSpine {
  claimId: string;
  claimText: string;
  evidenceIds: string[];
  evidenceLevel: EvidenceLevel;
  approved: boolean;
  allowedChannels: string[];
  prohibitedExpressions: string[];
  reviewStatus: ReviewStatus;
}

export interface ContentAsset {
  id: string;
  channel: "小红书" | "抖音" | "视频号" | "电商" | "直播" | "私域";
  claimId: string;
  variant: "A" | "B";
  title: string;
  structure: string;
  status: ReviewStatus;
  metricLabel: string;
  metricValue: number;
  dataType: DataType;
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

export interface DataReadinessItem {
  id: string;
  label: string;
  status: "ready" | "partial" | "locked";
  note: string;
}

export interface EvolutionState {
  evidence: Evidence[];
  opportunities: Opportunity[];
  versions: ProductVersion[];
  currentVersionId: string;
  gates: GateDecision[];
  experiments: Experiment[];
  calibrations: CalibrationResult[];
  claims: ClaimSpine[];
  contentAssets: ContentAsset[];
  auditLogs: AuditLog[];
  selectedOpportunityId: string;
  demoStep: number | null;
}

export interface MutationInput {
  category: GenomeCategory;
  valueId: string;
  label: string;
  impacts: Partial<Record<FitnessDimensionKey, number>>;
}
