# v0.4.0比赛评委反方问答

| 评委问题 | 30秒回答 | 工程证据 | 当前边界 | 下一步验证 |
| --- | --- | --- | --- | --- |
| AI创新到底在哪里？ | 不在“多生成一段文案”，而在AIProposal治理：输入快照、来源、引用、反证、不确定性、人审、stale和Audit让候选进入可负责流程。 | AIProposal Schema、API与测试 | Provider为0，未测模型质量 | 固定脱敏Provider UAT后测人审结果 |
| 为什么不是普通工作流？ | 核心增量是可生成候选与可审治理的结合；没有AI候选时，规则和人工仍可安全运行。 | 三类task type与正式对象派生 | 实时生成待接入 | 比较“人工模板”和“AI候选＋人审”的耗时／质量 |
| AI是否进入核心链路？ | Opportunity、Concept、ChangeProposal都有AIProposal入口，但接受前不是事实。 | 对应API、状态与Audit测试 | Evidence结构化与实时Content生成未接Provider | 跑一次唯一脱敏材料UAT |
| Provider为0为何仍称AI产品？ | 工程已实现AI候选的合同、校验、审核和生命周期；模型运行质量尚未验收，所以不宣称已运行AI。 | `ai_proposal_v1`与导入链路 | 比赛若要求实际飞书AI或Provider，这是当前差距 | 在费用、权限和材料获批后做限次UAT |
| 与Excel、PPT、会议和通用大模型相比增量是什么？ | 同一实体ID贯穿证据、候选、概念、验证、内容、反馈与Decision；上游变化会精确失效下游。 | 数据模型、stale和Audit | 未证明企业愿意替换现有工具 | 让一支团队完成端到端任务并访谈 |
| 如何证明企业愿意使用？ | 目前不能证明。已定义POC测量任务完成时间、复核负担、风险发现和持续使用／付费意愿。 | POC方案 | 无真实客户或付费数据 | 一份授权脱敏材料的本地POC |
| 量化价值在哪里？ | 当前只有待测指标，没有收益百分比。系统计算验证成本和投入比，不预测ROI或销量。 | 经济性字段与missing规则 | 无实测基线 | 试点前后测量同一任务 |
| 是否符合全棉时代命题？ | 以`woven_apparel_v1`把人群、产品基因、渠道、Claim和验证模板放进同一链路；概念不是全棉时代正式产品。 | Category Pack与案例边界 | 未被品牌采用、未验证市场需求 | 品类专家复核Pack和材料 |
| 内容营销中枢在哪里？ | ContentAsset追溯概念和Evidence，Claim检查与人工审核后，反馈形成ChangeProposal回到下一轮。 | Content、Feedback、ChangeProposal E2E | 未连接真实渠道或投放 | 用脱敏内容和模拟反馈完成一次人审 |
| 如何复制到其他品类？ | 更换Category Pack、字段、Claim与Validation模板，同时保留稳定ID、Schema、Gate和Audit。 | Pack结构与版本字段 | 只验证一个正式Pack，Issue #16未完 | 建立第二Pack并做迁移／回归 |
| 哪些已实现，哪些是愿景？ | 已实现本地单用户持久化闭环、AIProposal人审、固定Gate、stale、Audit和导出；Provider、飞书、RBAC、多租户与云生产未实现。 | `/enterprise-demo/`状态标识与CI | 测试不证明业务价值 | 按状态矩阵逐项试点 |

结论：当前可以进入人工评审和封闭试点准备，不能称为企业生产系统，也不能以工程测试推导商业成功。
