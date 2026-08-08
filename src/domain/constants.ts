import { DataType, EvidenceLevel, FitnessDimensionKey, GenomeCategory } from "./types";

export const EVIDENCE_LEVELS: Record<
  EvidenceLevel,
  { coefficient: number; definition: string; decision: string; limitation: string }
> = {
  A: {
    coefficient: 1,
    definition: "企业经营、真实成交或重复行为实验",
    decision: "可支持试产与规模化决策",
    limitation: "仍需持续监测时效与样本偏差",
  },
  B: {
    coefficient: 0.75,
    definition: "真人访谈、结构化问卷、真人 A/B 或官方统计",
    decision: "可支持概念验证与小规模试点",
    limitation: "不能直接外推为全市场表现",
  },
  C: {
    coefficient: 0.5,
    definition: "公开评论、社媒信号、竞品观察或专业研究",
    decision: "用于发现机会和形成待验证假设",
    limitation: "存在平台偏差与身份不可核验问题",
  },
  D: {
    coefficient: 0.25,
    definition: "AI 模拟、专家假设、演示测算或合成测试",
    decision: "仅用于预筛、压力测试和寻找反例",
    limitation: "不代表真实消费者预测或商业结果",
  },
};

export const FITNESS_LABELS: Record<FitnessDimensionKey, string> = {
  demand: "需求真实度",
  pain: "痛点强度",
  brand: "品牌匹配",
  differentiation: "差异化",
  communication: "传播潜力",
  supply: "供应链可行",
  commercial: "商业潜力",
  compliance: "合规可控",
};

export const GENOME_LABELS: Record<GenomeCategory, { title: string; subtitle: string }> = {
  G1: { title: "人群基因", subtitle: "年龄、阶段、预算、渠道" },
  G2: { title: "场景基因", subtitle: "通勤、旅行、运动、居家" },
  G3: { title: "任务基因", subtitle: "清洁、擦干、收纳、补给" },
  G4: { title: "材料与技术", subtitle: "已知事实与待企业确认" },
  G5: { title: "体验基因", subtitle: "触感、尺寸、静音、便携" },
  G6: { title: "情绪基因", subtitle: "安心、体面、松弛、自主" },
  G7: { title: "传播基因", subtitle: "对比、场景、清单、分享" },
  G8: { title: "商业与可持续", subtitle: "价格、复购、包装、系列" },
};

export const DEMO_DISCLAIMER = "D级模拟演示，仅用于预筛与流程验证，不构成真实市场预测或商业承诺。";

export const DATA_TYPE_LABELS: Record<DataType, string> = {
  publicEvidence: "公开证据",
  humanResearch: "真人研究",
  enterpriseData: "企业数据",
  syntheticSimulation: "合成模拟",
};
