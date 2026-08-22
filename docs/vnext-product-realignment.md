# v0.4.0 产品架构回正

## 目标

本轮只升级`local_integrated`产品工作台，不改首页、Proof、Pilot或GitHub Pages展示逻辑。产品从浏览器固定夹具扩展为FastAPI/SQLite持久化链路；`public_demo`仍是独立固定模拟空间。

## 真实链路

`Project → CategoryPack → Evidence → AIProposal → Opportunity → 100个未评分ScenarioCandidate → 人工shortlist → ProductConcept → Validation → NDG_GATE_V0.3.0 → ContentAsset → FeedbackRecord → ChangeProposal → Decision → IterationRound`

每个新增对象保留稳定ID、项目ID、状态、revision/version、人工自述操作者、数据性质、stale原因和时间。所有人工写操作和关键触发动作写入`AuditEvent`；批量派生的stale状态保留原因，并可由对应触发事件追溯。Category Pack切换或Opportunity实质变化使派生漏斗失效；已确认Evidence不能直接修改，取消确认会按解析后的项目内JSON引用使直接依赖和真实下游、AIProposal、Gate与Decision失效。概念实质变化使相关内容、反馈、未完成变更和推荐层失效。

## 数据边界

- `public_demo`：`public_fixture` adapter，只读固定夹具并允许浏览器演示状态，不请求FastAPI。
- `local_integrated`：`local_api` adapter，只读写FastAPI/SQLite；后端失败即显示失败，不回退localStorage。
- Provider：默认关闭，请求计数固定为0；仅支持导入结构化建议包。
- 人员身份：人工自述，不是账号、RBAC、企业审批或可信身份审计。

## 反方审查

技术持久化不等于用户价值已证明。当前没有真实客户采用、付费、经营改善或模型准确率证据。下一阶段是否继续投入，应先用授权企业材料和人工流程测试验证录入成本、复核负担、追溯价值与实际决策质量。
