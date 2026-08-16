# v0.3.1对外声明核对表

| 对外声明 | 可复核证据 | 允许口径 |
| --- | --- | --- |
| 本地真实闭环已实现 | `backend/app/`、`backend/tests/`、`tests/real-workflow.spec.ts`、公开UAT | “本地系统路径通过固定脱敏UAT” |
| 公开站可在线体验 | `public_demo`构建与Pages工作流 | “公开模拟展示站” |
| Gate可审计 | `backend/app/services.py`、Gate快照与历史 | “确定性规则计算，人工负责人最终决定” |
| 数据变化会使结论失效 | stale服务逻辑、回归测试、UAT第9帧 | “影响结论的数据变化会标记旧版本stale” |
| 棉品行业验证包 | 模拟夹具与五维假设结构 | “首个行业验证包；产业效果待试点” |
| 系统验收证据可公开 | `public/evidence/uat-v0.3.1/manifest.json`及SHA-256 | “固定脱敏系统验收，非客户成果” |

发布前必须确认：无真实客户名、访谈/问卷人数、订单、收入、节省金额、ROI、销量、成功概率、私有URL、Token、Cookie、数据库或未脱敏附件；不得把public_demo称为云端真实系统，不得把`NDG_GATE_V0.3.0`称为AI模型。
