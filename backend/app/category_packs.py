from __future__ import annotations

from copy import deepcopy


WOVEN_APPAREL_PACK = {
    "id": "woven_apparel_v1",
    "name": "有纺服装行业包",
    "version": "1.0.0",
    "status": "active",
    "category_type": "woven_apparel",
    "description": "面向有纺服装概念验证的版本化分类、声明和验证模板。所有行业结论仍需企业材料或真实研究确认。",
    "config": {
        "personas": ["通勤基础层人群", "室内外温差人群", "短途差旅人群", "轻运动通勤人群"],
        "scenarios": ["日常通勤", "空调办公", "短途差旅", "轻运动衔接", "换季叠穿"],
        "jtbd": ["降低全天穿着打扰", "兼顾单穿与叠穿", "减少差旅搭配负担", "获得可核验的材质说明"],
        "pain_points": ["闷热与贴肤打扰", "版型兼容", "洗后稳定性", "材质与功能表述不透明"],
        "gene_fields": ["纱线与织法假设", "克重假设", "版型变量", "领口变量", "袖长变量", "颜色变量", "洗护边界"],
        "concept_dimensions": ["贴肤体验假设", "版型兼容", "供应可执行性", "声明风险", "验证成本"],
        "spec_options": {
            "fit": ["合体", "微宽松", "宽松"],
            "neckline": ["圆领", "窄V领", "半高领"],
            "sleeve": ["短袖", "五分袖", "长袖"],
        },
        "supply_risks": ["面料批次一致性待确认", "缩水与色牢度待检测", "起订量与交期待供应商报价"],
        "approved_claims": ["全棉材质（须有成分检测支持）", "适合叠穿（须明确为设计用途）"],
        "prohibited_terms": ["零闷热", "绝对透气", "治愈", "销量第一", "爆款保证", "100%不起球"],
        "claim_rules": ["材质成分必须引用检测或供应商规格", "效果性表述必须标注验证状态", "不得把比赛概念描述为正式产品"],
        "validation_templates": ["小样穿着记录", "洗后尺寸检测", "版型偏好选择", "供应报价核验", "声明证据审查"],
        "channel_templates": ["小红书场景清单", "抖音单变量演示", "电商规格说明", "视频号负责人解释", "私域结构化反馈"],
        "ranking_dimensions": ["Evidence适配度", "错误代价", "不确定性缺口", "验证可执行性", "品类适配", "渠道适配", "声明风险", "反向证据"],
        "missing_input_prompts": ["补充已确认Evidence", "关联关键Assumption", "填写验证成本与阈值", "核验材质与供应条件"],
        "default_concept": "全棉轻适通勤内搭（比赛概念方案，非全棉时代正式产品）",
    },
}


LEGACY_NONWOVEN_PACK = {
    "id": "legacy_nonwoven_cotton_care_v1",
    "name": "旧版非织造棉品演示包",
    "version": "1.0.0",
    "status": "legacy",
    "category_type": "nonwoven_cotton_care",
    "description": "保留旧版棉感随行胶囊固定演示夹具，不作为真实项目默认品类包。",
    "config": {
        "personas": ["固定模拟短途差旅人群"],
        "scenarios": ["固定模拟差旅护理"],
        "jtbd": ["固定演示：整理棉品护理组合"],
        "pain_points": ["固定演示：携带体积与组合灵活度"],
        "gene_fields": ["非织造材料假设", "模块结构假设"],
        "concept_dimensions": ["固定演示维度"],
        "spec_options": {},
        "supply_risks": ["固定演示：小规格密封与组合工时待验证"],
        "approved_claims": [],
        "prohibited_terms": ["治疗", "绝对安全", "爆款保证"],
        "claim_rules": ["旧夹具不得冒充真实有纺服装案例"],
        "validation_templates": ["固定模拟概念选择"],
        "channel_templates": ["固定模拟内容夹具"],
        "ranking_dimensions": [],
        "missing_input_prompts": ["该包仅用于兼容旧演示"],
        "default_concept": "棉感随行胶囊（旧版固定模拟夹具）",
    },
}


CATEGORY_PACKS = (WOVEN_APPAREL_PACK, LEGACY_NONWOVEN_PACK)


def category_pack_payload(pack_id: str) -> dict | None:
    for pack in CATEGORY_PACKS:
        if pack["id"] == pack_id:
            return deepcopy(pack)
    return None
