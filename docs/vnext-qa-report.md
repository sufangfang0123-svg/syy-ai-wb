# v0.4.0 QA记录

本轮起始提交：`6ae70970c8a2f794deacb4e7747d17a5ee2f1b6e`。分支：`agent/woven-ai-workbench-persistence`。PR #15保持Draft；未合并、未部署。

## 已证明的工程能力

- Schema 5向前迁移、重复执行、旧数据保留与不可信旧漏斗的stale处理；
- 100项Scenario候选在没有情景级输入时全部保持未评分，不按数组、创建时间或数据库顺序形成shortlist；
- 人工shortlist保存操作者、时间、理由、已确认Evidence引用与Audit；Concept只能从有效shortlist创建；
- `fixed_demo`、未验收`ai_proposal`、stale对象及跨项目引用不能进入当前正式漏斗；
- 外部候选的治理引用必须纳入声明的输入快照，接受时再次核验快照；Provider请求为0；
- 内容声明风险的人工强制通过需要审核人、非空理由、时间、findings快照与Audit；
- 固定Gate版本仍为`NDG_GATE_V0.3.0`，Gate逻辑不依赖AI；
- `public_demo`与`local_integrated`继续严格分流，local API失败时不回退public fixture。

## 本轮最终实跑记录

| 检查 | 结果 |
| --- | --- |
| 后端完整测试 | 64项通过，退出码0 |
| 前端单元测试 | 20项通过，退出码0 |
| lint / typecheck | 均通过，退出码0 |
| public E2E | 44项通过、40项按构建或设备画像明确跳过、0失败；退出码0 |
| local E2E | 21项通过、17项按构建或设备画像明确跳过、0失败；退出码0 |
| 最终核心漏斗E2E | 7项通过、7项按设备画像明确跳过；覆盖桌面、390×844、375×812真实shortlist操作；退出码0 |
| public build + artifact scan | 构建通过；扫描89个文件、10张既有UAT帧，`customerData=false`；退出码0 |
| local build | 构建通过，退出码0 |
| 进程级重启恢复 | FastAPI实际停止后重启；同一SQLite项目恢复revision 6、1个Opportunity、100个Scenario、1条人工shortlist、1个Concept和15条Audit，前后指纹一致；退出码0 |
| 四视口浏览器检查 | 1440×900、1366×768、390×844、375×812无文档级横向溢出；3张修正前与3张最终修正后截图 |
| Provider请求 | 0；E2E与截图捕获均未观察到`api.openai.com`请求 |
| 依赖检查 | `npm audit`检查576个依赖，0漏洞；`pip check`无损坏依赖；退出码均为0 |
| 敏感信息与Git卫生 | 最终按变更集扫描；无密钥、数据库、`.env`、缓存或测试报告进入提交 |
| `git diff --check` | 最终提交前通过 |

## 返工记录

本轮按独立真实性审计完成6个收口批次：

1. 删除共享伪评分与数组前12条伪shortlist，改为未评分候选宇宙和人工shortlist；
2. 封锁`fixed_demo`、未确认来源、跨项目引用和内容审核理由绕过；
3. 补齐Schema 4旧数据迁移、stale父对象、反馈与推荐层的派生失效；
4. 将漏斗顺序纠正为Opportunity → Scenario universe → human shortlist → Concept → Validation，并升级Schema 5；
5. 补齐候选引用快照、严格Scenario状态迁移、Concept下游stale与重启恢复证据。
6. 封住Content直接编辑和变更提案两条路径的声明复核、审核字段及旧反馈复用绕过，并把stale固定演示/AI历史继续按五类独立统计。

本机首次public E2E因Playwright自带Chromium未安装而退出1；未改测试，改用已安装的无扩展Edge重新执行，44项通过。`npm audit`首次遇到临时DNS失败，未忽略结果，随后同命令重跑成功并返回0漏洞。

## 证据边界

这些测试证明软件路径、持久化、迁移与治理约束，不证明模型准确率、真实市场需求、客户采用、经营改善或投资价值。Precision、Recall、业务价值和自动情景排序均未测量；本轮没有真实Provider调用。
