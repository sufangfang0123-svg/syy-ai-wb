# v0.4.0 真实性漏斗审计

审计对象：Draft PR #15 的本地产品工作台。截图使用无扩展 Playwright Edge，在固定脱敏夹具和 `local_integrated` 构建中采集；Provider 请求为 0。截图只证明界面状态和交互路径，不证明市场需求、模型能力或客户成果。

## 核心路径

1. 用户粘贴自行准备的外部候选或人工假设，并确认来源说明。
2. 负责人审核候选，形成正式 Opportunity。
3. 系统依据已确认 Opportunity 和 Category Pack 建立 100 个未评分的情景候选宇宙。
4. 用户明确勾选候选，填写操作者、筛选理由并引用已确认 Evidence，才形成 shortlist。
5. 负责人只能基于 shortlist 创建并锁定 Concept；之后才可把对应情景标记进入 Validation。
6. 未纳入、已淘汰和 stale 状态分开统计；验证结果进入固定规则 Gate，最终 Decision 仍由人工确认。

## 前后对比

| 视图 | 修正前 | 修正后 |
| --- | --- | --- |
| 外部候选导入（1440×900） | [查看截图](audit/truth-funnel-before/1440x900-opportunities.png)：内置固定示例可被标作人工 AI 导入 | [查看截图](audit/truth-funnel-after/1440x900-opportunities.png)：只提供空白模板，要求来源类型、来源说明和人工确认 |
| 情景漏斗（1440×900） | [查看截图](audit/truth-funnel-before/1440x900-launch.png)：数组前 12 条被当作 shortlist | [查看截图](audit/truth-funnel-after/1440x900-launch.png)：100 个候选保持未评分，shortlist 必须人工勾选并保存追溯字段 |
| 情景漏斗（390×844） | [查看截图](audit/truth-funnel-before/390x844-launch.png) | [查看截图](audit/truth-funnel-after/390x844-launch.png)：无页面横向溢出，移动端可完成勾选、填写理由和纳入 shortlist |

## 审计结论

- 100 个候选不再共享项目级伪评分，也不再按数组、创建时间或数据库顺序形成 shortlist。
- 没有情景级输入时，候选明确显示“未评分”；本版不声称智能排序或 AI 收敛。
- `fixed_demo` 和未验收的 `ai_proposal` 不能进入正式对象；旧库中的相关记录会被保留但标记 stale，不能继续向前派生。
- `real_entry`、`manual_import`、`manual_hypothesis`、`ai_proposal`、`fixed_demo` 分开计数，不再汇总成含义模糊的百分比。
- shortlist 的操作者、时间、理由、已确认 Evidence 引用及 Audit 可持久化恢复。
- Gate 版本保持 `NDG_GATE_V0.3.0`，其计算不依赖 AI。

Category Pack 外键和版本升级语义不在本轮改动范围，已登记为 [Issue #16](https://github.com/sufangfang0123-svg/syy-ai-wb/issues/16)。
