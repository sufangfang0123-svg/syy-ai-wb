import type { ExperimentScenario, ProductWorkbenchState, WorkbenchContentAsset } from "@/domain/product-workbench-types";

const concept = (input: Omit<ProductWorkbenchState["concepts"][number], "originalSnapshot">): ProductWorkbenchState["concepts"][number] => ({
  ...input,
  originalSnapshot: JSON.stringify(input),
});

export const productConceptFixtures: ProductWorkbenchState["concepts"] = [
  concept({ id: "PC-01", opportunityId: "OP-01", name: "棉感随行胶囊 · 模块版", targetUser: "20—35岁短途差旅与通勤女性", scenario: "三天内差旅、健身后与临时补给", need: "减少分装与携带体积，同时保留清洁和收纳边界", genes: ["全棉水刺", "模块化", "单手取用", "补充芯"], functions: "洁面、擦拭、低打扰收纳", material: "全棉水刺材料假设，需企业技术确认", specification: "三枚可选模块，每枚独立密封", packaging: "掌心盒体 + 可替换补充芯", priceBand: "69—89元假设", sellingPoint: "按旅程选择所需模块", evidenceIds: ["B018", "C001", "C044"], assumptionIds: ["ASM-DEMAND-01", "ASM-PRODUCT-01"], supplyRisk: "小规格密封线与组合装工时待验证", complianceRisk: "材料与密封表述不得超出检测范围", uniqueVariable: "模块可选性", source: "fixed_demo", version: 1, status: "selected", locked: true, stale: false, selectionReason: "保留适配不同旅程长度的能力，同时缩小首轮验证范围。", updatedAt: "2026-08-16 09:30" }),
  concept({ id: "PC-02", opportunityId: "OP-01", name: "棉感随行胶囊 · 三日定量版", targetUser: "20—35岁三天差旅女性", scenario: "固定三天两夜出行", need: "一次装齐，不需要逐项选择", genes: ["全棉水刺", "定量组合", "日期标识", "一次购齐"], functions: "按日分装、洁面与擦拭", material: "全棉水刺材料假设，需企业技术确认", specification: "DAY 1—3 三袋定量组合", packaging: "扁平三联袋", priceBand: "59—79元假设", sellingPoint: "三天用量一次装齐", evidenceIds: ["C001", "B018"], assumptionIds: ["ASM-DEMAND-01"], supplyRisk: "固定用量可能造成浪费", complianceRisk: "用量说明仅为演示设定", uniqueVariable: "固定三日用量", source: "fixed_demo", version: 1, status: "candidate", locked: false, stale: false, selectionReason: "", updatedAt: "2026-08-16 09:30" }),
  concept({ id: "PC-03", opportunityId: "OP-01", name: "棉感随行胶囊 · 轻量收纳版", targetUser: "已有常用品、只缺收纳工具的人群", scenario: "自主分装与反复出行", need: "保留原用品，只解决携带与分类问题", genes: ["可重复盒体", "标签系统", "自主分装", "减量结构"], functions: "分类、压缩与补给提醒", material: "可重复盒体材料待选", specification: "空盒 + 三类标签袋", packaging: "可重复使用硬盒", priceBand: "39—59元假设", sellingPoint: "不替换用品，只整理旅程", evidenceIds: ["C044", "C087"], assumptionIds: ["ASM-COMMERCIAL-01"], supplyRisk: "盒体耐用性与清洁责任待验证", complianceRisk: "不得暗示分装后仍具原包装卫生保证", uniqueVariable: "仅提供收纳、不含棉品", source: "fixed_demo", version: 1, status: "candidate", locked: false, stale: false, selectionReason: "", updatedAt: "2026-08-16 09:30" }),
];

const channelSeeds: Array<[WorkbenchContentAsset["channel"], string, string, string]> = [
  ["小红书", "收藏与清单理解", "三天两夜，只带真正会用到的三枚护理模块。\nA版：按场景列清单，标出材料事实与待验证项。", "收藏这份出行清单"],
  ["抖音", "15秒理解产品结构", "镜头1：散乱分装；镜头2：三枚模块；镜头3：单手取用。\n字幕仅展示固定演示结构，不表示真实效果。", "评论你最常用的模块"],
  ["电商", "解释规格与适用边界", "商品卡按材料、规格、适用场景、限制四段展示；检测未确认项保持待审核。", "查看完整规格表"],
  ["视频号", "建立可信理解", "用负责人讲解方式说明为什么先做小规格，以及哪些判断仍需验证。", "转发给出行搭档"],
  ["私域", "收集结构化反馈", "邀请体验者在不提交敏感信息的前提下，对模块顺序和价格带做人工反馈。", "填写脱敏反馈表"],
];

export const workbenchContentFixtures: WorkbenchContentAsset[] = channelSeeds.flatMap(([channel, goal, text, cta], channelIndex) => (["A", "B"] as const).map((variant, variantIndex) => ({
  id: `WCA-${channelIndex + 1}${variant}`,
  conceptId: "PC-01",
  productGene: variant === "A" ? "模块化清单" : "单手取用",
  evidenceIds: variant === "A" ? ["B018", "C001"] : ["B018", "C044"],
  channel,
  contentGoal: goal,
  audience: "20—35岁短途差旅与通勤女性",
  scenario: "三天内差旅与临时补给",
  sellingPoint: variant === "A" ? "按旅程选择所需模块" : "减少取用步骤",
  version: 1,
  variant,
  originalText: variant === "A" ? text : `${text}\nB版：先展示操作对比，再解释适用边界。`,
  editedText: "",
  cta,
  complianceRisk: channel === "电商" ? "材料、规格与适用范围需人工复核" : "不得使用绝对效果或真实经营成果表述",
  reviewStatus: variantIndex === 0 && channelIndex < 2 ? "approved" : "pending",
  reviewNote: variantIndex === 0 && channelIndex < 2 ? "固定演示审核状态；发布前仍需企业责任人复核。" : "",
  stale: false,
})));

export const demoProductWorkbenchState: ProductWorkbenchState = {
  selectedOpportunityId: "OP-01",
  opportunityStatus: { "OP-01": "confirmed", "OP-02": "candidate", "OP-03": "pending" },
  opportunityNotes: { "OP-01": "固定演示中优先研究便携、模块化与价格反证；不代表市场结论。" },
  concepts: productConceptFixtures,
  selectedConceptId: "PC-01",
  scenarioReviews: [],
  contentAssets: workbenchContentFixtures,
  feedbackRecords: [
    { id: "WFB-01", conceptId: "PC-01", contentAssetId: "WCA-1A", channel: "小红书", impressions: 1200, clicks: 84, interactions: 126, saves: 73, addToCart: 0, conversions: 0, userFeedback: "清单结构容易理解，但价格与每枚用量仍需说明。", theme: "规格与价格解释", source: "固定模拟反馈夹具", recordedAt: "2026-08-15", owner: "演示负责人", dataNature: "demo", assumptionId: "ASM-COMMERCIAL-01" },
    { id: "WFB-02", conceptId: "PC-01", contentAssetId: "WCA-1B", channel: "小红书", impressions: 1200, clicks: 69, interactions: 92, saves: 51, addToCart: 0, conversions: 0, userFeedback: "单手取用画面清楚，但不能判断真实购买意愿。", theme: "操作理解", source: "固定模拟反馈夹具", recordedAt: "2026-08-15", owner: "演示负责人", dataNature: "demo", assumptionId: "ASM-PRODUCT-01" },
  ],
  nextRoundItems: ["验证69—89元价格带的分层接受条件", "取得小规格密封结构的供应报价"],
  revision: 1,
  lastSavedAt: "2026-08-16 09:30",
  auditEvents: [
    { id: "WBA-01", action: "锁定演示概念", object: "PC-01", summary: "负责人选择模块版进入数字情景整理", createdAt: "2026-08-16 09:30", source: "模拟产品工作台", isDemo: true },
  ],
};

export const scenarioDimensions = {
  personas: ["短途差旅女性", "高频通勤人群", "健身与运动人群", "周末亲子出行者"],
  sellingPoints: ["模块化清单", "单手取用", "小体积收纳", "材料边界透明", "补充芯减量"],
  channels: ["小红书", "抖音", "电商", "视频号", "私域"],
  ctas: ["收藏清单", "评论选择", "查看规格", "提交反馈"],
};

export function buildExperimentScenarios(conceptId: string): ExperimentScenario[] {
  return scenarioDimensions.personas.flatMap((persona, personaIndex) => scenarioDimensions.sellingPoints.flatMap((sellingPoint, sellingPointIndex) => scenarioDimensions.channels.map((channel, channelIndex) => {
    return { id: `SCN-${personaIndex + 1}${sellingPointIndex + 1}${channelIndex + 1}`, conceptId, persona, sellingPoint, channel, cta: scenarioDimensions.ctas[(personaIndex + channelIndex) % scenarioDimensions.ctas.length], assumptionId: ["ASM-DEMAND-01", "ASM-PRODUCT-01", "ASM-COMMERCIAL-01"][(sellingPointIndex + channelIndex) % 3], priority: null, rule: "没有情景级输入，保持未评分；候选ID与数组位置不代表优先级。", limitation: "固定演示候选矩阵，不是消费者实验、AI排名、销量、ROI或爆款概率。" };
  })));
}
