# Evolution Lab · Next-Dollar Gate v0.3.1

发布日期：以GitHub Release/合并记录为准。交付形态：单企业本地封闭试点。

## 本次交付

- 统一品牌、产品、中文定位、行业包与版本层级。
- 新增公开成果证明页`/proof/`和企业试点页`/pilot/`。
- 首页新增有效证明与试点入口，并明确公开模拟/本地真实/非云生产边界。
- 清理用户可见的未经证实AI、真人研究、客户成果和伪来源表述。
- 新增固定脱敏系统UAT截图、JSON导出、清单与SHA-256。
- 新增比赛证据矩阵、试点手册、对外声明核对表和公开产物敏感扫描。
- 扩充public/local端到端测试和1440×900、390×844布局断言。

## 未改变

- Gate业务规则仍为`NDG_GATE_V0.3.0`。
- Schema版本仍为2。
- GitHub Pages仍只构建`public_demo`。
- FastAPI、SQLite、真实项目与附件仍只属于`local_integrated`本地能力。

## 验收证据

- 公开页：`/proof/`。
- UAT：`public/evidence/uat-v0.3.1/`，明确标记为系统验收案例、固定脱敏夹具、非客户成果。
- 自动化：`backend/tests/`、`tests/`和`.github/workflows/ci.yml`。
- 限制：`KNOWN-LIMITATIONS.md`。

测试通过证明软件路径和隔离边界符合断言，不证明真实市场需求、产业收益、客户采用、ROI或成功概率。
