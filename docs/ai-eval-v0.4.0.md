# AI专项评测 v0.4.0

固定数据集：`backend/evals/evidence_copilot_cases.json`。所有内容均标记为“系统评测夹具／非客户材料／不代表真实业务准确率”。覆盖单条、多条、材料不足、矛盾、无法定位引用、Prompt注入、超长、重复、不支持文件、provider拒答、超时和malformed output。

自动评测命令：`npm.cmd run test:ai`。它验证Schema状态一致性、必填字段、引用定位、无依据引用拦截、材料不足拒答、重复接受幂等、未确认候选不影响revision/Gate、provider失败无正式Evidence、Audit、导出和重启恢复。

固定夹具门槛为：Schema合规率100%、引用可定位率100%、无依据引用拦截率100%、材料不足拒答率100%、必填字段完整率100%；未确认候选影响Gate、provider失败假成功、INVALID引用被接受和密钥暴露均为0。上述指标是确定性工程防护评测，不是模型业务准确率。

没有人工标注的真实业务标准答案，因此证据提取Precision、Recall、真实人工接受率、人工修改率和整理时间下降均为“尚未测量”，不得由模型自评。
