# v0.4.0比赛交付收口QA

## 结论与边界

本轮新增评委三分钟入口、AIProposal固定演示实例、参赛材料索引、修订DOCX和两支演示视频。未修改后端、数据库Schema、核心状态机或`NDG_GATE_V0.3.0`；Provider请求次数为0。公开站仍只部署`public_demo`，真实工作台仍只属于本地封闭试点。

自动化与人工检查能够证明交互路径、治理边界和工程可运行性，不能证明市场需求、模型准确率、客户采用、经营收益或云生产能力。

## 自动化结果

| 检查 | 实际结果 | 退出码 |
| --- | --- | --- |
| backend pytest | 74 passed，0 failed | 0 |
| Vitest unit | 20 passed，0 failed | 0 |
| lint | 无错误 | 0 |
| typecheck | 无错误 | 0 |
| public E2E最终完整运行 | 69 passed，45按角色跳过，0 failed | 0 |
| local E2E | 21 passed，27按角色跳过，0 failed | 0 |
| public build | 22个静态页面，含`/judge-kit/` | 0 |
| local build | 22个静态页面；首次被仍在运行的静态服务器锁定`dist`，停止服务器后通过 | 1后复跑为0 |
| public artifact scan | 94 files，10 UAT frames，`customerData=false` | 0 |
| 4视口页面审计 | 17路由×4视口=68 checks，0 failures | 0 |
| npm audit | 0 vulnerabilities | 0 |
| pip check | No broken requirements | 0 |

`skipped`为Playwright项目按public/local或桌面/移动角色定义的条件跳过，不计为通过。

首次public E2E有2条新增评委入口断言未接受Next.js尾部斜杠规范化；只修正测试匹配后，定向6项和最终完整69项均通过。`verify:phase1a0`最终在干净Chrome通道完整退出0。

## 视频验收

| 文件 | 时长 | 规格 | SHA-256 |
| --- | --- | --- | --- |
| `evolution-lab-v040-full-180s.mp4` | 180.000秒 | H.264，1920×1080，30fps，AAC 48kHz mono，faststart | `7C1701F86FB533FA59A64C9B9C368C680D7A8882A37F9036F847A64E451D89A6` |
| `evolution-lab-v040-highlight-60s.mp4` | 60.000秒 | H.264，1920×1080，30fps，AAC 48kHz mono，faststart | `A9E97DB2B0B2E82A414BB9BBAE1037A74BC4A6AAEB001174266ED2116AF884D2` |

两支视频均通过完整解码，使用公开固定演示画面、硬字幕和本地环境音床。中文TTS因本机音素器不支持`zh`而停用，未调用外部语音或模型Provider。画面接触表见`audit/v040-closeout/final/04-video-full-contact-sheet.jpg`和`05-video-highlight-contact-sheet.jpg`。

## 文档验收

- 用户原始DOCX保持不变，SHA-256为`458FDCB680261EE8C4B1687F4004BAD01DAE1ABC81EC4EABEBCBF573225CBDD1`。
- 修订终稿另存为11页DOCX，SHA-256为`4137B16B37C2336F060186E04F588600E015ECCB20E5058887A310D7879D025A`。使用Microsoft Word渲染为PDF并逐页检查；LibreOffice不可用，因此没有冒充完成标准渲染器检查。
- 无障碍审计修复2张图片缺失替代文字和11张表格缺失表头标记，复检为high 0、medium 0、low 0。
- 仓库同时提供完整可粘贴正文和飞书一次性更新清单；未声称已直接更新飞书。

## 三轮反方审查

1. 真实性：AIProposal实例持续标记`fixed_demo`；Provider为0；规则和人工责任分开；没有新增业务结果数字。
2. 产品：评委入口以60秒路径连接价值、实例、边界、材料和视频；桌面与手机无页面级横向溢出。
3. 工程：public/local构建隔离保持；后端差异为空；Gate未变；公开产物无客户数据、密钥或本机路径。

## 剩余外部事项

- 飞书需要有权限的人工账号导入修订DOCX并核对团队信息、比赛规则和截止时间。
- 真实企业材料、真实Provider、模型质量和业务价值均未验收。
- Category Pack历史版本治理继续由Issue #16跟踪。
