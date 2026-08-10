import { EvidenceLevel } from "@/domain/types";

export type WorkspaceMode = "demo" | "real";
export type ProductTier = "quick" | "team" | "enterprise";
export type DecisionRecommendation = "continue" | "supplement" | "stop";
export type AssumptionCategory = "demand" | "product" | "technology" | "cost" | "supply" | "compliance" | "commercial";
export type ResultType = "human" | "sample" | "sales";

export interface DecisionProject {
  id: string;
  name: string;
  productIdea: string;
  targetUser: string;
  stage: string;
  nextAction: string;
  nextInvestmentAmount: number | null;
  investmentUnit: string;
  industryPack: string;
  owner: string;
  createdAt: string;
  isDemo: boolean;
}

export interface DecisionEvidence {
  id: string;
  title: string;
  source: string;
  level: EvidenceLevel;
  observedAt: string;
  sample: string;
  finding: string;
  scope: string;
  limitation: string;
  conflictsWith?: string;
  projectId: string;
  isDemo: boolean;
}

export interface CriticalAssumption {
  id: string;
  category: AssumptionCategory;
  statement: string;
  errorCost: string;
  errorCostAmount: number | null;
  evidenceIds: string[];
  evidenceGap: string;
  severity: "high" | "medium" | "low";
  status: "untested" | "testing" | "supported" | "rejected";
  projectId: string;
}

export interface NextBestTest {
  id: string;
  projectId: string;
  assumptionId: string;
  hypothesis: string;
  primaryVariable: string;
  baseline: string;
  controls: string[];
  budget: number;
  duration: string;
  sample: string;
  passThreshold: string;
  supplementThreshold: string;
  stopThreshold: string;
  status: "recommended" | "approved" | "running" | "completed";
  evidenceLevel: EvidenceLevel;
  isDigital: boolean;
}

export interface PreInvestmentDecision {
  id: string;
  projectId: string;
  decidedAt: string;
  recommendation: DecisionRecommendation;
  confidence: "low" | "medium" | "high";
  confidenceLimit: string;
  dangerousAssumptionIds: string[];
  evidenceIds: string[];
  testId: string;
  rationale: string;
  modelVersion: string;
  ruleVersion: string;
  owner: string;
  humanDecision: "pending" | DecisionRecommendation;
  humanNote: string;
}

export interface ResultFeedback {
  id: string;
  projectId: string;
  type: ResultType;
  recordedAt: string;
  summary: string;
  outcome: "supports" | "conflicts" | "unclear";
  source: string;
  ruleChange: string;
  isDemo: boolean;
}

export interface DecisionEngineState {
  mode: WorkspaceMode;
  tier: ProductTier;
  project: DecisionProject;
  evidence: DecisionEvidence[];
  assumptions: CriticalAssumption[];
  tests: NextBestTest[];
  decision: PreInvestmentDecision;
  results: ResultFeedback[];
  onboardingStep: number | null;
  onboardingCompleted: boolean;
}
