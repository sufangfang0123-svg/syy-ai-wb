import {
  AuditLog,
  DataType,
  Evidence,
  EvidenceLevel,
  EvolutionState,
  Opportunity,
  SourceType,
} from "@/domain/types";

type EvidenceSeedRow = [
  string,
  string,
  string,
  SourceType,
  DataType,
  EvidenceLevel,
  string,
  string,
  string,
  string,
  Evidence["sentiment"],
  string,
  boolean,
  Evidence["engagement"] | undefined,
  string | undefined,
  string[]
];

const evidenceRows: EvidenceSeedRow[] = [
  ["C001", "模拟公开信号夹具：差旅收纳讨论", "固定演示摘录：三天出差时，护理用品分散且占用包袋空间。", "social", "publicEvidence", "C", "2026-07-28", "模拟差旅人群", "短期出差", "携带体积大", "negative", "模拟内容社区字段", false, { likes: 342, replies: 28 }, undefined, ["OP-01"]],
  ["C002", "模拟公开信号夹具：运动后清洁讨论", "固定演示摘录：运动结束后希望用一套小体积用品快速完成擦拭和收纳。", "social", "publicEvidence", "C", "2026-07-25", "模拟健身人群", "运动健身", "任务被分散", "negative", "模拟短视频字段", false, { likes: 518, replies: 45 }, undefined, ["OP-01"]],
  ["B018", "模拟访谈夹具：随行用品", "固定脱敏夹具设定把单手取用列为出行场景的关键体验；并非真实访谈结果。", "humanResearch", "humanResearch", "B", "2026-08-01", "模拟通勤人群", "办公通勤", "取用步骤多", "neutral", "模拟人研夹具", true, undefined, undefined, ["OP-01"]],
  ["C044", "模拟公开信号夹具：组合装评价", "固定演示摘录：组合装方便一次购齐，但规格搭配可能不够灵活。", "social", "publicEvidence", "C", "2026-07-22", "模拟理性消费者", "日常补给", "组合不灵活", "neutral", "模拟电商字段", false, { likes: 86, replies: 14 }, undefined, ["OP-01", "OP-03"]],
  ["C087", "模拟公开信号夹具：价格讨论", "固定演示摘录：用户会比较常规装、分装和便携规格的单次成本。", "social", "publicEvidence", "C", "2026-07-20", "模拟价格敏感人群", "差旅出行", "便携溢价", "negative", "模拟问答社区字段", false, { likes: 76, replies: 18 }, undefined, ["OP-01", "OP-03"]],
  ["D012", "模拟价格压力情景", "固定合成情景显示79元价格选择分化，只用于展示反例处理。", "syntheticAI", "syntheticSimulation", "D", "2026-08-08", "模拟消费者原型", "价格选择", "价格接受度不确定", "neutral", "固定情景夹具", false, undefined, undefined, ["OP-01"]],
  ["B026", "模拟访谈夹具：隐私体验", "固定脱敏夹具设定关注外出处理时的低打扰与独立收纳；并非真实访谈结果。", "humanResearch", "humanResearch", "B", "2026-08-02", "模拟通勤人群", "办公区", "隐私处理不便", "negative", "模拟人研夹具", true, undefined, undefined, ["OP-02"]],
  ["C031", "模拟公开信号夹具：办公场景", "固定演示摘录：公共空间中的包装声音与后续处理可能造成压力。", "social", "publicEvidence", "C", "2026-07-19", "模拟办公人群", "公共空间", "更换体验受限", "negative", "模拟社交媒体字段", false, { likes: 132, replies: 21 }, undefined, ["OP-02"]],
  ["D032", "模拟隐私包装反例", "固定情景假设：过度隐蔽可能降低产品识别度，并增加材料使用。", "syntheticAI", "syntheticSimulation", "D", "2026-08-08", "模拟消费者原型", "包装识别", "识别度与减量冲突", "neutral", "固定情景夹具", false, undefined, undefined, ["OP-02"]],
  ["C055", "独立密封观察", "用户把独立密封视为安心线索，但未核验其技术含义。", "competitor", "publicEvidence", "C", "2026-07-16", "洁净敏感人群", "日常护理", "安心信息不足", "neutral", "竞品观察", false, undefined, undefined, ["OP-03"]],
  ["B041", "模拟问卷夹具：材质沟通", "固定演示设定用于展示材质事实与抽象功效词的理解差异；并非真实问卷结果。", "humanResearch", "humanResearch", "B", "2026-08-03", "模拟家庭人群", "家庭补给", "信息难理解", "positive", "模拟人研夹具", true, undefined, undefined, ["OP-03"]],
  ["C063", "模拟公开信号夹具：补充装讨论", "固定演示摘录：保留外壳并购买补充装的同时，也会担心密封性能。", "social", "publicEvidence", "C", "2026-07-14", "模拟环保关注人群", "家庭补给", "补充装密封顾虑", "neutral", "模拟内容社区字段", false, { likes: 228, replies: 32 }, undefined, ["OP-03"]],
  ["D071", "模拟供应链反例夹具", "固定情景假设：更小包装可能增加单件包装成本与工艺复杂度。", "syntheticAI", "syntheticSimulation", "D", "2026-08-08", "演示专家假设", "供应链", "成本与复杂度", "negative", "固定情景夹具", false, undefined, undefined, ["OP-01"]],
  ["C074", "模拟公开信号夹具：周末出行清单", "固定演示摘录：按天数准备用品可能减少临时分装。", "social", "publicEvidence", "C", "2026-07-12", "模拟周末出行人群", "周末出行", "分装费时", "positive", "模拟短视频字段", false, { likes: 199, replies: 17 }, undefined, ["OP-01"]],
  ["B082", "模拟概念测试夹具", "固定演示设定把便携与安心放在前两项；并非真实受访者排序。", "humanResearch", "humanResearch", "B", "2026-08-04", "模拟目标人群", "概念测试", "卖点优先级", "positive", "模拟人研夹具", true, undefined, undefined, ["OP-01", "OP-03"]],
  ["D090", "模拟渠道表达夹具", "固定情景展示清单式表达，同时明确模拟结论不能写成事实。", "syntheticAI", "syntheticSimulation", "D", "2026-08-08", "模拟消费者原型", "内容实验", "表达可信度", "neutral", "固定内容夹具", false, undefined, undefined, ["OP-01"]],
];

const evidenceSeed: Evidence[] = evidenceRows.map((row) => {
  const [id, title, excerpt, sourceType, dataType, level, date, persona, scenario, painPoint, sentiment, platform, isHuman, engagement, sourceUrl, opportunityIds] = row;
  return {
    id,
    title,
    excerpt,
    sourceType,
    dataType,
    level,
    date,
    persona,
    scenario,
    painPoint,
    sentiment,
    platform,
    isHuman,
    engagement,
    sourceUrl,
    reviewed: level !== "D",
    opportunityIds: opportunityIds ?? [],
  };
});

const opportunities: Opportunity[] = [
  {
    id: "OP-01",
    name: "年轻女性随行护理",
    persona: "20—35岁差旅女性与健身人群",
    scenario: "短期出差、运动、周末出行",
    jtbd: "在有限包袋空间中完成三天的清洁、擦干与补给",
    painPoint: "现有用品规格分散、占用空间且临时分装费时",
    alternative: "购买常规装后自行分装，或使用酒店与健身房用品",
    hypothesis: "按天组织的小体积模块能降低准备成本并提升外出取用效率",
    evidenceIds: ["C001", "C002", "B018", "C044", "C087", "D012", "C074", "B082"],
    counterEvidence: [
      { id: "CE-01", statement: "便携规格可能被认为容量不足或单价偏高", alternative: "自备分装袋", nonPurchaseReason: "已有低成本替代方案", riskyAssumption: "用户愿意为收纳效率支付溢价", evidenceId: "C087" },
      { id: "CE-02", statement: "小包装会增加工艺复杂度", alternative: "维持常规规格", nonPurchaseReason: "供应链成本可能转嫁至售价", riskyAssumption: "包装缩小不会影响材料与密封", evidenceId: "D071" },
    ],
    missingEvidence: ["真实目标人群的购买或使用行为", "小规格密封与成本验证", "价格带分层验证"],
    owner: "产品负责人（模拟自述）",
  },
  {
    id: "OP-02",
    name: "低打扰更换方案",
    persona: "通勤白领与高频差旅人群",
    scenario: "办公区与公共空间",
    jtbd: "在非居家场景下快速、体面地完成更换与处理",
    painPoint: "包装声音、收纳和处理流程会产生额外压力",
    alternative: "使用普通收纳袋或延后处理",
    hypothesis: "低打扰包装与独立处理袋可改善外出体验",
    evidenceIds: ["B026", "C031", "D032"],
    counterEvidence: [{ id: "CE-03", statement: "过度隐蔽可能降低识别度并增加材料", alternative: "普通独立包装", nonPurchaseReason: "不愿为包装功能加价", riskyAssumption: "隐私价值高于减量诉求", evidenceId: "D032" }],
    missingEvidence: ["公共空间任务的真实频次", "包装减量与低打扰的权衡", "支付意愿"],
    owner: "产品负责人（模拟自述）",
  },
  {
    id: "OP-03",
    name: "可解释安心体系",
    persona: "母婴家庭与洁净敏感人群",
    scenario: "家庭补给与外出携带",
    jtbd: "快速理解材料、密封状态和适用边界",
    painPoint: "包装信息难以区分材料事实、体验描述与待验证主张",
    alternative: "依赖品牌熟悉度或自行查找资料",
    hypothesis: "统一事实标签与可追溯说明能降低理解成本",
    evidenceIds: ["C055", "B041", "C063", "B082"],
    counterEvidence: [{ id: "CE-04", statement: "信息过多可能增加阅读负担", alternative: "保持简洁包装", nonPurchaseReason: "用户未必主动查看", riskyAssumption: "透明信息一定提升选择意愿", evidenceId: "C055" }],
    missingEvidence: ["信息标签理解测试", "技术条款与检测范围", "信息密度对选择的影响"],
    owner: "产品负责人（模拟自述）",
  },
];

const auditLogs: AuditLog[] = [
  { id: "AUD-01", action: "Fixture Loaded", createdAt: "2026-08-08 14:32", object: "DEMO-OPPORTUNITY-SET", oldValue: "无", newValue: "加载固定机会夹具；尚未人工复核", source: "System Demo Fixture", aiGenerated: false },
];

export const demoEvolutionState: EvolutionState = {
  evidence: evidenceSeed,
  opportunities,
  auditLogs,
  selectedOpportunityId: "OP-01",
  demoStep: null,
};
