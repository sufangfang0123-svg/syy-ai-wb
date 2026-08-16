# Phase 1A-0 实施基线与 Rule Catalog 勘误

> 历史实施基线：本文只记录已完成的1A-0隔离阶段，不代表v0.3.1当前能力。当前事实入口为[README](../README.md)与[v0.3.1发布说明](release-v0.3.1.md)。Rule Catalog勘误保留为历史记录。

## 授权范围

Phase 1A-0 仅包含：

- `public_demo` 与 `local_integrated` 构建隔离；
- GitHub Pages 关闭真实项目入口；
- 本地后端健康检查；
- 后端不可用状态；
- 禁止真实项目回退到 `localStorage`；
- 独立模拟研究实验室标识；
- 超前或误导性文案清理。

Phase 1A-0 不实现 FastAPI、数据库、Project、Evidence、Rule Catalog、Gate 或后续切片占位接口。

## Rule Catalog 勘误记录

| 编号 | 勘误 | 实施时点 |
| --- | --- | --- |
| RC-E01 | 覆盖率分子按投入等级计算：E0 仅计达到 EX 的非零权重 Claim，E1 仅计达到 DS 的非零权重 Claim，E2 仅计达到 VA 的非零权重 Claim；未达到对应强度的权重不得计入。 | 最迟 1A-4 前 |
| RC-E02 | NBT 多指标汇总：任一指标为停止档则总体 `stop`；没有停止项但存在补充项则为 `supplement`；全部通过才为 `pass`。 | 最迟 1A-4 前 |
| RC-E03 | 已确认的合规、安全、法律、隐私或质量硬约束失败优先返回 `stop`；不得被普通追溯缺失或证据不足覆盖。只有硬约束无法判断时返回 `evidence_insufficient`。 | 最迟 1A-4 前 |
| RC-E04 | 来源组、证据等级、Finding 或 Relation 变化时只把当前 Gate 标记为 `stale`。必须通过携带 `Idempotency-Key`、`If-Match`、`rule_catalog_version` 和输入快照哈希的明确重算生成新 Gate 版本，禁止静默覆盖历史版本。 | 最迟 1A-4 前 |
| RC-E05 | 只有当前有效、直接相关且具有条款定位的官方或外部权威规范，才能单独满足合规 Claim 的 DS 条件。内部安全规则不得标记为官方合规证据。 | 最迟 1A-4 前 |

## 1A-0 构建判定

| 条件 | 真实入口 | 健康检查 | 真实数据存储 |
| --- | --- | --- | --- |
| `public_demo` | 不渲染 | 不请求 | 禁止 |
| `local_integrated` 且真实能力未启用 | 关闭 | 不请求 | 禁止 |
| `local_integrated` 且后端检查中 | 禁用 | 请求中 | 禁止 |
| `local_integrated` 且后端不可用 | 禁用 | 失败 | 禁止回退 |
| `local_integrated` 且后端健康 | 仅开放服务边界 | 成功 | 1A-0 仍禁止 |

## 文档渲染约束

- Markdown 标题后保留空行；
- 表格表头与分隔行分别占一行；
- 表格分隔行使用 `| --- |` 形式；
- Mermaid 代码块不得嵌套在其他代码块中；
- 当前文档不使用 Mermaid，避免产生嵌套解析歧义。
