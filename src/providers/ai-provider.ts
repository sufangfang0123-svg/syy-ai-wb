import { ClaimSpine, Evidence, Opportunity, ProductVersion } from "@/domain/types";

export interface AIProvider {
  analyzeSignals(evidence: Evidence[]): Promise<{ themes: string[]; riskFlags: string[] }>;
  clusterOpportunities(evidence: Evidence[]): Promise<Opportunity[]>;
  generateConcept(opportunity: Opportunity): Promise<ProductVersion>;
  reviewConcept(version: ProductVersion): Promise<{ issues: string[]; requiresHumanApproval: boolean }>;
  generateContent(claim: ClaimSpine, channel: string): Promise<{ title: string; structure: string }>;
}
