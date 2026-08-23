# 【40强赛】稳健医疗＆全棉时代｜棉生万物

## AI新品进化与投前决策工作台

**Evolution Lab · Next-Dollar Gate v0.4.0**

> 交付性质：公开固定互动演示 + 本地单企业单用户封闭试点。不是企业云生产系统，不代表客户成果。

## 一、项目定位

新品负责人常在证据分散、反证缺失和假设尚未验证时，提前投入打样、开模、备货、投放或渠道费用。本项目把授权材料转为可追溯Evidence，连接机会、情景候选、产品概念、验证、固定Gate和人工Decision，帮助团队在下一笔钱发生前决定继续、补证或停止。

项目不预测爆款、销量、ROI或市场成功率。当前证据不足以证明市场需求、客户采用或商业价值。

## 二、解决的问题

- 材料、会议判断、表格和文档分散，结论来源难以复核。
- 支持证据和反证未进入同一链路，容易产生确认偏误。
- 未完成验证的方案被误写为“已验证”。
- 失败实验没有版本和原因，团队反复支付相似学习成本。
- 通用聊天输出缺少稳定引用、状态、责任人、失效传播和资金决策边界。

## 三、完整治理链

`Evidence → Opportunity → Scenario Universe → Human Shortlist → Product Concept → Validation → NDG_GATE_V0.3.0 → Human Decision → Content → Feedback → ChangeProposal → 下一轮`

100个Scenario只是Category Pack组合出的候选宇宙，默认全部未评分、未复核、未入选。系统不使用数组位置、隐藏分数或自动Top N形成Shortlist。负责人必须显式选择，并记录理由、Evidence引用、操作者自述、时间、项目revision和Audit。

## 四、AI、规则和人工的责任边界

| 层 | 负责 | 禁止越权 |
| --- | --- | --- |
| AI候选层 | 提出候选、解释、反证、不确定性和缺失输入 | 不能确认事实、改变Gate或作最终Decision |
| 确定性规则层 | Schema、项目内引用、Claim检查、快照、stale和固定Gate | 不能补写缺失事实，也不是AI模型 |
| 人工责任层 | 确认Evidence、接受机会、Shortlist、锁定概念、审核内容、确认Decision | 必须记录理由、时间、操作者自述和快照 |

当前Provider关闭，请求次数为0。系统已实现`ai_proposal_v1`合同、外部候选导入、结构校验、人工接受／编辑／拒绝、Audit和stale治理；尚未测量模型Precision、Recall或业务价值。

## 五、AIProposal工作实例

公开实例`AIP-DEMO-001`明确标记为`fixed_demo`：任务类型为`opportunity`，引用固定脱敏Evidence，保留Schema版本、输入快照哈希、反证、不确定性和缺失输入。候选只提出“通勤叠穿中的闷热与摩擦值得验证”，不把它写成已证实需求。

负责人核对引用后，可以编辑并接受为Opportunity，或填写理由拒绝。未接受的Proposal不能形成正式对象；上游Evidence变化后，真实依赖链标记stale，旧历史不被删除，重新确认Evidence也不会自动复活旧对象。

## 六、Next-Dollar Gate

固定规则版本为`NDG_GATE_V0.3.0`。规则读取合格的NEED、COMMERCIAL、PRODUCT、SUPPLY、COMPLIANCE输入：硬约束和停止阈值优先；没有停止项但存在缺证、未完成验证或维度缺口时输出`SUPPLEMENT`；全部满足才输出`CONTINUE`。

Gate是只读系统建议。最终Decision由人工负责人选择并填写理由，系统不会自动触发预算、采购、订单、投放或审批。

## 七、产品与技术实现

- 公开版：Next.js、React、TypeScript静态构建，GitHub Pages只部署`public_demo`。
- 本地版：FastAPI、SQLAlchemy、Pydantic、SQLite Schema 5，附件存于非公开目录。
- 测试：pytest、Vitest、Playwright、双构建和公开产物扫描进入GitHub Actions。
- 治理：稳定ID、snapshot hash、AuditEvent、revision、精确结构化引用与stale传播。
- 隔离：公开构建不访问FastAPI、SQLite、附件或Provider；本地失败不降级为模拟成功。

## 八、数据、安全和合规边界

- 只处理用户明确授权、公开可访问或已脱敏的材料。
- 不绕过登录、反爬、验证码或平台访问限制，不做全网自动采集。
- 当前无账号、RBAC、多租户、云生产或可信身份审计；人员身份为人工自述。
- 公开仓库不含客户数据、真实附件、数据库或密钥。
- 当前系统不得自动作出生产、投资、合规或经营决策。

## 九、业务价值如何验证

当前没有真实企业经营数据，不能宣称已降本增效。封闭试点应测量：材料到第一张决策单的时间、产品属性可追溯率、人工复核耗时、提前发现的需求／规格／供应／Claim风险、被Gate停止或要求补证的高风险投入、避免重复实验数量、反馈回流完整率以及持续使用意愿。

一份授权、脱敏材料的小型POC优先于继续堆叠功能。只有真实负责人完整跑完闭环并形成可复核记录后，才讨论用户价值；只有出现持续使用或付费证据后，才讨论商业价值。

## 十、当前成果与未完成项

已实现并可通过代码和测试复核：公开固定演示、本地Evidence→Decision持久化闭环、AIProposal审核边界、100项未评分Scenario、人工Shortlist、固定Gate、人工Decision、Audit、stale、JSON／打印导出。

未完成：真实Provider评测、模型质量测量、真实飞书集成、账号、RBAC、多租户、云生产、安全／法务／隐私评估、真实企业试点和商业价值验证。Category Pack数据库外键与不可覆盖历史版本仍由Issue #16跟踪。

## 十一、评委入口与材料

- 评委三分钟入口：<https://sufangfang0123-svg.github.io/syy-ai-wb/judge-kit/>
- 公开互动演示：<https://sufangfang0123-svg.github.io/syy-ai-wb/>
- 企业闭环与AIProposal实例：<https://sufangfang0123-svg.github.io/syy-ai-wb/enterprise-demo/>
- 系统验收证明：<https://sufangfang0123-svg.github.io/syy-ai-wb/proof/>
- 180秒完整版：<https://github.com/sufangfang0123-svg/syy-ai-wb/releases/download/v0.4.0-competition-closeout/evolution-lab-v040-full-180s.mp4>
- 60秒精华版：<https://github.com/sufangfang0123-svg/syy-ai-wb/releases/download/v0.4.0-competition-closeout/evolution-lab-v040-highlight-60s.mp4>
- 代码与CI：<https://github.com/sufangfang0123-svg/syy-ai-wb>

## 十二、最终真实性声明

公开内容均为固定模拟或脱敏系统验收夹具，不是全棉时代正式产品、真人研究或客户经营成果。Provider请求次数为0。当前可证明的是工程路径与治理边界，不能证明市场需求、模型准确率、销量提升、ROI、企业采用或生产级安全。
