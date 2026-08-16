# AI架构与数据流 v0.4.0

```text
授权材料
  → AISourceDocument（SHA-256、抽取正文、定位表、私有快照）
  → EvidenceExtractor（服务端provider接口）
  → 受Schema约束的AIEvidenceRun + AIEvidenceCandidate
  → 后端独立引用核验
  → 人工审核
  → 正式Evidence
  → 现有revision/stale/Audit
  → 既有NDG_GATE_V0.3.0
```

真实provider只有一个服务端适配器，使用官方SDK Responses API与Structured Outputs。fixture provider只有同时设置`NDG_ENVIRONMENT=test`和`NDG_AI_FIXTURE_PROVIDER=1`时才能启用；测试后端会清空真实provider环境变量，失败时不会回退fixture。

`AISourceDocument`保存来源哈希、提取状态和定位表；`AIEvidenceRun`保存provider、model、Prompt/Schema版本、状态、延迟与供应商提供的token usage；`AIEvidenceCandidate`分别保存不可变AI原始快照和人工最终版本。正式导出中的`evidence`只含人工接受项，AI轨迹位于独立`ai_provenance`。

前端只获得provider状态、模型名称和候选结果，不包含API密钥或系统Prompt。GitHub Pages只构建`public_demo`，公开`/real/`没有可调用AI控件；FastAPI、SQLite和provider不部署到Pages。
