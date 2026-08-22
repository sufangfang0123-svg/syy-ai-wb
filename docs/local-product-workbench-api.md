# v0.4.0 本地产品工作台 API

基础地址：`http://127.0.0.1:8000/api/v1`。所有新增实体按`project_id`隔离；写操作校验对象revision。人员字段是人工自述。

## 主要接口

- `GET /category-packs`；`PATCH /projects/{id}/category-pack`
- `GET /projects/{id}/workbench`：恢复聚合状态
- `POST /projects/{id}/opportunities`；`PATCH /opportunities/{id}`
- `POST /projects/{id}/scenarios/generate`：从人工确认Opportunity建立未评分的100项候选宇宙；`PATCH /scenarios/{id}`：人工shortlist/验证/淘汰并保存理由、操作者、时间和已确认Evidence引用
- `POST /projects/{id}/concepts`：必须引用同一Opportunity下的人工shortlist情景；`PATCH /concepts/{id}`：人工选择并锁定后，对应情景才可进入Validation
- `POST /projects/{id}/content-assets`；`PATCH /content-assets/{id}`
- `GET /projects/{id}/content-assets/export?format=json|csv|markdown`
- `GET /ai-proposals/schema`
- `GET /projects/{id}/ai-proposals/snapshot?refs=...`
- `POST /projects/{id}/ai-proposals/import`；`PATCH /ai-proposals/{id}/review`
- `POST /projects/{id}/feedback/import`
- `POST /projects/{id}/change-proposals`；`PATCH /change-proposals/{id}/review`
- `POST /projects/{id}/recommendation-policies`；`PATCH /recommendation-policies/{id}/review`
- `GET /projects/{id}/export`：导出核心链路JSON

Schema版本为5，采用从Schema 2/3/4向前的增量迁移并可重复执行。Schema 5为放宽旧Scenario的`concept_id`兼容读取而重建该SQLite表，并新增Concept的`source_scenario_id`；旧版不符合新漏斗追溯条件的记录及其下游会保留但标记stale。JSON导出不等于完整附件备份；恢复仍需在停止服务后复制SQLite和`uploads/`。

治理统计分别记录`real_entry`、`manual_import`、`manual_hypothesis`、`ai_proposal`和`fixed_demo`。当前正式对象只接受前三类：`ai_proposal`仅可作为尚未验收的历史记录或候选，`fixed_demo`只属于公开演示夹具，两者均不得进入正式对象。`manual_import`必须引用同项目且已确认来源的proposal，不能只靠客户端标签。

Category Pack数据库外键与同ID版本升级策略不在本轮小修范围，已登记[Issue #16](https://github.com/sufangfang0123-svg/syy-ai-wb/issues/16)。

固定Gate接口、字段和`NDG_GATE_V0.3.0`行为未在本轮更改。
