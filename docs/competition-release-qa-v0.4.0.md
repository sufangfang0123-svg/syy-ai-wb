# v0.4.0公开互动演示与比赛材料QA记录

## 验收范围

基线：PR #15合并提交`ae78710891bcc0516be9b4084300bca369c5c1b8`。本轮只新增企业闭环展示、入口、比赛材料、截图与防回归测试；未修改后端、数据库、Gate或Provider配置。

## 自动化结果

| 检查 | 结果 | 计数／说明 |
| --- | --- | --- |
| backend pytest | 通过 | 74 passed，0 failed |
| Vitest | 通过 | 20 passed，0 failed |
| public E2E最终复跑 | 通过 | 61 passed，45按构建范围skipped，0 failed |
| local E2E | 通过 | 21 passed，27按构建范围skipped，0 failed |
| 企业页定向E2E | 通过 | 10 passed，0 failed |
| lint／typecheck | 通过 | 退出码0／0 |
| public／local build | 通过 | 21个静态页面，含`/enterprise-demo/` |
| public artifact scan | 通过 | 91 files；`customerData=false` |
| npm audit | 通过 | 0 vulnerabilities |
| pip check | 通过 | No broken requirements |
| git diff --check | 通过 | 退出码0 |

第一次public E2E出现2个失败：测试要求折叠的第6步说明文字直接可见。页面行为正确，断言遗漏“先展开步骤”。修复为先点击第6步再核验“不评分、不排名、不自动Top N”，定向10项和完整public 106项复跑均通过。返工循环：1次。

## 视口与截图

| 页面／证据 | 视口 | 结果 | 截图 |
| --- | --- | --- | --- |
| 修改前企业入口 | 1440×900 | 线上返回404 | `audit/v040-enterprise-showcase/before/01-enterprise-demo-missing-1440x900.png` |
| 企业演示全页 | 1440×900 | 无重叠、裁切或页面级横向溢出 | `audit/v040-enterprise-showcase/after/01-enterprise-hero-1440x900.png` |
| 三层责任架构 | 1440×900 | AI、规则、人工可区分 | `audit/v040-enterprise-showcase/after/02-responsibility-architecture-1440x900.png` |
| 16步闭环 | 1440×900 | details可点击、焦点可见 | `audit/v040-enterprise-showcase/after/03-governed-workflow-1440x900.png` |
| Agent治理卡 | 1440×900 | 状态、输入、输出、人审和Audit可见 | `audit/v040-enterprise-showcase/after/04-agent-governance-1440x900.png` |
| 企业演示手机 | 390×844 | 主按钮和边界完整，无横向溢出 | `audit/v040-enterprise-showcase/after/05-enterprise-mobile-390x844.png` |
| 企业演示小屏手机 | 375×812 | 文本无截断，导航可横向滚动 | `audit/v040-enterprise-showcase/after/06-enterprise-mobile-small-375x812.png` |
| 公开工作台 | 1440×900 | 模拟状态明确 | `audit/v040-enterprise-showcase/after/07-public-workspace-1440x900.png` |
| Opportunity | 1440×900 | 不显示伪综合分 | `audit/v040-enterprise-showcase/after/08-public-opportunity-1440x900.png` |
| Scenario universe | 1440×900 | 候选默认未评分 | `audit/v040-enterprise-showcase/after/09-public-scenario-universe-1440x900.png` |
| Decision | 1440×900 | 系统建议与人工决定分开 | `audit/v040-enterprise-showcase/after/10-public-decision-1440x900.png` |

local E2E还覆盖1366×768、390×844和375×812的真实产品工作台路径。截图来自public生产静态导出，不含开发服务器标识。

## 第一轮：技术审查

- public构建仍为`public_demo`，公开`/real/`关闭且企业页不请求FastAPI。
- `git diff -- backend`为空；数据库、Schema和stale实现未修改。
- `NDG_GATE_V0.3.0`未修改。
- Provider请求次数为0；没有新增模型或外部API调用。
- 敏感信息与本机绝对路径扫描无命中；公开产物`customerData=false`。
- Pages工作流仍只由main触发并只构建public profile。

结论：无P0/P1技术阻断。

## 第二轮：产品真实性审查

- 企业页逐块标出“已实现／固定夹具／待试点／下一阶段”。
- 100情景明确为未评分候选宇宙，不含位置公式、隐藏排序或自动Top N。
- AIProposal描述为候选合同，不写成事实或已运行模型。
- Gate明确为确定性规则，最终Decision归人工。
- 工程测试不写成市场需求、模型准确率或业务价值。
- 飞书接入、Provider、RBAC、多租户和云生产均标为未实现。

结论：无P0/P1真实性阻断。

## 第三轮：比赛评委审查

30%／30%／20%／20%评分矩阵已把每个评分点映射到工程证据和待验证项；11个尖锐问题已提供30秒回答、证据、边界与下一步验证。材料明确承认当前缺少真实企业试点、模型质量、飞书集成和经营价值证据。

结论：材料可进入人工评审，但不得称为企业生产版、真实AI已运行或商业价值已验证。

## 外部阻断

浏览器控制通道不可用，无法可靠读取或编辑飞书原文。仓库已生成完整比赛正文与逐章复制映射；飞书仍需有权限的人工账号完成一次粘贴和终审。视频未生成，已交付180秒与60秒完整录屏脚本。
