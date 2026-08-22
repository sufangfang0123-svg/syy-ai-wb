# v0.4.0 QA记录

基线：`origin/main@1bf3b557e7d2f816b815e1f031acd789b13ba1f1`。分支：`agent/woven-ai-workbench-persistence`。

## 已证明的工程能力

- Schema 3增量迁移、重复执行与旧项目保留；
- 新领域对象CRUD、项目隔离、revision、stale、Audit与重启恢复；
- AIProposal引用/快照校验、接受/拒绝；Provider请求0；
- 100情景缺输入时`priority=null`；
- 内容声明提示器、严格反馈CSV、反馈到ChangeProposal；
- 固定Gate版本仍为`NDG_GATE_V0.3.0`；
- public fixture与local API adapter严格分流；
- 1440×900、1366×768、390×844、375×812无页面横向溢出。

## 当前实跑记录

| 检查 | 结果 |
| --- | --- |
| 后端完整测试 | 连续两轮各42项通过，退出码均为0 |
| 前端单元测试 | 连续两轮各16项通过，退出码均为0 |
| lint / typecheck | 连续两轮全部通过，退出码均为0 |
| public E2E | 连续两轮各44项通过、36项按构建或设备画像明确跳过、0失败 |
| local E2E | 连续两轮各19项通过、15项按构建或设备画像明确跳过、0失败 |
| public build + artifact scan | 连续两轮通过；每轮扫描89个文件、10张UAT帧，`customerData=false` |
| local build | 连续两轮通过 |
| 进程级重启恢复 | 通过；重启后恢复R12/Round 2及Evidence、AIProposal、Opportunity、Concept、100个情景、内容、反馈、ChangeProposal和34条Audit |
| 四视口浏览器检查 | 1440×900、1366×768、390×844、375×812均无页面横向溢出；12张升级后截图 |
| Provider请求 | 0；截图脚本和E2E均未观察到`api.openai.com`请求 |
| 依赖与密钥 | `npm audit`为0漏洞；`pip check`无损坏依赖；14项可更新依赖仅记录、未顺手升级；密钥特征与`.env`状态扫描均为0命中 |
| `git diff --check` | 通过 |

## 返工记录

- 第一轮local全套暴露总览页遗漏既有健康边界。恢复`ServiceStatus`与受健康状态控制的真实入口后，原断言与新增链路全部通过。
- public与local开发服务器曾被同时启动，竞争同一`.next`缓存并产生明确webpack缓存错误和HTTP 500。停止并改为单profile串行运行后，public全套连续两轮通过；`test:e2e:public`固定为单worker，未删除或放宽断言。
- 1366×768首次检查曾因电脑休眠出现`ERR_NETWORK_IO_SUSPENDED`；该次不计通过，恢复后单独及两轮全套均通过。

提交SHA、Draft PR和远程CI结果在创建PR后补入交付回复，不提前写成已完成事实。

## 证据边界

这些测试证明软件路径和持久化约束，不证明模型准确率、真实市场需求、客户采用、经营改善或投资价值。Precision、Recall和业务价值均未测量。
