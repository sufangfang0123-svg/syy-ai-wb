# 稳健医疗＆全棉时代AI命题成果展示 v0.4.0

> 项目名称：棉生万物｜AI新品进化与投前决策工作台  
> 产品名称：Evolution Lab · Next-Dollar Gate v0.4.0  
> 交付性质：公开固定模拟演示＋单企业、单用户、本地封闭试点能力。不是客户成果或云生产系统。

## 1. 一句话定位

面向新品团队的AI共创、证据治理与下一笔投入决策工作台：在打样、开模、备货、投放或渠道费用发生前，AI负责生成和整理候选，人负责确认事实并承担最终决定，确定性Gate负责判断继续、补证还是停止。

## 2. 命题理解

我们没有把“爆款”理解为可由AI直接预测的分数，而是将其形成过程拆成候选生成、证据约束、人工筛选、验证、淘汰、追溯和持续进化的工程流程。当前证据不足以证明任何产品会成为爆款，系统也不输出爆款概率、销量或ROI预测。

## 3. 企业业务痛点

- 新品材料、判断、会议、Excel和PPT分散，无法复核某项结论来自哪里。
- 支持证据和反证没有进入同一决策链，团队容易只看到支持方案的信息。
- 证据不足时仍可能提前投入打样、备货或投放。
- 失败项目缺少结构化版本和原因，类似实验被反复执行。
- 通用大模型的输出容易与事实、Claim、责任人和资金决定脱节。

## 4. 为什么常规内容生成不足

一次聊天可以生成文案，却不能天然回答：输入是否已授权、引用是否仍有效、反证是否完整、谁接受了候选、上游变化后哪些对象失效、哪条规则形成Gate、谁承担最终决定。本项目把AI输出放入`AIProposal`治理合同，再进入正式业务对象，而不是直接把回答当成事实。

## 5. 总体解决方案

正式本地链路为：

`Project → CategoryPack → Evidence → AIProposal → Opportunity → Scenario Universe → Human Shortlist → ProductConcept → Validation → NDG_GATE_V0.3.0 → ContentAsset → Feedback → ChangeProposal → Human Decision → IterationRound`

公开站用固定夹具演示交互；本地版用FastAPI、SQLite和非公开附件目录保存正式对象。两种构建严格隔离。

## 6. AI＋规则＋人工架构

| 层 | 作用 | 不能做什么 |
| --- | --- | --- |
| AI | 生成候选、解释、反证、不确定性、缺失输入和内容草案 | 不能确认事实、修改Gate或作最终决定 |
| 规则 | Schema与项目内引用校验、Claim检查、输入快照、stale传播、固定Gate | 不能把缺失信息补写成结论 |
| 人工 | 确认Evidence、接受机会、人工shortlist、锁定概念、审核内容、确认Decision | 必须保留理由、时间、操作者自述和快照 |

当前Provider默认关闭、请求次数为0。已实现的是AIProposal合同、导入、校验、审核与正式对象派生，不是实时模型能力证明。

## 7. Agent与Prompt工作流

- Evidence Structuring Agent：规划／演示；未来把授权材料整理为可定位候选。
- Opportunity Copilot：`task_type=opportunity`导入、校验和人工接受已实现。
- Concept Co-creation Agent：`task_type=product_concept`受审候选已实现。
- Content Copilot：内容版本、Evidence引用和Claim检查已实现；实时生成待接入。
- Feedback Evolution Agent：`task_type=change_proposal`导入与人审已实现。
- Next-Dollar Gate：确定性规则引擎，不是AI Agent。
- Human Decision Owner：最终责任人。

所有Proposal保留Schema版本、Prompt版本、来源、稳定ID、项目内引用、输入快照哈希、解释、反证、不确定性、缺失输入、限制与审核状态。

## 8. Evidence到Decision完整链路

Evidence记录原文、来源、范围、限制、哈希与确认状态。已确认Evidence的治理字段不能直接修改；取消确认后，系统按结构化引用使真正依赖它的对象stale，并保留汇总Audit。重新确认Evidence不会自动复活旧对象。Gate建议与人工Decision分别保存，人工决定不会反写系统建议。

## 9. AI新品共创流程

外部候选先以AIProposal进入待审队列，引用必须属于同一项目。负责人可接受、编辑后接受或拒绝；只有接受后才能生成正式Opportunity、ProductConcept或ChangeProposal。人工自写内容标为`human_input`，固定演示数据标为`fixed_demo`，不能冒充AI产出。

## 10. 100情景候选宇宙与人工Shortlist

100个情景是Category Pack确定性组合出的未评分候选宇宙，不是100次上市、AI排名或自动Top N。当前没有逐情景可信输入，因此所有候选默认未评分、未复核、未入选。Shortlist只能由人显式选择，并记录情景ID、理由、Evidence引用、操作者、时间、项目revision和Audit。

## 11. Next-Dollar Gate

固定规则版本为`NDG_GATE_V0.3.0`，汇总NEED、COMMERCIAL、PRODUCT、SUPPLY、COMPLIANCE五维检查。硬约束和停止阈值优先；没有停止项但存在缺证、未完成验证或维度缺口时输出`SUPPLEMENT`；全部满足时才输出`CONTINUE`。AI不改变规则、阈值或结果。

## 12. 全渠道内容中枢

内容资产追溯到概念版本、产品基因、Evidence与Claim边界；支持渠道、A/B版本、人工编辑、审核和确定性声明检查。固定文案不标为AI实时生成，未连接渠道时不显示为已发布。内容不会自动改变Gate。

## 13. 反馈、ChangeProposal与下一轮进化

反馈通过CSV或人工记录进入，追溯到内容版本、概念和假设。反馈只能形成ChangeProposal或下一轮事项，不会静默改写旧概念、Gate或Decision。Evidence或概念发生实质变化时，旧下游对象按引用失效并保留历史。

## 14. 产品页面与企业演示入口

- 公开互动演示：<https://sufangfang0123-svg.github.io/syy-ai-wb/>
- 评委三分钟入口：<https://sufangfang0123-svg.github.io/syy-ai-wb/judge-kit/>
- 企业闭环导览：<https://sufangfang0123-svg.github.io/syy-ai-wb/enterprise-demo/>
- 系统验收证明：<https://sufangfang0123-svg.github.io/syy-ai-wb/proof/>
- 企业试点说明：<https://sufangfang0123-svg.github.io/syy-ai-wb/pilot/>

公开页面只使用固定模拟或脱敏系统验收夹具，不访问FastAPI、SQLite或真实Provider。

## 15. 技术实现

前端使用Next.js 15.5、React 19和TypeScript；本地服务使用FastAPI、SQLAlchemy、Pydantic和SQLite Schema 5；测试使用Vitest、Playwright与pytest；GitHub Actions执行质量检查，GitHub Pages只部署`public_demo`。关键治理件包括稳定ID、snapshot hash、AuditEvent、stale传播和public/local adapter隔离。

## 16. 数据治理、安全与责任边界

- 本地版为单企业、单用户、本机封闭试点；身份是人工自述，不是可信身份审计。
- 附件保存在非公开目录，文件类型、MIME和大小受限。
- 不绕过登录、反爬或平台限制；不做全网自动采集。
- 无账号、RBAC、多租户、云生产、自动审批或真实渠道投放。
- 不接受未授权、未脱敏企业材料；公开仓库没有真实企业数据。

## 17. AI应用创新性（30%）

创新点不是“生成更多内容”，而是把AI候选放入可审查、可失效、可追溯的企业流程：AIProposal保留输入快照、来源、引用、Schema、Prompt版本、反证、不确定性和限制；接受后才生成正式对象；Evidence变化使真实下游stale；失败记录保留为谱系；Gate与AI严格分离。

## 18. 业务价值与试点测量方法（30%）

当前没有真实企业经营数据，不能宣称已降本增效。封闭试点将测量：从材料到第一张决策单时间、产品属性可追溯率、人工复核耗时、提前发现的需求／规格／供应／Claim风险、被Gate停止或要求补证的高风险投入、避免重复实验数量、反馈回流完整率、持续使用与付费意愿。

## 19. AI应用深度（20%）

AIProposal进入Opportunity、ProductConcept、ChangeProposal三个关键对象入口，并受项目引用、状态、人工审核、Audit和stale约束。Evidence结构化和实时内容生成仍待Provider与企业材料验证。飞书文档、多维表格、审批、机器人与知识库仅为协同接入蓝图，尚未实现真实集成。

## 20. 方案完整度与可复制性（20%）

端到端工程链已覆盖项目、证据、候选、人审、情景宇宙、概念、验证、Gate、内容、反馈、变更、决定和下一轮。Category Pack、Prompt、Schema和Gate可版本化；业务对象使用稳定ID；AI、规则和人工职责分离。当前只实现并验证`woven_apparel_v1`及历史模拟包，跨行业复制价值尚未验证；Category Pack数据库外键与历史版本治理仍由Issue #16跟踪。

## 21. 当前成果与测试证据

- 公开版和本地版构建隔离。
- 后端、单元、public/local E2E、双构建和公开产物扫描进入CI。
- 固定脱敏UAT证明本地系统可以完成真实对象的持久化、Gate、人工Decision、stale、Audit与导出。
- 测试通过证明工程行为符合断言，不等于市场需求、模型准确率或业务价值成立。

## 22. 企业POC方案

选择一份已授权、脱敏、范围明确的企业材料，由一名真实新品负责人在本机完成：导入与确认Evidence、接受或拒绝候选、人工shortlist、创建概念与Validation、运行Gate、记录Decision、导入一轮反馈。全过程不公网暴露后端。输出决策单、追溯导出、复核耗时与问题清单。

## 23. 未完成事项与风险

- Issue #16：Category Pack外键与不可覆盖历史版本治理。
- 真实Provider与模型Precision／Recall未验证。
- 飞书真实集成未完成。
- 账号、RBAC、多租户、云部署、安全／法务／隐私评估未完成。
- 真实市场需求、客户成果、经营价值与付费意愿尚无证据。

## 24. 在线成果、代码与证据索引

- GitHub：<https://github.com/sufangfang0123-svg/syy-ai-wb>
- 企业演示：<https://sufangfang0123-svg.github.io/syy-ai-wb/enterprise-demo/>
- 评分追溯：[competition-score-traceability-v0.4.0.md](competition-score-traceability-v0.4.0.md)
- AI架构：[ai-empowerment-architecture-v0.4.0.md](ai-empowerment-architecture-v0.4.0.md)
- 演示脚本：[enterprise-demo-script-v0.4.0.md](enterprise-demo-script-v0.4.0.md)
- 宣称矩阵：[competition-claims-matrix-v0.4.0.md](competition-claims-matrix-v0.4.0.md)
- 飞书迁移映射：[feishu-update-map-v0.4.0.md](feishu-update-map-v0.4.0.md)
- 参赛材料索引：[submission-index-v0.4.0.md](submission-index-v0.4.0.md)
- 比赛收口QA：[competition-closeout-qa-v0.4.0.md](competition-closeout-qa-v0.4.0.md)

最终边界：Provider请求次数为0；真实企业数据数量为0；无客户经营成果；无云生产；无RBAC；无真实飞书集成。
