import { DataType, EvidenceLevel } from "./types";

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
    definition: "合成情景、专家假设、演示测算或固定测试夹具",
    decision: "仅用于预筛、压力测试和寻找反例",
    limitation: "不代表真实消费者预测或商业结果",
  },
};

export const DEMO_DISCLAIMER = "D级模拟演示，仅用于预筛与流程验证，不构成真实市场预测或商业承诺。";

export const DATA_TYPE_LABELS: Record<DataType, string> = {
  publicEvidence: "公开证据",
  humanResearch: "真人研究",
  enterpriseData: "企业数据",
  syntheticSimulation: "合成模拟",
};
