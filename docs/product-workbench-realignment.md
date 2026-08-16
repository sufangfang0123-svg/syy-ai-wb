# 棉生万物产品工作台（交互式原型）

## 当前范围

本工作台把既有 Evidence→Assumption→Validation→Gate→Decision 治理链放入完整产品流程：项目总览、洞察与机会、产品共创、数字情景、预验证 Gate、内容中枢、转化反馈、决策与下一轮。

公开构建使用固定模拟夹具和浏览器演示状态；本地 `local_integrated` 继续承载原有 FastAPI、SQLite 和 `NDG_GATE_V0.3.0` 真实治理闭环。两者不会互相回退或混用。

## 状态与追溯

- Opportunity 由负责人记录状态和理由后进入产品共创。
- 三个 ProductConcept 候选均标注来源、唯一变量、Evidence、假设、供应及合规风险。
- 选中概念贯穿 ExperimentScenario、ContentAsset、FeedbackRecord 和最终汇总。
- 概念实质修改增加演示 revision，并把已关联情景和内容版本标记为 stale。
- 内容资产保留固定原始文本、人工版本、A/B版本、审核意见、Evidence 和概念ID。
- 反馈记录保留渠道、内容版本、指标、主题、来源、时间、负责人和数据性质。

## 100个数字情景

情景矩阵由4类人群 × 5类卖点 × 5类渠道确定性组合而成，共100项。演示优先级公式为：

`50 + ((人群序号×17 + 卖点序号×11 + 渠道序号×7) mod 41)`

该数值只用于排序待验证范围，不代表真实消费者实验、销量、ROI或爆款概率。情景进入 Validation 仅表示负责人选择候选；真实项目仍需在本地工作区人工创建并确认 Validation。

## 真实性边界

- “棉感随行胶囊”为比赛概念方案，不是全棉时代正式产品。
- 未调用真实AI Provider，Provider请求次数为0。
- 未连接真实社交平台、广告投放或企业经营数据。
- 固定模拟内容不会自动发布，固定模拟反馈不是客户成果。
- Gate规则、revision、stale、Audit、人工Decision和JSON导出保持原有实现。
