# v0.3.0 API与Schema摘要

核心实体：`Project`、`Evidence`、`EvidenceRelation`、`Assumption`、`EvidenceAssumptionLink`、`ValidationTest`、`ValidationResult`、`GateEvaluation`、`Decision`、`IterationRound`、`AuditEvent`。所有项目实体以`project_id`隔离；Gate/Decision记录`project_revision`、`round_number`和stale状态。

主要API：

- `POST/GET/PATCH /api/v1/projects`及`POST .../archive`；
- `POST .../evidence/manual|paste|file|url`、`POST /evidence/{id}/confirm|unconfirm`；
- `GET/POST .../evidence-relations`；
- `GET/POST .../assumptions`及Evidence关联；
- `GET/POST .../tests`、`POST /tests/{id}/result`；
- `GET .../economics`、`POST .../gate`、`POST .../decision`；
- `GET/POST .../rounds`、`GET .../trace|export`。

ValidationResult只接收原始值、样本、日期、来源、摘要和偏离说明；结论由测试预设方向与阈值派生。人工Decision不得比当前有效Gate更激进。任何影响判断的数据变化都会增加revision，并把当前Gate/Decision标记stale；历史不覆盖。
