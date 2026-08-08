import { demoEvolutionState } from "@/data/demo/evolution-data";
import { ClaimSpine, Evidence, Opportunity, ProductVersion } from "@/domain/types";
import { AIProvider } from "./ai-provider";

export class DemoAIProvider implements AIProvider {
  async analyzeSignals(evidence: Evidence[]) {
    return {
      themes: Array.from(new Set(evidence.map((item) => item.painPoint))).slice(0, 5),
      riskFlags: ["模拟结果不可外推", "价格接受度需要真人校准"],
    };
  }

  async clusterOpportunities(): Promise<Opportunity[]> {
    return structuredClone(demoEvolutionState.opportunities);
  }

  async generateConcept(opportunity: Opportunity): Promise<ProductVersion> {
    const base = structuredClone(demoEvolutionState.versions.at(-1)!);
    return { ...base, id: `PV-${Date.now()}`, opportunityId: opportunity.id, status: "testing" };
  }

  async reviewConcept(): Promise<{ issues: string[]; requiresHumanApproval: boolean }> {
    return { issues: ["材料与密封结构待企业确认", "价格接受度需真人验证"], requiresHumanApproval: true };
  }

  async generateContent(claim: ClaimSpine, channel: string) {
    return { title: `${channel}｜${claim.claimText}`, structure: "场景问题 → 产品事实 → 证据边界 → 验证邀请" };
  }
}
