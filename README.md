# Evolution Lab｜新品投前决策与下一证据引擎

> v0.2.0 提供公开模拟演示站，以及单用户本地真实闭环MVP。

Evolution Lab 围绕 Next-Dollar Gate 方法组织信息：在投入打样、开模、备货、测试或推广费用前，明确风险假设、证据缺口和下一项验证。当前页面中的项目、证据、评分和结论均为模拟夹具，不是实际市场研究结果。

## 当前能力边界

| 构建配置 | 可用能力 | 不可用能力 |
| --- | --- | --- |
| `public_demo` | 展示站、独立模拟研究实验室 | 真实项目入口、后端连接、真实数据保存 |
| `local_integrated` | FastAPI、SQLite、真实项目、Evidence导入、Assumption、Validation、Gate、Decision、历史与导出 | 多用户、RBAC、企业审批、云托管 |

GitHub Pages 必须使用 `public_demo`。即使错误设置 `NEXT_PUBLIC_REAL_WORKSPACE_ENABLED=true`，公开构建也不会渲染真实项目入口。

## 路由

- `/`：产品展示站。
- `/workspace` 至 `/results`：模拟决策流程。
- `/radar`、`/insights`、`/opportunities`、`/evolution`、`/launch`、`/content`：独立模拟研究实验室。

模拟数据只使用 `evolution-lab:decision-demo:v1` 等演示存储键。仓库不再创建真实项目 `localStorage`，后端不可用时也不会回退到浏览器存储。

## 启动方式

公开演示配置：

```powershell
npm ci
npm run dev:public
```

首次运行（Windows）：

```powershell
npm.cmd run setup:integrated
npm.cmd run dev:integrated
```

日常只需第二条命令。启动后打开 `http://127.0.0.1:3000/real`；按 `Ctrl+C` 同时停止前后端。健康检查为 `http://127.0.0.1:8000/api/v1/health`。

SQLite默认位于 `backend/data/next-dollar-gate.sqlite3`。停止服务后复制该文件即可备份；恢复时停止服务并用备份文件替换它。单项目JSON由真实工作区“导出JSON”按钮下载。

本地集成构建会请求：

```text
GET {NEXT_PUBLIC_API_BASE_URL}/api/v1/health
```

只有后端健康检查成功时真实入口才开放；失败时不会回退到localStorage。

## 构建与测试

```powershell
npm run lint
npm run typecheck
npm run test:unit
npm run build:public
npm run build:local
npm run test:e2e:public
npm run test:e2e:local
npm run verify:phase1a0
```

GitHub Pages 子路径构建：

```powershell
$env:NEXT_PUBLIC_BASE_PATH="/syy-ai-wb"
npm run build:public
```

机器可读验收报告写入 `test-results/phase1a0/`，该目录不进入版本库。

## 环境变量

| 变量 | `public_demo` | `local_integrated` |
| --- | --- | --- |
| `NEXT_PUBLIC_BUILD_PROFILE` | `public_demo` | `local_integrated` |
| `NEXT_PUBLIC_REAL_WORKSPACE_ENABLED` | 必须为 `false` | 必须为 `true` 才执行健康检查 |
| `NEXT_PUBLIC_API_BASE_URL` | 不使用 | 默认 `http://127.0.0.1:8000` |
| `NEXT_PUBLIC_BASE_PATH` | GitHub Pages 使用 `/syy-ai-wb` | 通常留空 |

## 技术栈

- Next.js 15.5、React 19、TypeScript 5；
- Tailwind CSS、Radix UI、Lucide React；
- Vitest 与 Playwright；
- GitHub Actions 与 GitHub Pages。

## 实施基线

- [Phase 1A-0 实施基线与 Rule Catalog 勘误](docs/phase-1a0-implementation-baseline.md)
- [验收强化记录](docs/audit/acceptance-hardening/README.md)

## 免责声明

本地版本可保存用户主动录入的数据并采集单个公开URL，使用确定性规则计算Gate。它不是多用户生产系统，不提供账号、RBAC、企业审批、真实AI分析、全网搜索或社交平台爬取，也不构成销量、成功率、医疗、法律、合规或投资承诺。常见错误：端口3000/8000冲突时关闭占用程序；后端不可用时先重跑setup并检查health；数据库备份和恢复必须在服务停止后进行。
