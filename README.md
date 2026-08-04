# 棉生万物 · AI爆款进化舱
## AI消费者反馈洞察工作台

> 将小红书、抖音、电商平台等网络消费者反馈，转化为结构化需求洞察和产品机会。

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 15.3.2 | App Router 框架 |
| React | 19 | UI 库 |
| TypeScript | 5 | 类型安全 |
| Tailwind CSS | 3.4 | 样式系统 |
| shadcn/ui | - | 组件库（手写移植） |
| Radix UI | latest | 无障碍原语（Dialog/Progress/ScrollArea/Tooltip/Separator） |
| lucide-react | latest | 界面图标 |

---

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 打开浏览器访问
# http://localhost:3000
```

### 生产构建

```bash
npm run build
npm run start
```

---

## 页面功能

### 核心流程

```
原始反馈导入 → AI标签提取 → 相似需求聚类 → 需求机会卡 → 人工确认 → 进入产品概念生成
```

### 页面布局

#### 顶部导航栏
- Logo「棉生万物」+ 副标题「AI爆款进化舱」
- 当前项目名称
- 数据源数量、已分析反馈数量统计
- 「导入反馈」按钮
- 「运行AI分析」主按钮

#### 左侧栏 · 原始反馈库
- 平台筛选（小红书 / 抖音 / 京东 / 淘宝 / 微博 / 知乎）
- 情绪筛选（正面 / 中性 / 负面）
- 场景筛选（差旅出行 / 办公通勤 / 运动健身 等）
- 搜索框
- 反馈卡片列表（平台标签、原文摘要、点赞量、评论数、发布时间、AI痛点标签、数据类型标签）
- 点击反馈卡片打开右侧抽屉查看详情

#### 中间栏 · AI需求聚类
- 4个需求聚类卡片：
  1. 随身携带不方便
  2. 使用场景被割裂
  3. 卫生与安心感不足
  4. 组合产品价格顾虑
- 每张卡片包含：聚类名称、相关反馈数量、高频关键词、主要人群、主要场景、核心痛点、证据强度、AI置信度进度条
- 点击聚类卡片可筛选左侧对应反馈

#### 右侧栏 · 需求机会卡
- 3张机会卡可切换：
  1. 轻量随行护理机会
  2. 隐蔽更换场景方案
  3. 可视化安心体系
- 每张卡片包含：机会标题、目标人群、核心场景、用户任务、主要痛点、期望体验、证据数量与等级、当前假设、待验证问题、AI置信度
- 操作按钮：「人工确认」「加入待验证池」「生成产品概念」

### 交互功能

| 交互 | 效果 |
|------|------|
| 点击反馈卡片 | 右侧抽屉打开，展示完整反馈详情 |
| 点击聚类卡片 | 筛选左侧反馈列表，仅显示该聚类关联的反馈 |
| 切换机会卡 Tab | 右侧栏内容切换 |
| 点击「运行AI分析」 | 弹出步骤式加载弹窗（5个步骤），完成后显示成功提示 |
| 点击「生成产品概念」 | 弹出 Toast 提示「产品棉基因模块将在下一版本接入」 |
| 点击「人工确认」 | 标记该机会卡为已确认状态 |
| 点击「加入待验证池」 | 标记该机会卡为已加入待验证池 |

---

## Mock 数据

所有数据文件位于 `src/data/` 目录，均带有 `_disclaimer: "演示模拟数据"` 字段标记。

| 文件 | 内容 | 条数 |
|------|------|------|
| `feedback.json` | 消费者反馈数据 | 20 条 |
| `clusters.json` | 需求聚类数据 | 4 个 |
| `opportunities.json` | 需求机会卡数据 | 3 张 |

### 反馈数据字段

```
feedback_id       - 反馈ID
platform          - 平台（xiaohongshu/douyin/jd/taobao/weibo/zhihu）
product_name      - 产品名称
category          - 品类
raw_text          - 原始文本
publish_date      - 发布日期
likes             - 点赞数
reply_count       - 回复数
source_url        - 来源链接
data_type         - 数据类型（public/interview/ai_simulated）
sentiment         - 情绪（positive/neutral/negative）
scenarios         - 使用场景列表
pain_points       - AI提取的痛点标签
expected_experience - 期望体验
confidence        - AI置信度（0-100）
cluster_id        - 关联的聚类ID
```

---

## 项目目录结构

```
cotton-ai-workbench/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.mjs
├── next-env.d.ts
├── README.md
├── .gitignore
└── src/
    ├── app/
    │   ├── layout.tsx          # 根布局
    │   ├── page.tsx            # 主页面（三栏布局 + 状态管理）
    │   └── globals.css        # 全局样式 + CSS变量
    ├── components/
    │   ├── layout/
    │   │   └── top-nav.tsx     # 顶部导航栏
    │   ├── panels/
    │   │   ├── feedback-panel.tsx          # 左侧反馈库
    │   │   ├── cluster-panel.tsx           # 中间聚类卡片
    │   │   ├── opportunity-panel.tsx        # 右侧机会卡
    │   │   ├── feedback-detail-drawer.tsx  # 反馈详情抽屉
    │   │   └── ai-analysis-overlay.tsx     # AI分析加载弹窗
    │   └── ui/                 # shadcn/ui 基础组件
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── badge.tsx
    │       ├── input.tsx
    │       ├── progress.tsx
    │       ├── sheet.tsx
    │       ├── scroll-area.tsx
    │       ├── separator.tsx
    │       └── tooltip.tsx
    ├── data/
    │   ├── feedback.json       # Mock反馈数据（20条）
    │   ├── clusters.json       # Mock聚类数据（4个）
    │   └── opportunities.json  # Mock机会卡数据（3张）
    ├── lib/
    │   └── utils.ts            # cn()工具函数 + 平台/情绪/数据类型元数据映射
    └── types/
        └── index.ts            # TypeScript类型定义
```

---

## 视觉设计

### 色彩系统

| 色彩 | HSL值 | 用途 |
|------|-------|------|
| Primary | `165 35% 55%` | 浅青绿色，主色调 |
| Background | `150 20% 98%` | 棉白色背景 |
| Card | `0 0% 100%` | 纯白卡片 |
| Border | `200 15% 90%` | 柔和边框 |
| Muted | `200 15% 95%` | 浅灰背景 |

### 设计原则
- 柔和、专业、健康、科技感
- 主色：棉白、浅青绿、柔和蓝绿色
- 避免纯黑背景和赛博朋克风
- 卡片圆角适中（0.5rem）
- 信息层级清晰，数据与证据优先
- 简洁界面图标（lucide-react）
- 适合比赛 Demo 录屏

---

## 后续接入指南

### 连接 FastAPI 后端

1. 在 `src/lib/` 下创建 `api.ts`，封装 fetch 请求
2. 将 `src/app/page.tsx` 中的 Mock JSON 导入替换为 API 调用
3. 示例：

```typescript
// src/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchFeedback(): Promise<FeedbackItem[]> {
  const res = await fetch(`${API_BASE}/api/feedback`);
  const data = await res.json();
  return data.items;
}
```

### 连接 Supabase

1. 安装 `@supabase/supabase-js`
2. 在 `src/lib/supabase.ts` 创建客户端
3. 替换 Mock 数据为 Supabase 查询

### 接入 ECharts

ECharts 已安装但当前版本未使用图表。后续可在聚类面板添加：
- 痛点词频柱状图
- 情绪分布饼图
- 置信度雷达图

---

## 已实现功能清单

- [x] 顶部导航栏（Logo、项目名、数据统计、操作按钮）
- [x] 左侧反馈库（筛选、搜索、列表、卡片）
- [x] 中间聚类卡片（4个聚类、关键词、置信度）
- [x] 右侧机会卡（3张可切换、完整信息展示）
- [x] 反馈详情抽屉（点击反馈打开）
- [x] 聚类筛选联动（点击聚类筛选左侧反馈）
- [x] AI分析步骤式加载弹窗（5个步骤）
- [x] Toast 提示系统
- [x] 人工确认 / 待验证池状态管理
- [x] 生成产品概念提示
- [x] 底部免责声明
- [x] Mock 数据（20条反馈 / 4个聚类 / 3张机会卡）
- [x] 1440px 桌面端适配
- [x] 基本移动端响应式
- [x] TypeScript 零报错
- [x] 生产构建通过

---

## 免责声明

当前页面中的模拟结果仅用于产品机会预筛，不代表真实市场需求或销量预测。所有机会均需通过真人访谈、问卷、概念测试和企业数据进一步验证。
