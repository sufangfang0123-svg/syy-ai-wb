# AIProposal 合同 v1

AIProposal是候选建议载体，不是Evidence、事实、Opportunity、ProductConcept或Decision。

必需字段包括：`task_type`、项目内`input_entity_references`、`input_snapshot_hash`、`origin`、prompt/schema版本、`candidates`、解释、反证、不确定性、缺失输入、限制、状态、reviewer与review reason。

允许来源：`fixed_demo`、`manual_ai_import`、`provider_optional`。当前实现只开放人工JSON导入；Provider默认禁用且请求计数为0。Schema与示例由`GET /api/v1/ai-proposals/schema`提供，输入哈希由`GET /api/v1/projects/{id}/ai-proposals/snapshot`生成。

导入会校验字段、版本、项目内引用与输入快照。导入后状态为`proposed`；人工接受才会按已支持的任务类型生成正式Opportunity、ProductConcept或ChangeProposal。拒绝、接受、候选索引、生成对象和理由均进入Audit。输入变化后proposal可被标记stale，历史不覆盖。

当前不支持：模型自动调用、自动事实确认、自动Evidence评级、自动关联、自动预算、自动发布、自动修改Gate或自动Decision。未测量Precision、Recall、业务价值和人工节省时间。
