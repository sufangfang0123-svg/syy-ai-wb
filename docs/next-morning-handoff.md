# 明早交接：v0.4.0 本地产品工作台

## 昨晚完成了什么

把八阶段页面接到了新的本地FastAPI/SQLite产品领域链路。首页、Proof、Pilot和GitHub Pages没有改为真实后端。

## 哪些以前只是演示，现在可以持久化

本地项目的品类包、Opportunity、产品概念、100项未评分情景候选、人工shortlist、内容资产、反馈CSV、AIProposal、ChangeProposal、推荐层快照、版本、stale和审计会保存在SQLite。刷新和后端重启后可恢复。公开演示仍是固定夹具。

## AI在哪里

系统支持用户粘贴结构化外部候选或人工假设，校验项目引用、输入快照和来源确认，再由负责人接受或拒绝。本地页面只提供空白模板，不内置候选内容。当前没有真实Provider调用；AI不会直接改Gate、预算、发布或最终Decision。

## 如何启动

```powershell
npm.cmd ci
npm.cmd run setup:integrated
npm.cmd run dev:integrated
```

打开`http://127.0.0.1:3000/workspace/`。

## 体验一遍核心流程

创建项目并确认`woven_apparel_v1` → 在洞察页录入并人工确认Evidence → 下载/复制空白候选模板 → 在外部填写候选并粘贴、确认来源 → 人工接受Opportunity → 生成100个未评分Scenario候选 → 勾选候选并填写理由、操作者和Evidence引用形成shortlist → 基于shortlist创建并锁定Concept → 人工标记对应情景进入Validation → 在`/real/`记录验证并运行固定Gate → 创建和审核内容 → 导入反馈CSV → 创建并复核ChangeProposal → 人工Decision → 创建下一轮。

## 测试与限制

详细结果见`docs/vnext-qa-report.md`。最终代码已完成后端、前端单元、public/local E2E、双构建和四种桌面/手机尺寸检查；每项以QA记录中的单次最终实跑结果为准，不用历史轮次扩大结论。独立的进程级恢复验收实际停止并重启FastAPI，再读取同一SQLite测试项目，确认新增链路状态前后指纹一致。

本版没有真实客户数据、真实模型调用、云后端、账号权限或自动发布；Provider请求为0。测试证明软件路径，不证明模型准确率、真实市场需求或业务价值，也不能用于自动作出生产、投资、合规或经营决定。

## 明早需要决定

1. 是否用一份已授权、已脱敏的企业材料做第一次人工试点；
2. 是否接受当前“AI只导入proposal、必须人审”的边界；
3. 是否继续投入到附件恢复、可信身份和更完整的反馈口径治理。
4. 是否单独处理[Category Pack外键与版本升级Issue #16](https://github.com/sufangfang0123-svg/syy-ai-wb/issues/16)。
