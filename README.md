# Evolution Lab｜新品投前决策与下一证据引擎

> 先别急着做新品。告诉我你下一笔钱准备花在哪里，我告诉你现在最缺哪条证据。

Evolution Lab围绕 **Next-Dollar Gate｜下一笔钱闸门** 工作：在企业支付打样、开模、备货、测试或推广费用前，识别最危险的假设，判断证据是否足够，并推荐成本最低、最能改变决策的下一项验证。

棉生万物是首个行业能力包，不是通用引擎的永久行业边界。

## 双站结构

- `/`：产品展示站，解释价值、机制、棉品案例和三档版本。
- `/workspace` 起：企业产品站，完成建项、证据、风险假设、下一验证、投前决策单和结果回流。
- `/opportunities`、`/evolution`、`/launch` 等保留为研究实验室，不再承担主流程终点。

两个站点共享同一演示项目ID、证据ID、实验ID和Gate结论。

## P0闭环

```text
下一笔投入 → 证据卡 → 风险假设 → Next-Best-Test
           → Next-Dollar Gate → 投前决策单 → 真人/样品/销售结果回流
```

企业站首次进入会自动打开五步“新手指引”。它可跳过、关闭、重开和重置，且直接定位真实页面。模拟数据与真实项目草稿使用不同的localStorage空间。

## 数据真实性

- A：企业行为或真实经营数据。
- B：真人访谈、问卷或真人实验。
- C：公开评论、竞品和专业研究。
- D：AI模拟、专家假设或合成压力测试。

数字实验、真人校准、样品验证和销售结果分别计数。Fitness不是成功概率，“数字世界上市100次”也不等于100次真实上市。

## 启动与构建

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm run test:e2e
npm run build
```

GitHub Pages子路径构建：

```powershell
$env:NEXT_PUBLIC_BASE_PATH="/syy-ai-wb"
npm run build
```

当前静态MVP不需要模型密钥。正式企业版仍需要后端身份、权限、审计、数据库和加密存储。

## 技术栈

- Next.js 15.5、React 19、TypeScript 5
- Tailwind CSS 3.4、Radix UI、Lucide React
- localStorage演示Repository，可替换为真实API Repository
- GitHub Actions与GitHub Pages

## 详细产品与改版文档

- [`docs/next-dollar-gate-redesign.md`](docs/next-dollar-gate-redesign.md)：改版决策、信息架构、页面方案和实际验收。
- [`docs/product-delivery-brief.md`](docs/product-delivery-brief.md)：产品事实、交付资料、企业/赛方文件框架与下一阶段验证。
- [`docs/audit/acceptance-hardening/README.md`](docs/audit/acceptance-hardening/README.md)：本轮风险修复、自动化结果、截图索引与交付边界。

## 免责声明

本项目提供可追溯的决策支持，不替代真实消费者研究、样品测试、合规审核或企业负责人决策。所有演示数据均显著标注，不构成销量、成功率、医疗、法律或投资承诺。
