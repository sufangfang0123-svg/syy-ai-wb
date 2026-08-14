# v0.3.0验收记录

验收对象：单企业封闭试点本地构建；公开站仍为模拟展示。

固定UAT由`backend/tests/test_business_acceptance.py`执行：同一项目保留五维Evidence与Assumption，Round 1指标落入补证区得到`SUPPLEMENT`，Round 2全部达到通过阈值得到`CONTINUE`，Round 3一项达到停止阈值得到`STOP`。三轮Gate和Decision历史均保留，前两轮自动stale。

测试覆盖材料导入、MIME/大小/路径穿越/坏PDF、URL SSRF、去重、确认门槛、EvidenceRelation、五维Gate、经济公式、阈值派生、revision、下一轮、导出、重启恢复和v0.2迁移。实际命令、数量、退出码、CI与部署结果以PR和最终交付报告为准，不在文档中预写成功。
