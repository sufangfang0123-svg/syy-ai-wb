# Evidence Copilot v0.4.0

Evidence Copilot只在`local_integrated`真实工作区运行。它把用户明确授权的当前材料整理为带原文出处的候选Evidence；规则继续计算Gate，负责人继续决定下一笔投入。

## 用户流程

`建立授权来源 → 主动开始分析 → 查看候选与引用上下文 → 接受/编辑后接受/拒绝 → 创建正式Evidence → revision增加 → 旧Gate与Decision stale`

AI运行、未接受候选和拒绝操作都不增加项目revision。只有人工接受后创建的正式Evidence进入项目Evidence列表。引用匹配只证明文字存在于材料中，不证明来源本身正确。

## 输入

- 粘贴文本；
- `.txt`、`.md`、`.docx`和可提取文字的非加密`.pdf`；
- 经现有SSRF与重定向保护导入的单个公开URL正文；
- 用户选择的现有draft Evidence。

每个文件不超过5MB，PDF最多50页，提取文本不超过100万字符；模型输入另受`NDG_AI_MAX_INPUT_CHARS`限制。扫描件只标记需要人工来源核验，不伪装成可精确引用的材料。

## API

- `GET /api/v1/ai/evidence-copilot/status`
- `GET /api/v1/projects/{project_id}/ai/sources`
- `POST /api/v1/projects/{project_id}/ai/sources/text`
- `POST /api/v1/projects/{project_id}/ai/sources/file`
- `POST /api/v1/projects/{project_id}/ai/sources/url`
- `POST /api/v1/projects/{project_id}/ai/sources/from-evidence`
- `POST /api/v1/projects/{project_id}/ai/evidence-runs`
- `GET /api/v1/projects/{project_id}/ai/evidence-runs`
- `GET /api/v1/projects/{project_id}/ai/evidence-runs/{run_id}`
- `POST /api/v1/projects/{project_id}/ai/evidence-candidates/{candidate_id}/review`
- `GET /api/v1/projects/{project_id}/ai/evidence-candidates/{candidate_id}/context`

候选审核必须携带`Idempotency-Key`与项目revision形式的`If-Match`。重复接受、revision冲突、无效引用、未完成人工来源核验都会返回明确错误。

## 状态

运行状态：`PENDING / RUNNING / SUCCEEDED / PARTIAL / ABSTAINED / FAILED / TIMED_OUT / INTERRUPTED`。

审核状态：`PENDING_REVIEW / ACCEPTED / EDITED_AND_ACCEPTED / REJECTED`。后端重启时遗留`RUNNING`任务会标记为`INTERRUPTED`。
