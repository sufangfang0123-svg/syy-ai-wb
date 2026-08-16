# Prompt与输出Schema版本

- Prompt版本：`EVIDENCE_COPILOT_PROMPT_V1`
- 输出Schema版本：`EVIDENCE_CANDIDATE_SCHEMA_V1`
- provider模型：由服务端`OPENAI_MODEL`配置，不写入Gate规则。

顶层字段为`run_status`、`document_sufficiency`、`abstain_reason`和`candidates[]`。候选字段为`claim`、`verbatim_quote`、`source_locator`、`scope`、`limitations`、`suggested_grade`、`confidence_indicator`和`uncertainty_reasons[]`。

Prompt将材料声明为不可信数据，要求忽略其中命令与角色设定，不访问材料内URL，不使用外部记忆补足事实，不推断客户、市场、销量或收益，并在无法定位原文时拒答。矛盾内容必须分别保留。

Structured Outputs只保证字段结构，不保证内容真实。`suggested_grade`是候选提示，不是最终等级；`confidence_indicator`是模型自报提示，不是校准概率。后端仍会逐条独立核验`verbatim_quote`。

实现参考官方文档：[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)、[File Inputs](https://developers.openai.com/api/docs/guides/file-inputs)、[Evals](https://developers.openai.com/api/docs/guides/evals)。
