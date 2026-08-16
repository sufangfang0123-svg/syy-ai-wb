# 真实Provider UAT v0.4.0

本文件只记录严格限次、固定脱敏、非客户材料的真实provider验收。测试输入不得包含客户、个人、商业机密、真实URL、密钥或本机路径。

发布门槛：创建项目、建立来源、真实生成带出处候选、查看上下文、接受一条、编辑后接受一条、拒绝一条、确认正式Evidence、验证revision与旧Gate/Decision stale、检查Audit与导出、重启恢复、断开provider后明确失败。真实调用必须由`NDG_REAL_AI_UAT=1`显式开启，并限制调用次数。

## 2026-08-16实际结果

- 授权：复用现有服务端密钥，仅限本次固定脱敏UAT；
- provider：OpenAI；model：`gpt-5.6-luna`；调用次数：1；自动重试：0；
- 输入：3段固定合成棉布检查记录，非客户材料，无个人信息、真实URL或商业机密；
- 结果：`FAILED`；安全错误码：`provider_error`；候选数：0；正式Evidence数：0；
- 项目revision变化：0；既有Gate/Decision未被AI失败改变；fixture回退次数：0；假成功次数：0；
- 密钥、完整Prompt、供应商原始错误、输入全文和本机路径均未进入文档或公开产物。

结论：**真实Provider UAT未通过**，因此没有继续执行接受、编辑接受、拒绝、重启恢复和断开provider后的完整浏览器链路，也不能宣称v0.4.0真实AI闭环完成。离线fixture链路和失败安全边界已通过自动化测试；下一次真实调用必须重新获得明确授权，并在本次新增的安全错误分类下先确认认证、模型可用性或结构化请求兼容性。

脱敏机器可读记录见[`uat/evidence-copilot-v0.4.0-real-provider-failure.json`](uat/evidence-copilot-v0.4.0-real-provider-failure.json)。
