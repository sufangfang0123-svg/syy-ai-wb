# v0.4.0 本地产品工作台 API

基础地址：`http://127.0.0.1:8000/api/v1`。所有新增实体按`project_id`隔离；写操作校验对象revision。人员字段是人工自述。

## 主要接口

- `GET /category-packs`；`PATCH /projects/{id}/category-pack`
- `GET /projects/{id}/workbench`：恢复聚合状态
- `POST /projects/{id}/opportunities`；`PATCH /opportunities/{id}`
- `POST /projects/{id}/concepts`；`PATCH /concepts/{id}`
- `POST /projects/{id}/scenarios/generate`；`PATCH /scenarios/{id}`
- `POST /projects/{id}/content-assets`；`PATCH /content-assets/{id}`
- `GET /projects/{id}/content-assets/export?format=json|csv|markdown`
- `GET /ai-proposals/schema`
- `GET /projects/{id}/ai-proposals/snapshot?refs=...`
- `POST /projects/{id}/ai-proposals/import`；`PATCH /ai-proposals/{id}/review`
- `POST /projects/{id}/feedback/import`
- `POST /projects/{id}/change-proposals`；`PATCH /change-proposals/{id}/review`
- `POST /projects/{id}/recommendation-policies`；`PATCH /recommendation-policies/{id}/review`
- `GET /projects/{id}/export`：导出核心链路JSON

Schema版本为3，采用从Schema 2向前的增量迁移并可重复执行。迁移不删除或重建旧表。JSON导出不等于完整附件备份；恢复仍需在停止服务后复制SQLite和`uploads/`。

固定Gate接口、字段和`NDG_GATE_V0.3.0`行为未在本轮更改。
