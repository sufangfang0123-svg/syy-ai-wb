# 棉生万物 · AI爆款进化舱

> 先在数字世界上市 100 次，再在现实世界生产 1 次。

“棉生万物”是一套证据感知的产品概念数字进化系统。它把公开信号、真人研究、企业数据和合成压力测试组织成可追溯的产品决策链，通过机会发现、产品基因变异、五道决策门、实验淘汰和真人校准，帮助团队在投产前更早发现错误假设。

这里的“100 次”是一套 1—100 轮的结构化实验协议，不代表 100 次真实商业上市；Fitness 是当前证据条件下的相对适应度，不是成功概率。

## 在线链接

- 产品演示：[https://sufangfang0123-svg.github.io/syy-ai-wb/](https://sufangfang0123-svg.github.io/syy-ai-wb/)
- 源码仓库：[https://github.com/sufangfang0123-svg/syy-ai-wb](https://github.com/sufangfang0123-svg/syy-ai-wb)

GitHub Pages 在 `main` 分支更新后自动安装依赖、构建静态站点并发布 `dist/`。线上更新通常需要等待 Actions 工作流完成。

## 产品定位与核心能力

系统面向商品经理、消费者研究、品牌、供应链、质量合规和业务团队，解决三个问题：创新依据分散、跨团队决策不可追溯、真实生产之前缺少低成本淘汰机制。

核心流程：

```text
捕捉信号 → 形成机会 → 生成产品物种 → 八类基因变异
         → 五道决策门 → 1—100轮实验 → 真人校准 → 候选试产
```

主要页面：

| 页面 | 作用 |
| --- | --- |
| 进化总览 | 默认首页、进化路径、当前幸存物种、Data Readiness、业务影响 |
| 全网雷达 | 证据流、数据源准备度、访问停止条件 |
| 信号洞察 | A—D 证据筛选、来源详情、场景与痛点结构 |
| 需求机会 | 信号—机会—验证三栏工作台、反证、替代方案、证据升级路径 |
| 产品进化 | 八类 Product Genome、Fitness、Mutation Simulator、五道 Gate、Evolution Tree |
| 虚拟上市 | 1—100 轮实验、合成压力测试、区间情景、Reality Check |
| 内容中枢 | Claim Spine、渠道适配、A/B 变体、合规预检、结果回写 |

页面中的操作会写入浏览器 `localStorage`，并进入 Audit Log；“重置演示”可恢复初始数据。静态站点不保存密钥，也不向远端发送演示操作。

## 启动方式与环境变量

环境要求：Node.js 20 或更高版本、npm 10 或兼容版本。

```bash
npm ci
npm run dev
```

本地开发地址为 `http://localhost:3000`。

生产静态构建：

```bash
npm run build
```

构建结果位于 `dist/`。如需模拟 GitHub Pages 子路径：

```bash
# PowerShell
$env:NEXT_PUBLIC_BASE_PATH="/syy-ai-wb"
npm run build
```

| 变量 | 必需 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_BASE_PATH` | 否 | 部署到子路径时设置；本地开发留空，Pages 使用 `/syy-ai-wb` |

当前 DEMO MODE 不需要模型密钥。未来真实 AI Provider 的服务端凭据必须存放在后端或部署平台的 Secret 中，不得使用 `NEXT_PUBLIC_` 前缀，也不得提交到仓库。

## AI 介入流程

AI 的角色被限制在可审计的辅助环节：

1. 从公开或授权数据中提取场景、任务、痛点、替代方案与反证。
2. 将相似信号聚为机会假设，并附来源、证据等级和待真人验证问题。
3. 生成产品基因组合和可控变异，计算相对 Fitness 与变化影响。
4. 在五道 Gate 前整理证据和风险；Hard Gate 失败时直接停止评分。
5. 生成渠道内容 A/B 变体，但只能引用 Claim Spine 中已批准的主张。
6. 使用合成消费者寻找分歧和极端反例，再与真人研究结果比较并校准权重。
7. 记录每次人工动作、AI 生成、证据升级和决策变化。

AI 不负责最终准入、合规、供应链或投资决策。D 级合成结果不等同于真人偏好，公开互动量也不等同于购买意愿。

## 统一证据等级

| 等级 | 定义 | 可支持的决策 |
| --- | --- | --- |
| A | 企业经营、真实成交或重复行为实验 | 试产与规模化讨论 |
| B | 真人访谈、结构化问卷、真人 A/B 或官方统计 | 概念验证与小规模试点 |
| C | 公开评论、社媒信号、竞品观察或专业研究 | 机会发现与假设形成 |
| D | AI 模拟、专家假设、演示测算或合成测试 | 预筛、压力测试和寻找反例 |

Decision Provenance 会展示分数构成、证据列表、覆盖率、时效、风险扣分和限制条件，避免产生无来源的确定性结论。

## 技术栈

| 技术 | 版本 / 方案 | 用途 |
| --- | --- | --- |
| Next.js | 15.3.2 App Router | 页面路由、静态导出 |
| React | 19 | 状态与交互界面 |
| TypeScript | 5 | 领域模型与类型校验 |
| Tailwind CSS | 3.4 | 响应式布局与原子样式 |
| Radix UI | Dialog、Progress、ScrollArea 等 | 可访问的交互基础组件 |
| Lucide React | 图标系统 | 一致的界面图标 |
| ECharts | 5.5 | 后续复杂数据可视化扩展 |
| GitHub Actions / Pages | 静态 CI/CD | 构建、上传与发布 |

## 工程架构

```text
src/
├── app/                 # Next.js 页面与全局设计系统
├── components/          # demo、evidence、evolution、layout、ui
├── data/demo/           # 明确标识的演示数据
├── domain/              # Evidence、Genome、Gate、Experiment 等领域模型
├── providers/           # AI 能力接口与 Demo Provider
├── repositories/        # 状态持久化接口与 localStorage 实现
└── services/            # Fitness、证据强度、Gate 规则等纯业务逻辑
```

领域层不依赖页面。`EvolutionProvider` 连接 Repository 与 Service，页面只消费状态和动作。未来可将 Demo Repository 替换为 API Repository，将 Demo AI Provider 替换为服务端模型调用，而不改动核心页面结构。

## 数据与安全边界

- 所有内置记录均为演示样例，并在界面标记数据类型与证据等级。
- 不保存完整用户名、头像、私信或其他不必要的个人信息。
- 不绕过登录墙、验证码、滑块、访问限制或平台风控。
- 企业销售、会员行为、BOM 与投放 ROI 均显示为“待企业授权”，不会在前端伪造。
- `.env`、缓存、本地数据库、原始敏感截图和构建产物默认不进入版本库。

## 验证与发布

提交前至少运行：

```bash
npm run build
```

验收重点包括所有路由可静态导出、导航与抽屉可用、Mutation/Gate/实验推进有真实状态变化、刷新后状态仍存在、演示与真人数据不混淆，以及手机与桌面布局无关键内容遮挡。

发布工作流位于 `.github/workflows/deploy.yml`，执行顺序为 Checkout → Setup Node → `npm ci` → `npm run build` → Configure Pages → Upload `dist` → Deploy Pages。

## 三分钟演示路线

1. 在首页点击“开始 3 分钟进化演示”，理解“100 次”实验协议和当前幸存物种。
2. 进入“需求机会”，查看支持证据、反证、替代方案和证据升级路径。
3. 进入“产品进化”，运行一次基因变异，观察 Fitness 变化与 Audit Log。
4. 修改一个 Hard Gate 为 FAIL，展示直接淘汰和失败谱系；再恢复为 WARNING。
5. 进入“虚拟上市”，推进一轮实验，对比合成结果与真人结果的校准偏差。
6. 进入“内容中枢”，切换渠道和 A/B 版本，说明 Claim Spine 如何阻止缺证表达。

## 免责声明

本项目是产品研究与决策辅助 DEMO。模拟分数、选择份额、内容指标和商业区间仅用于展示方法与验证流程，不构成真实市场预测、销量承诺、医疗建议或投资建议。重大产品决策必须由真人研究和企业责任人确认。
