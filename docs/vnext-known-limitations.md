# v0.4.0 已知限制

- 本地、单用户、无账号和RBAC；actor、reviewer与decided_by均为人工自述。
- Provider默认禁用；结构化建议包由人从外部流程导入，系统不证明其模型来源或准确率。
- 没有真实企业材料、客户成果、真人研究、市场需求、技术指标、销量、CTR/CVR、ROI或付费证据。
- RecommendationPolicy在样本不足时返回空建议；当前没有模型学习或因果归因。
- 100情景只是未评分候选宇宙；当前没有情景级评分输入、自动排序或智能收敛。人工shortlist必须记录理由、操作者、时间和已确认Evidence引用。
- 内容检查器是确定性提示器，不替代品牌、平台、广告、知识产权、产品质量或法律审查。
- CSV只支持规定字段和UTF-8；不连接渠道账号，不自动发布或拉取数据。
- JSON导出不含附件二进制，不是完整恢复包。
- GitHub Pages只运行`public_demo`，本地FastAPI/SQLite能力未云端部署。
- 本轮不依赖PR #13，也未使用或写入任何API Key。
- `Project.category_pack_id`的数据库外键和Category Pack版本升级语义尚未完成，已跟踪于[Issue #16](https://github.com/sufangfang0123-svg/syy-ai-wb/issues/16)。
