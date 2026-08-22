# v0.4.0 AI赋能与治理架构

## 1. 设计原则

AI负责扩展候选空间，不负责确认事实、修改Gate或作资金决定。每次AI输出先进入`AIProposal`，只有经过结构化校验和人工接受后才能生成正式业务对象。

## 2. 三层责任

```text
授权材料／已确认Evidence
        ↓
AI候选层：建议、解释、反证、不确定性、缺失输入
        ↓
规则治理层：Schema、项目引用、快照哈希、Claim、stale、Gate
        ↓
人工责任层：接受／拒绝、Shortlist、审核、Decision
```

- AI层当前采用外部候选导入；Provider默认关闭，请求次数为0。
- 规则层执行确定性校验，不伪装成AI。
- 人工身份为自述字段，不是账号认证、RBAC或企业审批。

## 3. AIProposal合同

`ai_proposal_v1`至少包含：

- `task_type`：`opportunity`、`product_concept`或`change_proposal`；
- stable proposal／candidate ID；
- project与input refs；
- input snapshot hash；
- source与source proposal ID；
- schema／prompt／category pack版本；
- explanation、contrary evidence、uncertainties、missing inputs、limitations；
- `proposed`、`accepted`、`rejected`或`stale`状态；
- 审核人自述、时间、理由与AuditEvent。

引用必须解析到同一项目的有效对象。`fixed_demo`由API拒绝进入正式Opportunity、Concept或ChangeProposal；人工自写内容标为`human_input`，不能冒充AI输出。

## 4. 三类任务

| task_type | 输入 | 正式输出 | 人工检查点 |
| --- | --- | --- | --- |
| `opportunity` | confirmed Evidence | Opportunity | 接受、编辑后接受或拒绝 |
| `product_concept` | Opportunity、Human Shortlist、Evidence | ProductConcept | 比较、选择、锁定与Validation |
| `change_proposal` | ContentAsset、Feedback、当前Concept | ChangeProposal | 接受变更或保留旧版本 |

## 5. 100情景候选宇宙

`woven_apparel_v1`按4类人群×5类产品基因×5类渠道／场景形成100个ScenarioCandidate。当前没有逐情景可信输入，因此`priority=null`，全部默认未评分、未复核、未入选。人工Shortlist必须保存理由、Evidence引用、操作者、时间、revision和Audit。不存在数组前N、创建顺序或隐藏分数。

## 6. Gate隔离

`NDG_GATE_V0.3.0`只读取合格输入并确定性汇总NEED、COMMERCIAL、PRODUCT、SUPPLY、COMPLIANCE。AIProposal不能改变Gate版本、规则、阈值或结果；人工Decision不能反写Gate建议。系统不自动触发预算、采购、订单、投放或审批。

## 7. stale与Audit

已确认Evidence取消确认后，系统解析真实JSON引用并精确标记直接依赖和真实下游为stale；Audit保存受影响对象ID与触发原因，一次状态变化只增加一次项目revision。重新确认Evidence不会自动复活旧漏斗。

## 8. 内容与反馈

ContentAsset追溯概念、Evidence、Claim和版本，确定性声明检查只提示风险。人工强制通过声明风险需要理由、审核人自述、时间和findings快照。Feedback只形成ChangeProposal或下一轮事项，不自动修改Gate或旧Decision。

## 9. Category Pack

Category Pack承载人群、场景、产品基因、字段、Claim边界、验证模板、渠道模板和缺失输入说明。Prompt、Schema、Pack和Gate都可版本化。`woven_apparel_v1`已实现；跨行业真实复制尚未验证。Issue #16继续跟踪数据库外键和历史版本不可覆盖治理。

## 10. 飞书协同接入蓝图（未实现）

- 飞书文档：授权材料入口；
- 多维表格：人工审核队列与结果台账；
- 审批：Opportunity、Content和Decision人工确认；
- 机器人：stale、缺证和Gate状态提醒；
- 知识库：Category Pack、失败谱系和版本化方法；
- 网站工作台：专业产品交互。

上述均为规划，不代表已经完成真实飞书集成。

## 11. 当前证据与未测量项

已证实：合同、校验、人工接受／拒绝、正式对象派生、跨项目拒绝、stale、Audit、固定Gate、public/local隔离。  
未证实：真实Provider稳定性、模型Precision／Recall、企业复核负担、业务价值、市场需求、跨行业效果、云生产安全。
