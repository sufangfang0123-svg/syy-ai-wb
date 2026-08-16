# v0.3.1企业试点手册

## 交付定位

Evolution Lab · Next-Dollar Gate v0.3.1是新品投前决策与证据验证工作台，当前交付为单企业、本地、单用户封闭试点。它不是云生产系统、审批平台或AI预测服务。

## 适用范围

- 对象：消费新品负责人、产品/商品负责人、中小企业经营者，以及供应链、质量、合规协作人。
- 场景：下一轮打样、开模、备货、投放或渠道费用之前的继续、补证或停止判断。
- 输入：明确的下一笔投入、已授权且可核验材料、验证预算与阈值、责任人自我声明。

## 本地部署

```powershell
git clone https://github.com/sufangfang0123-svg/syy-ai-wb.git
cd syy-ai-wb
npm.cmd ci
npm.cmd run setup:integrated
npm.cmd run dev:integrated
```

前端：`http://127.0.0.1:3000/real/`；后端健康：`http://127.0.0.1:8000/api/v1/health`。后端不健康时真实入口关闭，系统不回退模拟数据。

## 数据与导入边界

- 默认数据库：`backend/data/next-dollar-gate.sqlite3`；附件：`backend/data/uploads/`。
- 可用`NDG_DATA_DIR`整体改址，或使用`NDG_DATABASE_URL`指定数据库。
- 支持手工粘贴、单个公开URL以及不超过5MB的UTF-8 txt/md/csv/文本型pdf。
- URL必须由企业授权且公开可访问；不绕过登录、反爬、付费墙或平台限制。
- 扫描PDF/OCR、社交平台自动采集、私域连接均不支持。
- 不得导入无授权个人信息、商业机密或其他敏感材料；企业负责脱敏、保存期限、删除与访问控制。

## 试点流程

1. 建立项目并定义下一笔投入。
2. 导入材料、核验来源并人工确认Evidence。
3. 建立五维Assumption以及Evidence支持、反驳或治理关系。
4. 设置Validation指标、方向、基线、阈值、成本与原始结果。
5. 执行确定性Gate并记录人工Decision与理由。
6. 修改影响结论的数据，确认旧Gate/Decision变为stale。
7. 创建下一轮、保留历史并导出脱敏JSON。

## 交付物

- 本地可运行的项目空间与私有SQLite。
- Evidence—Assumption—Validation追溯链。
- 五维Gate快照、人工Decision、stale与审计历史。
- JSON导出、备份恢复说明和验收结果。

## 备份与恢复

停止服务后同时复制SQLite与`uploads/`，记录时间和SHA-256。恢复前保留当前目录副本，放回完整备份后重启，并检查health与项目导出。详细步骤见[数据备份与恢复](data-backup-recovery.md)。

## 当前不提供

云后端、多租户、账号、RBAC、企业审批、可信身份审计、全网采集、平台爬虫、真实AI分析、销量/ROI/成功率预测或自动经营决定。`decided_by`只是人工自我声明。

## 申请入口

使用[企业试点Issue模板](https://github.com/sufangfang0123-svg/syy-ai-wb/issues/new?template=enterprise-pilot.yml)只提交品类、决策场景、时间和技术环境。不得在公开Issue提交商业机密、个人信息、未脱敏附件、Token或企业内部URL。
