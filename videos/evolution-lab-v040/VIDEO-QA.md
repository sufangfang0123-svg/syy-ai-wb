# Evolution Lab v0.4.0视频QA

## 成片结果

| 文件 | 时长 | 大小 | SHA-256 |
| --- | --- | --- | --- |
| `evolution-lab-v040-full-180s.mp4` | 180.000秒 | 59,744,120 bytes | `7C1701F86FB533FA59A64C9B9C368C680D7A8882A37F9036F847A64E451D89A6` |
| `evolution-lab-v040-highlight-60s.mp4` | 60.000秒 | 21,255,222 bytes | `A9E97DB2B0B2E82A414BB9BBAE1037A74BC4A6AAEB001174266ED2116AF884D2` |

两者均为1920×1080、16:9、30fps、H.264、yuv420p、AAC 48kHz mono和MP4 faststart；完整解码退出码为0。60秒版在15—25MB目标内；180秒版为保证界面文字清晰而高于50MB软目标，作为GitHub Release资产交付，不进入Git历史。

## 工程检查

- HyperFrames lint：0 errors，4条重复公开截图／单轨密度提示。
- HyperFrames validate：0 errors，1条AudioContext提示。
- HyperFrames inspect：9个采样点，0 layout issues。
- 180秒关键帧：12帧；60秒关键帧：8帧。
- 两轮接触表复看：无黑白屏、乱码、字幕截断、账号、Cookie、本机路径、客户材料或私有数据库。
- 中文本地TTS因音素器不支持`zh`而停用；成片使用硬字幕和本地环境音床，无外部Provider调用。

## 内容边界

两个版本均明确保留：固定脱敏演示、Provider请求0次、非客户成果、非云生产、AI候选／规则／人工责任分层。画面不声称AI预测爆款、自动排名、客户采用、模型准确率、市场成功率、飞书已集成或业务价值已证明。

## 发布

- Release：<https://github.com/sufangfang0123-svg/syy-ai-wb/releases/tag/v0.4.0-competition-closeout>
- 180秒：<https://github.com/sufangfang0123-svg/syy-ai-wb/releases/download/v0.4.0-competition-closeout/evolution-lab-v040-full-180s.mp4>
- 60秒：<https://github.com/sufangfang0123-svg/syy-ai-wb/releases/download/v0.4.0-competition-closeout/evolution-lab-v040-highlight-60s.mp4>
