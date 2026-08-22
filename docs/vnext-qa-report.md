# Evolution Lab vNext QA记录

本轮起点：`651959a99cd265ab138169eb74c90f58b51cc520`。分支：`agent/woven-ai-workbench-persistence`。PR #15在验证期间保持Draft；未合并、未部署、未触发Pages。

## 已证明的工程能力

- 公开演示中的100项Scenario默认全部未评分，不再使用位置公式、数组顺序或前N项生成shortlist；
- 人工shortlist与对比选择使用独立控件，说明文字、标签和其他单元格不会改变选择；
- 公开演示的shortlist保存Scenario ID、人工理由、操作者、时间、Evidence引用、revision和Audit；
- 机会页仅呈现已确认Evidence、反向Evidence、待补证据、人工状态和最高风险假设，不展示无依据的适应度、复核率、覆盖率或市场成功分；
- 人工否决模拟Opportunity必须填写理由，失败谱系保留原Evidence和独立模拟Audit；
- `fixed_demo`、`human_input`、`verified_external`和`ai_proposal`在页面、统计与治理语义中保持区分；
- 已确认Evidence的受治理字段不可直接修改；取消确认使用解析后的结构化引用传播stale，汇总Audit保存全部受影响对象ID，重新确认不会自动复活旧漏斗；
- 固定Gate仍为`NDG_GATE_V0.3.0`，人工决定不反向改写系统建议；
- `public_demo`不请求FastAPI，`local_integrated`后端失败时不回退公开固定夹具；
- Provider请求为0。

## 最终实跑记录

| 检查 | 结果 |
| --- | --- |
| 后端完整测试 | 74项通过、0失败；退出码0 |
| 前端单元测试 | 20项通过、0失败；退出码0 |
| lint / typecheck | 均通过；退出码0 |
| public E2E | 49项通过、45项按构建或设备画像跳过、0失败；退出码0 |
| local E2E | 21项通过、27项按构建或设备画像跳过、0失败；退出码0 |
| public build + artifact scan | 构建通过；扫描88个文件和10张既有UAT帧，`customerData=false`；退出码0 |
| local build | 构建通过；退出码0 |
| 四视口浏览器检查 | 1440×900、1366×768、390×844、375×812无文档级横向溢出；14张修正后截图 |
| Provider请求 | 0；E2E与截图采集均未观察到`api.openai.com`请求 |
| 依赖检查 | `npm audit`检查576个依赖，0漏洞；`pip check`无损坏依赖；退出码均为0 |
| 敏感信息与路径扫描 | 未发现密钥模式、本机绝对路径、客户数据或服务端密钥进入公开产物 |
| 机械验收报告 | `test-results/phase1a0/verification-report.json`，整体状态`passed`，SHA-256 `D0DD3DDCA07754A9572FB0CDDB71598D474DC6EF88A93189A510D3273512CD3C`；报告为本地测试产物，不进入Git |
| `git diff --check` | 通过；仅出现Git的LF/CRLF转换提示，无空白错误 |

本机首次以Playwright默认Bundled Chromium启动时，运行环境缺少对应浏览器二进制，测试未进入任何产品断言。未修改断言、超时或skip，改用本机已安装的无扩展Chrome执行同一套脚本，获得上述public与local结果。CI继续使用工作流自身安装的Playwright浏览器作为远程验收依据。

## 三轮审查与返工

1. **真实性审查**：删除位置公式、伪评分、百分比适应度、隐形前N项shortlist及无依据排名；将结果页固定夹具与人工回填分层。
2. **产品与交互审查**：修复对比与shortlist误触、机会否决理由、失败谱系、显式新手指引、触屏说明、disabled原因和移动端Scenario卡片。
3. **工程与治理审查**：核验精确stale传播、revision、Audit、跨项目隔离、public/local隔离、未验收AIProposal边界、迁移幂等和文档宣称。

本轮在移动端首次截图审查中发现情景表格仍被裁切，改为390/375宽度下的纵向卡片并重新执行E2E与截图。最终审查未发现本轮范围内P0/P1。

## 截图证据

- 修正前：`docs/audit/vnext-2026-08-22/before/`
- 修正后：`docs/audit/vnext-2026-08-22/after/`
- 可重复采集脚本：`scripts/capture-vnext-audit.mjs`

截图证明固定测试状态下的页面与交互表现，不证明市场需求、模型能力、客户成果或业务价值。

## 证据边界

上述测试证明软件路径、持久化、迁移、隔离和治理约束，不证明模型Precision/Recall、真实市场需求、客户采用、经营改善、投资价值或自动情景排序。本轮没有真实Provider调用，Category Pack外键和历史版本治理仍由Issue #16跟踪。
