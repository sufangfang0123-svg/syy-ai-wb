export type WorkbenchStage = "overview" | "insight" | "concept" | "experiment" | "gate" | "content" | "feedback" | "decision";
export type WorkflowStatus = "pending" | "candidate" | "confirmed" | "rejected";
export type ReviewStatus = "pending" | "approved" | "changes" | "rejected";

export interface ProductConceptCandidate {
  id: string;
  opportunityId: string;
  name: string;
  targetUser: string;
  scenario: string;
  need: string;
  genes: string[];
  functions: string;
  material: string;
  specification: string;
  packaging: string;
  priceBand: string;
  sellingPoint: string;
  evidenceIds: string[];
  assumptionIds: string[];
  supplyRisk: string;
  complianceRisk: string;
  uniqueVariable: string;
  source: "fixed_demo" | "manual_import";
  version: number;
  originalSnapshot: string;
  status: "candidate" | "selected" | "rejected";
  locked: boolean;
  stale: boolean;
  selectionReason: string;
  updatedAt: string;
}

export interface ScenarioReview {
  scenarioId: string;
  conceptId: string;
  assumptionId: string;
  status: "unreviewed" | "shortlisted" | "validation" | "rejected";
  owner: string;
  note: string;
  stale: boolean;
  updatedAt: string;
}

export interface WorkbenchContentAsset {
  id: string;
  conceptId: string;
  productGene: string;
  evidenceIds: string[];
  channel: "小红书" | "抖音" | "电商" | "视频号" | "私域";
  contentGoal: string;
  audience: string;
  scenario: string;
  sellingPoint: string;
  version: number;
  variant: "A" | "B";
  originalText: string;
  editedText: string;
  cta: string;
  complianceRisk: string;
  reviewStatus: ReviewStatus;
  reviewNote: string;
  stale: boolean;
}

export interface FeedbackRecord {
  id: string;
  conceptId: string;
  contentAssetId: string;
  channel: WorkbenchContentAsset["channel"];
  impressions: number;
  clicks: number;
  interactions: number;
  saves: number;
  addToCart: number;
  conversions: number;
  userFeedback: string;
  theme: string;
  source: string;
  recordedAt: string;
  owner: string;
  dataNature: "demo" | "manual";
  assumptionId?: string;
}

export interface WorkbenchAuditEvent {
  id: string;
  action: string;
  object: string;
  summary: string;
  createdAt: string;
  source: "模拟产品工作台";
  isDemo: true;
}

export interface ProductWorkbenchState {
  selectedOpportunityId: string;
  opportunityStatus: Record<string, WorkflowStatus>;
  opportunityNotes: Record<string, string>;
  concepts: ProductConceptCandidate[];
  selectedConceptId: string;
  scenarioReviews: ScenarioReview[];
  contentAssets: WorkbenchContentAsset[];
  feedbackRecords: FeedbackRecord[];
  nextRoundItems: string[];
  revision: number;
  lastSavedAt: string;
  auditEvents: WorkbenchAuditEvent[];
}

export interface ExperimentScenario {
  id: string;
  conceptId: string;
  persona: string;
  sellingPoint: string;
  channel: string;
  cta: string;
  assumptionId: string;
  priority: number;
  rule: string;
  limitation: string;
}
