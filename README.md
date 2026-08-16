# Evolution Lab · Next-Dollar Gate

> v0.3.1 新品投前决策与下一证据引擎。当前可交付形态为单企业、本地、单用户的封闭试点；棉生万物是当前首个内置的棉品行业验证包。

在下一笔打样、开模、备货、投放或渠道费用发生前，系统把企业已授权材料转成可追溯Evidence，连接Assumption与Validation，由确定性规则输出`CONTINUE`、`SUPPLEMENT`或`STOP`，最终Decision仍由人工负责人确认。

## 两种严格隔离的构建

| 构建 | 能力 | 数据 |
| --- | --- | --- |
| `public_demo` | 展示站、独立模拟研究实验室、系统验收材料 | 固定模拟夹具；无真实入口、FastAPI或SQLite |
| `local_integrated` | 单企业本地试点：材料导入、证据确认、五维假设、验证结果、Gate、人工Decision、下一轮与导出 | 本机SQLite及非公开附件目录 |

GitHub Pages只执行`public_demo`。公开`/real/`始终显示真实入口关闭；后端不健康时不回退到localStorage或模拟成功。公开站没有云后端。

## 安装与启动

Windows首次运行：

```powershell
npm.cmd ci
npm.cmd run setup:integrated
npm.cmd run dev:integrated
```

打开`http://127.0.0.1:3000/real/`；健康检查为`http://127.0.0.1:8000/api/v1/health`。公开模拟站使用`npm.cmd run dev:public`。

## v0.3.1本地真实项目闭环

`建立项目 → 导入材料 → 确认证据 → 建立五维假设与关系 → 设计阈值验证 → 回填原始结果 → 单一Gate → 人工决定 → 旧结论stale → 创建下一轮 → 导出JSON/打印`

支持粘贴文本、单个公开URL，以及不超过5MB的UTF-8 `.txt`、`.md`、`.csv`和文本型`.pdf`。扫描PDF/OCR、登录抓取、社交平台爬虫和付费墙绕过不支持。文件按扩展名与MIME双检，记录SHA-256并保存到私有数据目录；未确认Evidence不能关联Assumption或参与Gate。

Gate规则版本保持`NDG_GATE_V0.3.0`，汇总`NEED / COMMERCIAL / PRODUCT / SUPPLY / COMPLIANCE`五项检查。停止阈值优先；未触发停止但证据、有效验证或维度不完整时为`SUPPLEMENT`；所有关键假设满足才为`CONTINUE`。AI不参与Gate。

经济性字段只计算验证成本、验证成本占计划投入以及盈亏平衡信息价值概率。缺失金额返回`null`和`missing_fields`，不以0伪装，不输出ROI、销量或成功概率预测。

## 数据与恢复

默认数据目录为`backend/data/`：数据库`next-dollar-gate.sqlite3`，附件快照在`uploads/`。可用`NDG_DATA_DIR`整体改址，或用`NDG_DATABASE_URL`指定数据库。停止服务后同时复制SQLite和`uploads/`完成备份。数据目录、上传文件、测试结果和缓存均排除出Git。

## 证明与交付资料

- [比赛成果证明页](https://sufangfang0123-svg.github.io/syy-ai-wb/proof/)
- [企业试点说明页](https://sufangfang0123-svg.github.io/syy-ai-wb/pilot/)
- [比赛证据矩阵](docs/competition-evidence-matrix-v0.3.1.md)
- [企业试点手册](docs/enterprise-pilot-v0.3.1.md)
- [v0.3.1发布说明](docs/release-v0.3.1.md)
- [对外声明核对表](docs/public-claims-checklist-v0.3.1.md)
- [数据备份与恢复](docs/data-backup-recovery.md)
- [API与Schema v0.3.0](docs/api-schema-v0.3.0.md)
- [限制说明](KNOWN-LIMITATIONS.md)

公开UAT是固定脱敏系统验收夹具，不是客户案例、真人研究或经营成果。本仓库没有真实企业数据。

## 测试

```powershell
npm.cmd run test:backend
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:unit
npm.cmd run build:public
npm.cmd run verify:public-artifacts
npm.cmd run build:local
npm.cmd run test:e2e:public
npm.cmd run test:e2e:local
npm.cmd run verify:phase1a0
git diff --check
npm.cmd audit
```

技术栈：Next.js 15.5、React 19、TypeScript、FastAPI、SQLAlchemy、Pydantic、SQLite（WAL/外键）、Vitest、Playwright、GitHub Actions和GitHub Pages。
