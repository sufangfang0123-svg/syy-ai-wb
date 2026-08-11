# Evolution Lab｜新品投前决策与下一证据引擎

> 当前仓库提供产品展示站、独立模拟研究实验室，以及 Phase 1A-0 的真实服务边界检查。

Evolution Lab 围绕 Next-Dollar Gate 方法组织信息：在投入打样、开模、备货、测试或推广费用前，明确风险假设、证据缺口和下一项验证。当前页面中的项目、证据、评分和结论均为模拟夹具，不是实际市场研究结果。

## 当前能力边界

| 构建配置 | 可用能力 | 不可用能力 |
| --- | --- | --- |
| `public_demo` | 展示站、独立模拟研究实验室 | 真实项目入口、后端连接、真实数据保存 |
| `local_integrated` | 模拟实验室、后端健康检查、真实服务边界入口 | Project、数据库、规则计算和真实项目操作 |

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

本地集成边界配置：

```powershell
$env:NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:8000"
npm run dev:local
```

本地集成构建会请求：

```text
GET {NEXT_PUBLIC_API_BASE_URL}/api/v1/health
```

只有 HTTP 成功且响应为 `{"status":"ok"}` 或 `{"status":"healthy"}` 时，真实项目边界入口才可操作。Phase 1A-0 不包含 FastAPI 或数据库。

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

本项目当前版本不执行真实采集、真实AI分析、真实项目计算或企业审批。模拟页面不构成销量、成功率、医疗、法律、合规或投资承诺。
