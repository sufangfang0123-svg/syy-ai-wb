import { DecisionEngineState } from "@/domain/decision-types";

export const demoDecisionState: DecisionEngineState = {
  mode: "demo",
  tier: "quick",
  project: {
    id: "COT-DEMO-001",
    name: "棉感随行胶囊投前判断",
    productIdea: "为三天差旅场景设计按天组织的棉品护理组合",
    targetUser: "20—35岁、每季度至少有一次短途差旅的女性",
    stage: "第一轮概念完成，准备包装打样",
    nextAction: "支付第二轮包装结构与密封样品费",
    nextInvestmentAmount: 18000,
    investmentUnit: "人民币",
    industryPack: "棉生万物·棉品行业验证包",
    owner: "产品负责人（演示）",
    createdAt: "2026-08-08",
    isDemo: true,
  },
  evidence: [
    { id: "B018", title: "模拟访谈夹具：随行用品", source: "固定脱敏演示设定（非真实访谈）", level: "B", observedAt: "2026-08-01", sample: "系统演示夹具", finding: "夹具设定把单手取用列为关键体验。", scope: "仅用于展示短途差旅与通勤的分析流程", limitation: "没有真实受访者、样本或付费意愿证据。", projectId: "COT-DEMO-001", isDemo: true },
    { id: "C087", title: "便携规格价格讨论", source: "公开评论脱敏样例", level: "C", observedAt: "2026-07-20", sample: "公开讨论样例", finding: "用户会比较常规装、分装和便携装的单次成本。", scope: "用于形成价格假设", limitation: "公开互动不等于购买行为。", projectId: "COT-DEMO-001", isDemo: true },
    { id: "C044", title: "组合装体验反馈", source: "公开电商评论脱敏样例", level: "C", observedAt: "2026-07-22", sample: "公开评论样例", finding: "一次购齐方便，但固定组合可能不够灵活。", scope: "组合规格设计", limitation: "缺少订单和复购数据。", conflictsWith: "B018", projectId: "COT-DEMO-001", isDemo: true },
    { id: "D012", title: "79元价格压力测试（模拟夹具）", source: "固定合成情景", level: "D", observedAt: "2026-08-08", sample: "系统演示夹具", finding: "预置情景显示价格选择可能分化。", scope: "只用于演示寻找反例", limitation: "不是访谈、样品测试或真实购买。", projectId: "COT-DEMO-001", isDemo: true },
  ],
  assumptions: [
    { id: "ASM-COST-01", category: "cost", statement: "目标用户愿意为三天按日组合与单手取用支付便携溢价。", errorCost: "若错误，包装开模与首批备货将建立在错误价格带上。", errorCostAmount: 118000, evidenceIds: ["C087", "D012"], evidenceGap: "缺少真人价格选择与真实下单行为。", severity: "high", status: "untested", projectId: "COT-DEMO-001" },
    { id: "ASM-PROD-02", category: "product", statement: "按日组合比用户自行分装更省事。", errorCost: "若错误，产品结构复杂度无法带来可感知价值。", errorCostAmount: 36000, evidenceIds: ["B018", "C044"], evidenceGap: "缺少可操作原型的任务对照。", severity: "medium", status: "testing", projectId: "COT-DEMO-001" },
    { id: "ASM-SUP-03", category: "supply", statement: "小体积独立密封结构能在目标成本内稳定生产。", errorCost: "若错误，将增加材料、良率和交付周期风险。", errorCostAmount: 52000, evidenceIds: [], evidenceGap: "缺少供应商报价和密封样品数据。", severity: "high", status: "untested", projectId: "COT-DEMO-001" },
  ],
  tests: [
    { id: "NBT-COT-001", projectId: "COT-DEMO-001", assumptionId: "ASM-COST-01", hypothesis: "在相同内容物下，按日组合方案能获得足以支持便携溢价的真人选择。", primaryVariable: "包装组织方式：按日组合 vs 普通分装", baseline: "同内容物、普通透明分装袋、59元", controls: ["内容物数量一致", "视觉风格一致", "说明文案一致", "不展示品牌"], budget: 1200, duration: "3个工作日", sample: "计划招募24名目标用户进行受控概念选择", passThreshold: "至少60%选择按日组合，且价格理由不是促销。", supplementThreshold: "40%—59%选择，需要补充价格或场景证据。", stopThreshold: "低于40%选择，暂停包装开模。", status: "proposed", evidenceLevel: "B", isDigital: false },
  ],
  decision: {
    id: "DEC-COT-001", projectId: "COT-DEMO-001", decidedAt: "2026-08-08", recommendation: "supplement", confidence: "medium", confidenceLimit: "模拟场景夹具尚缺付费与供应链证据，不能支持包装开模。", dangerousAssumptionIds: ["ASM-COST-01", "ASM-SUP-03"], evidenceIds: ["B018", "C087", "C044", "D012"], testId: "NBT-COT-001", rationale: "下一笔1.8万元将固化包装方向；固定演示夹具已记录1200元真人概念选择方案，实际执行、金额和顺序由责任人确认。", modelVersion: "DEMO_FIXTURE_V0.3.1", ruleVersion: "DEMO_RULE_R1（非真实Gate）", owner: "产品负责人（演示）", humanDecision: "pending", humanNote: "等待责任人确认。",
  },
  results: [],
  auditLogs: [],
  onboardingStep: null,
  onboardingCompleted: false,
};
