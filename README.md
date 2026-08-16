# Evolution Lab · Next-Dollar Gate

> v0.4.0 Evidence Copilot工程候选版。当前真实Provider UAT未通过，因此只能作为单企业、本地、单用户封闭试点的工程框架；棉生万物是当前首个内置的棉品行业验证包。

在下一笔打样、开模、备货、投放或渠道费用发生前，系统把企业已授权材料转成可追溯Evidence，连接Assumption与Validation，由确定性规则输出`CONTINUE`、`SUPPLEMENT`或`STOP`，最终Decision仍由人工负责人确认。

## 两种严格隔离的构建

| 构建 | 能力 | 数据 |
| --- | --- | --- |
| `public_demo` | 展示站、独立模拟研究实验室、系统验收材料 | 固定模拟夹具；无真实入口、FastAPI或SQLite |
| `local_integrated` | 单企业本地试点：授权材料、AI候选Evidence、人工复核、五维假设、验证结果、Gate、人工Decision、下一轮与导出 | 本机SQLite及非公开附件目录；AI只在用户主动触发时调用所选provider |

GitHub Pages只执行`public_demo`。公开`/real/`始终显示真实入口关闭；后端不健康时不回退到localStorage或模拟成功。公开站没有云后端。

## 安装与启动

Windows首次运行：

```powershell
npm.cmd ci
npm.cmd run setup:integrated
npm.cmd run dev:integrated
```

打开`http://127.0.0.1:3000/real/`；健康检查为`http://127.0.0.1:8000/api/v1/health`。公开模拟站使用`npm.cmd run dev:public`。

Evidence Copilot默认关闭。需要真实provider时，只在启动FastAPI的服务端进程或受控密钥管理器中设置`OPENAI_API_KEY`与`OPENAI_MODEL`；不要写入前端、GitHub、日志或截图。`.env.example`只列空变量和预算项，本项目不会自动把测试fixture回退为真实AI结果。

## v0.4.0本地真实项目闭环

手工闭环与AI候选链路已通过离线fixture回归；2026-08-16的1次脱敏真实Provider UAT返回安全失败，未生成候选或正式Evidence。完成一次成功真实Provider UAT前，不宣称AI运行时验收通过。

`建立项目 → 导入材料 → 确认证据 → 建立五维假设与关系 → 设计阈值验证 → 回填原始结果 → 单一Gate → 人工决定 → 旧结论stale → 创建下一轮 → 导出JSON/打印`

手工Evidence支持粘贴文本、单个公开URL，以及不超过5MB的UTF-8 `.txt`、`.md`、`.csv`和文本型`.pdf`。AI来源另支持`.docx`。扫描PDF/OCR、登录抓取、社交平台爬虫和付费墙绕过不支持。文件按扩展名、MIME和文件头检查，记录SHA-256并保存到私有数据目录；AI候选在负责人接受前不是正式Evidence，不增加revision，也不影响Gate。

Evidence Copilot只把用户明确授权的当前材料整理为带原文引用的候选Evidence。后端再次核验引用定位；负责人可以接受、编辑后接受或拒绝。接受后才创建正式Evidence，并沿用现有revision、stale和Audit逻辑。引用匹配只能证明文字存在于材料中，不能证明材料本身正确。AI不自动确认、关联、评级、生成实验或作最终决定。

Gate规则版本保持`NDG_GATE_V0.3.0`，汇总`NEED / COMMERCIAL / PRODUCT / SUPPLY / COMPLIANCE`五项检查。停止阈值优先；未触发停止但证据、有效验证或维度不完整时为`SUPPLEMENT`；所有关键假设满足才为`CONTINUE`。AI不参与Gate计算。

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
- [Evidence Copilot产品与API](docs/evidence-copilot-v0.4.0.md)
- [AI架构与数据流](docs/ai-architecture-v0.4.0.md)
- [Prompt与输出Schema版本](docs/ai-prompt-schema-v0.4.0.md)
- [AI安全与威胁边界](docs/ai-security-boundaries-v0.4.0.md)
- [固定评测集与专项评测](docs/ai-eval-v0.4.0.md)
- [真实Provider UAT](docs/ai-uat-v0.4.0.md)
- [v0.4.0可声明与禁止声明](docs/public-claims-v0.4.0.md)
- [API与Schema v0.3.0](docs/api-schema-v0.3.0.md)
- [限制说明](KNOWN-LIMITATIONS.md)

公开UAT是固定脱敏系统验收夹具，不是客户案例、真人研究或经营成果。本仓库没有真实企业数据。

## 测试

```powershell
npm.cmd run test:backend
npm.cmd run test:ai
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
