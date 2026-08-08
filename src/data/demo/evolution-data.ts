import {
  AuditLog,
  CalibrationResult,
  ClaimSpine,
  ContentAsset,
  DataReadinessItem,
  DataType,
  Evidence,
  EvidenceLevel,
  EvolutionState,
  GateDecision,
  Opportunity,
  ProductGenome,
  ProductVersion,
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
  ["C001", "差旅收纳讨论", "三天出差时，护理用品分散且占用包袋空间。", "social", "publicEvidence", "C", "2026-07-28", "差旅女性", "短期出差", "携带体积大", "negative", "小红书", false, { likes: 342, replies: 28 }, "https://www.xiaohongshu.com/", ["OP-01"]],
  ["C002", "运动后清洁讨论", "运动结束后希望用一套小体积用品快速完成擦拭和收纳。", "social", "publicEvidence", "C", "2026-07-25", "健身人群", "运动健身", "任务被分散", "negative", "抖音", false, { likes: 518, replies: 45 }, "https://www.douyin.com/", ["OP-01"]],
  ["B018", "随行用品真人访谈", "7名受访者中有5名将单手取用列为出行场景的关键体验。", "humanResearch", "humanResearch", "B", "2026-08-01", "通勤女性", "办公通勤", "取用步骤多", "neutral", "真人访谈", true, undefined, undefined, ["OP-01"]],
  ["C044", "电商组合装评价", "组合装方便一次购齐，但部分用户认为规格搭配不够灵活。", "social", "publicEvidence", "C", "2026-07-22", "理性消费者", "日常补给", "组合不灵活", "neutral", "电商", false, { likes: 86, replies: 14 }, "https://www.jd.com/", ["OP-01", "OP-03"]],
  ["C087", "价格讨论", "便携规格的单次价格较高，用户会比较常规装与分装方案。", "social", "publicEvidence", "C", "2026-07-20", "价格敏感人群", "差旅出行", "便携溢价", "negative", "知乎", false, { likes: 76, replies: 18 }, "https://www.zhihu.com/", ["OP-01", "OP-03"]],
  ["D012", "合成消费者压力测试", "模拟原型对79元价格的接受度分化明显，需要真人校准。", "syntheticAI", "syntheticSimulation", "D", "2026-08-08", "合成消费者原型", "价格选择", "价格接受度不确定", "neutral", "Synthetic Lab", false, undefined, undefined, ["OP-01"]],
  ["B026", "隐私体验访谈", "受访者更关注外出处理时的低打扰与独立收纳。", "humanResearch", "humanResearch", "B", "2026-08-02", "通勤白领", "办公区", "隐私处理不便", "negative", "真人访谈", true, undefined, undefined, ["OP-02"]],
  ["C031", "办公场景讨论", "在公共空间更换用品时，包装声音与后续处理会造成压力。", "social", "publicEvidence", "C", "2026-07-19", "办公人群", "公共空间", "更换体验受限", "negative", "微博", false, { likes: 132, replies: 21 }, "https://weibo.com/", ["OP-02"]],
  ["D032", "隐私包装反例测试", "过度隐蔽可能降低产品识别度，并增加材料使用。", "syntheticAI", "syntheticSimulation", "D", "2026-08-08", "合成消费者原型", "包装识别", "识别度与减量冲突", "neutral", "Synthetic Lab", false, undefined, undefined, ["OP-02"]],
  ["C055", "独立密封观察", "用户把独立密封视为安心线索，但未核验其技术含义。", "competitor", "publicEvidence", "C", "2026-07-16", "洁净敏感人群", "日常护理", "安心信息不足", "neutral", "竞品观察", false, undefined, undefined, ["OP-03"]],
  ["B041", "材质沟通问卷", "结构化问卷显示，清晰的材质事实比抽象功效词更易理解。", "humanResearch", "humanResearch", "B", "2026-08-03", "母婴家庭", "家庭补给", "信息难理解", "positive", "结构化问卷", true, undefined, undefined, ["OP-03"]],
  ["C063", "补充装讨论", "部分用户愿意保留外壳并购买补充装，但担心密封性能。", "social", "publicEvidence", "C", "2026-07-14", "环保关注人群", "家庭补给", "补充装密封顾虑", "neutral", "小红书", false, { likes: 228, replies: 32 }, "https://www.xiaohongshu.com/", ["OP-03"]],
  ["D071", "小包装供应链假设", "更小包装可能增加单件包装成本与工艺复杂度。", "syntheticAI", "syntheticSimulation", "D", "2026-08-08", "专家假设", "供应链", "成本与复杂度", "negative", "Demo AI", false, undefined, undefined, ["OP-01"]],
  ["C074", "周末出行清单", "用户倾向按天数准备用品，减少临时分装。", "social", "publicEvidence", "C", "2026-07-12", "周末出行人群", "周末出行", "分装费时", "positive", "抖音", false, { likes: 199, replies: 17 }, "https://www.douyin.com/", ["OP-01"]],
  ["B082", "概念卡片测试", "真人卡片排序中，便携与安心位列前两项，环保排在其后。", "humanResearch", "humanResearch", "B", "2026-08-04", "目标人群", "概念测试", "卖点优先级", "positive", "真人概念测试", true, undefined, undefined, ["OP-01", "OP-03"]],
  ["D090", "渠道表达模拟", "清单式表达便于理解，但需要避免把模拟结论写成事实。", "syntheticAI", "syntheticSimulation", "D", "2026-08-08", "合成消费者原型", "内容实验", "表达可信度", "neutral", "Content Lab", false, undefined, undefined, ["OP-01"]],
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
    evidenceLevel: "B",
    evidenceCoverage: 68,
    aiConfidence: 78,
    humanReviewRate: 85,
    fitness: 82,
    status: "validation",
    validationPool: true,
    gatePreview: ["PASS", "PASS", "WARNING", "WARNING", "PASS"],
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
    evidenceLevel: "B",
    evidenceCoverage: 46,
    aiConfidence: 71,
    humanReviewRate: 67,
    fitness: 69,
    status: "active",
    validationPool: false,
    gatePreview: ["PASS", "WARNING", "PASS", "WARNING", "WARNING"],
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
    evidenceLevel: "B",
    evidenceCoverage: 55,
    aiConfidence: 74,
    humanReviewRate: 76,
    fitness: 73,
    status: "active",
    validationPool: false,
    gatePreview: ["PASS", "PASS", "WARNING", "PASS", "WARNING"],
  },
];

const genomeValue = (category: keyof ProductGenome, id: string, label: string, selected = true, verified = true) => ({
  id,
  label,
  category,
  selected,
  locked: false,
  verified,
});

export const baseGenome: ProductGenome = {
  G1: [genomeValue("G1", "g1-1", "20—35岁差旅女性"), genomeValue("G1", "g1-2", "中等预算"), genomeValue("G1", "g1-3", "内容社区决策")],
  G2: [genomeValue("G2", "g2-1", "短期出差"), genomeValue("G2", "g2-2", "运动健身"), genomeValue("G2", "g2-3", "周末出行")],
  G3: [genomeValue("G3", "g3-1", "清洁"), genomeValue("G3", "g3-2", "擦干"), genomeValue("G3", "g3-3", "收纳"), genomeValue("G3", "g3-4", "补给")],
  G4: [genomeValue("G4", "g4-1", "全棉水刺"), genomeValue("G4", "g4-2", "Cotton Soft", false, false), genomeValue("G4", "g4-3", "密封结构待企业确认", true, false)],
  G5: [genomeValue("G5", "g5-1", "柔软触感"), genomeValue("G5", "g5-2", "单手取用"), genomeValue("G5", "g5-3", "小体积"), genomeValue("G5", "g5-4", "低打扰")],
  G6: [genomeValue("G6", "g6-1", "安心"), genomeValue("G6", "g6-2", "体面"), genomeValue("G6", "g6-3", "自主")],
  G7: [genomeValue("G7", "g7-1", "出行清单"), genomeValue("G7", "g7-2", "场景对比"), genomeValue("G7", "g7-3", "可视化收纳")],
  G8: [genomeValue("G8", "g8-1", "79元价格带", true, false), genomeValue("G8", "g8-2", "补充装"), genomeValue("G8", "g8-3", "包装减量", false)],
};

const score = (finalFitness: number, evidenceFactor: number, riskPenalty: number, evidenceCoverage: number) => ({
  dimensions: { demand: 86, pain: 82, brand: 88, differentiation: 77, communication: 84, supply: 69, commercial: 72, compliance: 76 },
  rawFitness: 81,
  evidenceFactor,
  riskPenalty,
  finalFitness,
  evidenceCoverage,
  freshness: "high" as const,
  evidenceIds: ["B018", "C001", "C044", "C087", "D012", "B082"],
});

const versions: ProductVersion[] = [
  { id: "PV-10", label: "V1.0", opportunityId: "OP-01", name: "随行护理组合", status: "eliminated", fitness: score(58, 0.63, 5, 38), evidenceLevel: "C", mutation: "初始概念", genome: baseGenome, createdAt: "2026-07-01", eliminatedBy: "V5 商业价值", learning: "模块过多导致价格与体积同时上升", revivable: true },
  { id: "PV-15", label: "V1.5", parentId: "PV-10", opportunityId: "OP-01", name: "随行护理轻组合", status: "eliminated", fitness: score(64, 0.68, 4, 44), evidenceLevel: "C", mutation: "减少非核心模块", genome: baseGenome, createdAt: "2026-07-08", eliminatedBy: "V4 供应链", learning: "特殊规格缺少现有产线验证", revivable: true },
  { id: "PV-20", label: "V2.0", parentId: "PV-15", opportunityId: "OP-01", name: "棉感随行胶囊", status: "eliminated", fitness: score(71, 0.72, 3, 51), evidenceLevel: "B", mutation: "按天组织模块", genome: baseGenome, createdAt: "2026-07-18", eliminatedBy: "V1 消费者价值", learning: "三天固定组合不适合全部旅程长度", revivable: true },
  { id: "PV-25", label: "V2.5", parentId: "PV-20", opportunityId: "OP-01", name: "棉感随行胶囊", status: "testing", fitness: score(76, 0.78, 2, 59), evidenceLevel: "B", mutation: "加入可选补给模块", genome: baseGenome, createdAt: "2026-07-28", learning: "模块化提高适配性，但价格仍需校准", revivable: true },
  { id: "PV-32", label: "V3.2", parentId: "PV-25", opportunityId: "OP-01", name: "棉感随行胶囊", status: "survivor", fitness: score(82, 0.84, 1, 68), evidenceLevel: "B", mutation: "单手取用与补充装", genome: baseGenome, createdAt: "2026-08-08", learning: "真人更重视便携与安心，环保应作为支撑卖点", revivable: true },
];

const gates: GateDecision[] = [
  { id: "V1", name: "消费者价值", mode: "soft", status: "PASS", aiRole: "整理需求证据与反例", owner: "商品经理", reason: "核心任务在真人访谈中重复出现", evidenceIds: ["B018", "B082"] },
  { id: "V2", name: "品牌匹配", mode: "soft", status: "PASS", aiRole: "按品牌规则进行预审", owner: "品牌团队", reason: "棉材质与随行场景具有关联", evidenceIds: ["B041", "C001"] },
  { id: "V3", name: "安全合规", mode: "hard", status: "WARNING", aiRole: "扫描缺证主张与风险措辞", owner: "质量 / 法务", reason: "密封结构和材料描述待企业技术确认", evidenceIds: ["C055"] },
  { id: "V4", name: "供应链", mode: "hard", status: "WARNING", aiRole: "识别工艺缺失项与风险", owner: "供应链团队", reason: "小规格包装需要产线与成本验证", evidenceIds: ["D071"] },
  { id: "V5", name: "商业价值", mode: "soft", status: "PASS", aiRole: "提供情景测算", owner: "业务 / 财务", reason: "采用区间情景，不使用单点销量承诺", evidenceIds: ["C087", "D012"] },
];

const calibrations: CalibrationResult[] = [
  { id: "CAL-01", metric: "便携偏好", syntheticValue: 78, humanValue: 72, unit: "%", conclusion: "方向一致，模拟略高估", action: "便携权重下调 3 个百分点", evidenceLevel: "B" },
  { id: "CAL-02", metric: "79元接受度", syntheticValue: 61, humanValue: 42, unit: "%", conclusion: "模型明显高估价格接受度", action: "降低价格接受度权重并增加价格分层访谈", evidenceLevel: "B" },
  { id: "CAL-03", metric: "安心卖点", syntheticValue: 66, humanValue: 70, unit: "%", conclusion: "真人重视程度略高", action: "将安心从辅助卖点调整为第二卖点", evidenceLevel: "B" },
];

const claims: ClaimSpine[] = [
  { claimId: "CLM-01", claimText: "模块化收纳，按旅程选择所需补给", evidenceIds: ["B018", "C001", "C074"], evidenceLevel: "B", approved: true, allowedChannels: ["小红书", "抖音", "电商", "私域"], prohibitedExpressions: ["适合所有人", "绝对省空间"], reviewStatus: "approved" },
  { claimId: "CLM-02", claimText: "单手取用，减少外出场景中的操作步骤", evidenceIds: ["B018", "B082"], evidenceLevel: "B", approved: true, allowedChannels: ["小红书", "视频号", "直播"], prohibitedExpressions: ["零负担", "完全静音"], reviewStatus: "approved" },
  { claimId: "CLM-03", claimText: "材料与密封信息清晰可追溯", evidenceIds: ["B041", "C055"], evidenceLevel: "B", approved: false, allowedChannels: ["电商"], prohibitedExpressions: ["医学功效", "绝对安全"], reviewStatus: "pending" },
];

const contentAssets: ContentAsset[] = [
  { id: "CA-01", channel: "小红书", claimId: "CLM-01", variant: "A", title: "三天两夜，我的护理包只留下这三个模块", structure: "场景问题 → 收纳对比 → 模块清单 → 证据说明", status: "approved", metricLabel: "模拟收藏倾向", metricValue: 68, dataType: "syntheticSimulation" },
  { id: "CA-02", channel: "小红书", claimId: "CLM-01", variant: "B", title: "出差不再临时分装：按天选择随行补给", structure: "准备时间 → 使用过程 → 补充装 → 验证邀请", status: "reviewed", metricLabel: "模拟收藏倾向", metricValue: 62, dataType: "syntheticSimulation" },
  { id: "CA-03", channel: "抖音", claimId: "CLM-02", variant: "A", title: "15秒单手取用对比实验", structure: "问题钩子 → 操作对比 → 事实字幕 → 真人验证说明", status: "approved", metricLabel: "模拟完播倾向", metricValue: 71, dataType: "syntheticSimulation" },
  { id: "CA-04", channel: "电商", claimId: "CLM-03", variant: "A", title: "材料、结构与适用边界说明", structure: "产品事实 → 结构拆解 → 待确认项 → 服务说明", status: "pending", metricLabel: "模拟理解度", metricValue: 73, dataType: "syntheticSimulation" },
];

const auditLogs: AuditLog[] = [
  { id: "AUD-01", action: "Mutation", createdAt: "2026-08-08 14:32", object: "PV-32", oldValue: "V2.5", newValue: "V3.2：加入单手取用", source: "Synthetic Simulation", aiGenerated: true },
  { id: "AUD-02", action: "Reality Check", createdAt: "2026-08-08 15:10", object: "CAL-02", oldValue: "价格接受度 61%", newValue: "真人结果 42%", source: "Human Research", aiGenerated: false },
  { id: "AUD-03", action: "Claim Review", createdAt: "2026-08-08 15:45", object: "CLM-03", oldValue: "自动生成", newValue: "待企业技术 / 合规确认", source: "Business Rule Engine", aiGenerated: true },
];

export const dataReadiness: DataReadinessItem[] = [
  { id: "DR-01", label: "官方公开资料", status: "ready", note: "已接入演示样例" },
  { id: "DR-02", label: "真人研究", status: "partial", note: "部分接入 / 演示" },
  { id: "DR-03", label: "社媒信号", status: "partial", note: "演示数据" },
  { id: "DR-04", label: "企业销售数据", status: "locked", note: "待企业授权" },
  { id: "DR-05", label: "会员行为", status: "locked", note: "待企业授权" },
  { id: "DR-06", label: "BOM 成本", status: "locked", note: "待企业授权" },
  { id: "DR-07", label: "真实投放 ROI", status: "locked", note: "待企业授权" },
];

export const demoEvolutionState: EvolutionState = {
  evidence: evidenceSeed,
  opportunities,
  versions,
  currentVersionId: "PV-32",
  gates,
  experiments: [
    { id: "EXP-037", round: 37, parentVersionId: "PV-25", experimentType: "genome", variable: "单手取用", hypothesis: "减少外出操作步骤", evidenceLevel: "D", result: "evolve", decision: "进入真人概念测试", nextVersionId: "PV-32", createdAt: "2026-08-08" },
  ],
  calibrations,
  claims,
  contentAssets,
  auditLogs,
  selectedOpportunityId: "OP-01",
  demoStep: null,
};
