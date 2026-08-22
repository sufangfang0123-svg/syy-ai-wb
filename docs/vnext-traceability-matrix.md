# Evolution Lab vNext 真实性与验收追踪

本表记录本轮“现状—问题—修改—验收证据”。它证明软件行为和边界，不证明市场需求、模型准确率、客户成果或商业价值。

| 现状 | 问题 | 修改 | 验收证据 |
| --- | --- | --- | --- |
| public机会卡显示固定综合分和百分比 | 无场景级或市场输入，形成伪评估印象 | 删除Fitness、综合分、复核率与覆盖率；改为已复核Evidence、反证、缺口和人工状态 | `tests/product-workbench.spec.ts`机会事实与失败谱系用例 |
| public 100情景使用位置公式 | 数组位置被包装为优先级 | 删除公式及评分服务；100项均为未评分，ID和顺序不代表优先级 | 前后截图、`tests/unit/product-workbench.test.ts`、public/local E2E |
| public情景对比与候选操作语义接近 | 点击说明或评分区可能误选 | 对比复选框与shortlist复选框独立；说明区域无选择事件 | `tests/product-workbench.spec.ts`交互解耦用例 |
| 工作台阶段显示硬编码百分比 | 百分比不是数据库或规则结果 | 删除进度条；改为“打开该阶段查看实际状态” | 工作台事实状态用例 |
| 假设页显示1、2、3排名 | 同错误代价内没有可审计排序依据 | 仅按固定夹具错误代价分组；取消序号和“当前最危险”自动结论 | 假设事实状态用例 |
| public模拟反馈和浏览器人工录入可被一起汇总 | 数据性质混算 | 增加数据性质筛选；一次汇总只包含一种来源 | 反馈分层用例 |
| public机会否决没有可靠失败谱系入口 | 人工动作难追溯 | 理由必填，状态与模拟Audit持久化；失败页保留原Evidence | 失败谱系持久化用例 |
| public操作记录分散 | 研究与决策操作可能混成企业审计 | 研究实验室和模拟决策审计分开；均标记模拟并可重置 | `tests/acceptance.spec.ts`审计用例 |
| local候选可被固定示例冒充外部AI输出 | 固定夹具可能污染正式域 | local只提供空白模板；`fixed_demo`和未验收`ai_proposal`在API层拒绝进入正式对象 | 后端fixed_demo与AIProposal边界测试 |
| 已确认Evidence可被改写或取消后下游继续有效 | 历史解释与当前输入不一致 | 治理字段409；取消确认按结构化引用精确传播stale，单次revision并汇总Audit | 后端Evidence治理与重启恢复测试 |
| Category Pack外键和版本更新语义未闭合 | 历史项目解释仍有迁移风险 | 本轮不做破坏性迁移；继续由Issue #16跟踪 | `docs/vnext-known-limitations.md`与Issue #16 |

## 产品宣称—真实证据矩阵

| 对外宣称 | 可用证据 | 边界 |
| --- | --- | --- |
| 公开固定模拟演示 | `public_demo`构建、public E2E、公开产物扫描 | 不代表真实企业结果 |
| 本地单企业单用户封闭试点 | FastAPI、SQLite、local E2E与重启恢复测试 | 无账号、RBAC、多租户或云部署 |
| Evidence→Decision治理链 | 后端关系、stale、Gate、Decision与Audit测试 | 人工录入身份为自我声明 |
| 确定性Gate | `NDG_GATE_V0.3.0`及回归测试 | 不预测销量、ROI或成功概率 |
| 人工最终决定 | Decision理由、操作者、时间与快照Audit | 不自动触发预算、采购、发布或审批 |
| AIProposal人工接受或拒绝机制 | 结构化导入、来源确认、接受/拒绝测试 | Provider请求为0，未测模型Precision/Recall |

## 来源语义映射

- `fixed_demo`：仅公开固定模拟演示，API禁止进入本地正式漏斗。
- `human_input`：当前内部以`manual_hypothesis`记录负责人自行编写的假设。
- `verified_external`：当前内部以`manual_import`记录已由人确认来源的外部候选或文件。
- `ai_proposal`：待人工验收的结构化候选，未接受前不是正式实体。
- `real_entry`：由合格输入派生的正式域记录，不是原始来源类型。

这些字段分开计数，不合并成“真实率”“成功率”或其他百分比。
