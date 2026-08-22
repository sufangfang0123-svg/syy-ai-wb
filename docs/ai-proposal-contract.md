# AIProposal 合同 v1

AIProposal是候选建议载体，不是Evidence、事实、Opportunity、ProductConcept或Decision。

必需字段包括：`task_type`、项目内`input_entity_references`、`input_snapshot_hash`、`origin`、prompt/schema版本、`candidates`、解释、反证、不确定性、缺失输入、限制、状态、reviewer与review reason。

当前导入接口只接受`manual_ai_import`，并要求用户明确选择`external_ai_output`或`manual_hypothesis`、确认来源、填写非空来源说明。`fixed_demo`和`provider_optional`不能通过该接口导入；旧数据库中的`fixed_demo`建议也会在review API被权威拒绝，不能转成正式Opportunity、ProductConcept或ChangeProposal。Provider默认禁用且请求计数为0。Schema与空白结构由`GET /api/v1/ai-proposals/schema`提供，输入哈希由`GET /api/v1/projects/{id}/ai-proposals/snapshot`生成。

导入会校验字段、版本、项目内引用、输入快照和来源确认。候选中的Evidence、Assumption、Opportunity、Scenario、目标对象、反馈与反证引用必须全部出现在`input_entity_references`中，否则导入被拒绝；人工接受前会再次核验引用有效性与快照哈希。外部候选记为`manual_import`，负责人自写内容记为`manual_hypothesis`；不能冒充系统Provider输出。导入后状态为`proposed`；人工接受才会按已支持的任务类型生成正式Opportunity、ProductConcept或ChangeProposal。接受时记录候选索引和生成对象；拒绝保留proposal快照、reviewer与理由；来源说明保存在proposal中并由导入Audit记录。人工接受时若检测到输入变化，proposal会标记stale并拒绝生成正式对象；历史不覆盖。

当前不支持：模型自动调用、自动事实确认、自动Evidence评级、自动关联、自动预算、自动发布、自动修改Gate或自动Decision。未测量Precision、Recall、业务价值和人工节省时间。
