# 明早交接：v0.4.0 本地产品工作台

## 昨晚完成了什么

把八阶段页面接到了新的本地FastAPI/SQLite产品领域链路。首页、Proof、Pilot和GitHub Pages没有改为真实后端。

## 哪些以前只是演示，现在可以持久化

本地项目的品类包、Opportunity、产品概念、100项情景及人工复核、内容资产、反馈CSV、AIProposal、ChangeProposal、推荐层快照、版本、stale和审计会保存在SQLite。刷新和后端重启后可恢复。公开演示仍是固定夹具。

## AI在哪里

系统支持导入结构化AI建议包，校验它引用的项目对象和输入快照，再由负责人接受或拒绝。当前没有真实Provider调用；AI不会直接改Gate、预算、发布或最终Decision。

## 如何启动

```powershell
npm.cmd ci
npm.cmd run setup:integrated
npm.cmd run dev:integrated
```

打开`http://127.0.0.1:3000/workspace/`。

## 体验一遍核心流程

创建项目并确认`woven_apparel_v1` → 在洞察页录入授权Evidence → 在机会页准备并导入结构化建议示例 → 人工接受Opportunity → 创建并锁定概念 → 生成情景漏斗 → 选一项进入Validation → 在`/real/`记录验证并运行固定Gate → 创建和审核内容 → 导入反馈CSV → 创建并复核ChangeProposal → 人工Decision → 创建下一轮。

## 测试与限制

详细结果见`docs/vnext-qa-report.md`。关键后端、前端单元、public/local E2E和双构建都已连续通过两轮；四种桌面/手机尺寸也已检查。系统还实际停止并重启过FastAPI，确认同一SQLite项目及其完整链路可恢复。

本版没有真实客户数据、真实模型调用、云后端、账号权限或自动发布；Provider请求为0。测试证明软件路径，不证明模型准确率、真实市场需求或业务价值，也不能用于自动作出生产、投资、合规或经营决定。

## 明早需要决定

1. 是否用一份已授权、已脱敏的企业材料做第一次人工试点；
2. 是否接受当前“AI只导入proposal、必须人审”的边界；
3. 是否继续投入到附件恢复、可信身份和更完整的反馈口径治理。
