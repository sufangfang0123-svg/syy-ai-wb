import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Boxes,
  ClipboardCheck,
  Code2,
  Database,
  FileCheck2,
  GitBranch,
  History,
  Layers3,
  LockKeyhole,
  Network,
  Scale,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";

const workflow = [
  ["01", "创建项目与选择品类包", "woven_apparel_v1", "已实现", "本地项目记录品类包、版本与下一笔投入问题。"],
  ["02", "导入并人工确认Evidence", "Evidence", "已实现", "保留原文、来源、范围、限制、哈希和确认状态。"],
  ["03", "取得AIProposal空白模板", "ai_proposal_v1", "已实现", "系统生成带稳定引用和输入快照哈希的空白结构，不调用Provider。"],
  ["04", "导入外部AI候选", "AIProposal", "已实现", "负责人粘贴外部候选，确认来源后进入待审队列。"],
  ["05", "人工接受Opportunity", "Opportunity", "已实现", "未接受的候选不是事实，也不能成为正式机会。"],
  ["06", "建立100个未评分情景", "Scenario universe", "已实现", "Category Pack确定性组合候选，不评分、不排名、不自动Top N。"],
  ["07", "人工Shortlist", "Human shortlist", "已实现", "记录情景ID、理由、操作者、时间、Evidence和revision。"],
  ["08", "创建并锁定产品概念", "ProductConcept", "已实现", "概念只能从有效shortlist创建，锁定动作由负责人确认。"],
  ["09", "设计Validation并运行Gate", "Validation → Gate", "已实现", "人工设定指标和阈值；固定规则输出继续、补证或停止。"],
  ["10", "创建内容版本并检查Claim", "ContentAsset", "已实现", "内容追溯至概念与Evidence，确定性检查不替代人工审核。"],
  ["11", "人工审核内容", "Content review", "已实现", "声明风险强制通过时必须保留审核理由和findings快照。"],
  ["12", "导入反馈CSV", "FeedbackRecord", "已实现", "固定模拟指标与人工导入数据分层，不连接真实渠道。"],
  ["13", "形成ChangeProposal", "ChangeProposal", "已实现", "反馈只形成待审变更，不自动改写概念或Gate。"],
  ["14", "人工确认Decision", "Decision", "已实现", "负责人填写决定、理由、操作者、时间和关联快照。"],
  ["15", "创建下一轮", "IterationRound", "已实现", "保留上一轮历史，不静默覆盖旧结论。"],
  ["16", "Evidence变化触发stale", "Stale propagation", "已实现", "按结构化引用失效真实下游；重新确认不会自动复活。"],
] as const;

const agents = [
  {
    icon: FileCheck2,
    name: "Evidence Structuring Agent",
    status: "规划／演示",
    tone: "planned",
    input: "已授权材料与人工定位",
    output: "Evidence候选结构",
    evidence: "原文、位置、来源和限制",
    uncertainty: "无法识别的字段保持缺失",
    human: "人工确认事实与适用范围",
    audit: "未来写入候选快照和审核事件",
  },
  {
    icon: Sparkles,
    name: "Opportunity Copilot",
    status: "合同与人审已实现",
    tone: "implemented",
    input: "Evidence引用与输入快照",
    output: "task_type=opportunity候选",
    evidence: "项目内引用必须可解析",
    uncertainty: "反证、缺失输入和限制必填",
    human: "接受或拒绝候选",
    audit: "保存原始包、来源、理由和状态",
  },
  {
    icon: Boxes,
    name: "Concept Co-creation Agent",
    status: "受审候选已实现",
    tone: "implemented",
    input: "Opportunity、Shortlist与Evidence",
    output: "task_type=product_concept候选",
    evidence: "引用必须属于同一项目",
    uncertainty: "规格、价格和供应结论可为空",
    human: "选择、编辑、锁定并验证",
    audit: "保存接受候选和正式对象ID",
  },
  {
    icon: Bot,
    name: "Content Copilot",
    status: "资产与检查已实现；实时生成待接入",
    tone: "partial",
    input: "锁定概念、Evidence与Claim边界",
    output: "渠道内容版本",
    evidence: "内容保留概念和Evidence引用",
    uncertainty: "声明风险由检查器提示",
    human: "编辑、审核或说明强制通过理由",
    audit: "保存版本、findings和审核结果",
  },
  {
    icon: GitBranch,
    name: "Feedback Evolution Agent",
    status: "变更候选合同已实现",
    tone: "implemented",
    input: "内容版本、反馈和当前概念",
    output: "task_type=change_proposal候选",
    evidence: "反馈追溯到内容与概念",
    uncertainty: "样本不足时不生成确定结论",
    human: "接受变更或保留原版本",
    audit: "保存反馈、候选与人工修改",
  },
  {
    icon: Scale,
    name: "Next-Dollar Gate",
    status: "确定性规则引擎",
    tone: "rule",
    input: "已确认Evidence、Assumption和Validation",
    output: "CONTINUE／SUPPLEMENT／STOP",
    evidence: "只读取合格输入与规则版本",
    uncertainty: "证据不足明确返回补证",
    human: "负责人读取建议并作最终决定",
    audit: "保存NDG_GATE_V0.3.0输入快照",
  },
  {
    icon: UserCheck,
    name: "Human Decision Owner",
    status: "最终责任人",
    tone: "human",
    input: "Gate、风险、限制和验证结果",
    output: "人工Decision",
    evidence: "关联当时的完整快照",
    uncertainty: "必须在理由中说明取舍",
    human: "承担继续、补证或停止责任",
    audit: "保存操作者自述、时间与理由",
  },
] as const;

const technologies = [
  "Next.js 15.5",
  "React 19",
  "TypeScript",
  "FastAPI",
  "SQLAlchemy",
  "Pydantic",
  "SQLite · Schema 5",
  "Vitest",
  "Playwright",
  "GitHub Actions",
  "GitHub Pages",
  "NDG_GATE_V0.3.0",
] as const;

const statuses = [
  ["当前已实现", "代码、测试或CI可复核", "implemented"],
  ["固定夹具演示", "说明交互和治理方法，不是客户成果", "demo"],
  ["待企业试点", "需要授权、脱敏企业材料验证价值", "pilot"],
  ["下一阶段能力", "需要Provider、账号、RBAC或云环境", "planned"],
] as const;

export default function EnterpriseDemoPage() {
  return <div className="enterprise-demo">
    <section className="delivery-hero enterprise-demo-hero">
      <div className="page-frame py-14 md:py-20">
        <span className="enterprise-preview-badge">v0.4.0 · 公开企业闭环演示</span>
        <p className="section-kicker mt-6">Enterprise closed-loop walkthrough</p>
        <h1>AI不是替企业赌爆款，<span>而是帮助团队在下一笔钱发生前排除错误。</span></h1>
        <p>从授权材料、受审AI候选、人工共创、情景筛选、投前验证、内容资产到市场反馈，形成一条可追溯、可审核、可复用的新品进化链。</p>
        <div className="enterprise-boundary-line" role="note">
          <ShieldCheck className="h-5 w-5" />
          <strong>企业闭环演示</strong><span>固定脱敏夹具</span><span>非客户成果</span><span>真实云端能力待试点</span>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#workflow" className="primary-action px-5 py-3">查看16步闭环<ArrowRight className="h-4 w-4" /></a>
          <Link href="/workspace" className="secondary-action px-5 py-3">操作公开模拟工作台</Link>
        </div>
      </div>
    </section>

    <nav className="enterprise-demo-nav" aria-label="企业闭环演示章节">
      <div className="page-frame">
        <a href="#responsibility">责任架构</a>
        <a href="#workflow">完整流程</a>
        <a href="#agents">Agent工作流</a>
        <a href="#replication">可复制性</a>
        <a href="#evidence">技术证据</a>
        <a href="#boundaries">边界与试点</a>
      </div>
    </nav>

    <section className="page-frame delivery-section" aria-labelledby="status-title">
      <div className="delivery-heading"><p className="section-kicker">Evidence status</p><h2 id="status-title">先区分什么已实现，什么仍待验证</h2><p>本页展示工程能力与交互路径，不把固定夹具、规划能力或自动化测试写成企业经营成果。</p></div>
      <div className="enterprise-status-grid">{statuses.map(([title, body, tone]) => <article key={title} className={`enterprise-status-card ${tone}`}><span>{title}</span><p>{body}</p></article>)}</div>
    </section>

    <section id="responsibility" className="border-y border-[#DFE6E9] bg-white/60 scroll-mt-24">
      <div className="page-frame delivery-section">
        <div className="delivery-heading"><p className="section-kicker">AI + Rules + Human</p><h2>三层责任架构：候选、约束与决定互不冒充</h2><p>AI负责扩大候选与表达空间；规则负责结构、引用和Gate约束；人负责确认事实并承担最终决定。</p></div>
        <div className="enterprise-layer-grid">
          <article><Bot/><span>AI层</span><h3>生成与整理候选</h3><p>输出建议、解释、反证、不确定性、缺失输入和内容草案。当前Provider关闭，使用结构化外部候选导入与人工审核。</p><small>不能确认事实 · 不能修改Gate · 不能作最终Decision</small></article>
          <article><Code2/><span>规则层</span><h3>校验与风险控制</h3><p>执行Schema、项目内引用、Claim检查、稳定ID、输入快照哈希、stale传播和固定Gate。</p><small>规则引擎不是AI · 只处理声明过的输入</small></article>
          <article><UserCheck/><span>人工层</span><h3>确认事实与承担责任</h3><p>确认Evidence、接受Opportunity、选择Shortlist、锁定概念、审核内容、接受变更并确认Decision。</p><small>当前身份为人工自述 · 不是企业账号或审批系统</small></article>
        </div>
      </div>
    </section>

    <section id="workflow" className="page-frame delivery-section scroll-mt-24">
      <div className="delivery-heading"><p className="section-kicker">16-step governed loop</p><h2>从授权材料到下一轮的完整展示路径</h2><p>点击每一步查看对象、当前状态和责任边界。进入下一步依赖前一步的合格输入，不能先决定后补证。</p></div>
      <ol className="enterprise-workflow">{workflow.map(([number, title, object, status, body], index) => <li key={number}>
        <details open={index < 3}>
          <summary><span>{number}</span><div><strong>{title}</strong><small>{object}</small></div><b>{status}</b></summary>
          <p>{body}</p>
        </details>
      </li>)}</ol>
      <div className="trace-chain" aria-label="企业新品进化追溯链"><span>Evidence</span><ArrowRight/><span>AIProposal</span><ArrowRight/><span>Opportunity</span><ArrowRight/><span>Shortlist</span><ArrowRight/><span>Concept</span><ArrowRight/><span>Validation</span><ArrowRight/><span>Gate</span><ArrowRight/><span>Decision</span></div>
    </section>

    <section id="agents" className="border-y border-[#DFE6E9] bg-[#F3F1EC] scroll-mt-24">
      <div className="page-frame delivery-section">
        <div className="delivery-heading"><p className="section-kicker">Governed agent workflow</p><h2>Agent卡片只陈述可核验的输入、输出与人工检查点</h2><p>“已实现”表示合同、正式对象派生或规则路径可由代码和测试复核，不表示真实模型质量或企业价值已经验证。</p></div>
        <div className="enterprise-agent-grid">{agents.map(({ icon: Icon, name, status, tone, input, output, evidence, uncertainty, human, audit }) => <article key={name} className="enterprise-agent-card">
          <header><Icon/><div><h3>{name}</h3><span className={`agent-state ${tone}`}>{status}</span></div></header>
          <dl><div><dt>输入</dt><dd>{input}</dd></div><div><dt>输出Schema</dt><dd>{output}</dd></div><div><dt>Evidence引用</dt><dd>{evidence}</dd></div><div><dt>不确定性</dt><dd>{uncertainty}</dd></div><div><dt>人工检查点</dt><dd>{human}</dd></div><div><dt>Audit</dt><dd>{audit}</dd></div></dl>
        </article>)}</div>
      </div>
    </section>

    <section id="replication" className="page-frame delivery-section scroll-mt-24">
      <div className="delivery-heading"><p className="section-kicker">Category Pack</p><h2>可复制的是治理结构，不是未经验证的行业结论</h2><p>当前只实现并验证了<code>woven_apparel_v1</code>及历史模拟包；第二行业尚未开展真实试点。</p></div>
      <div className="delivery-grid three">
        <article className="delivery-card"><Layers3/><h3>可替换的品类结构</h3><ul><li>人群与使用场景</li><li>产品基因和规格字段</li><li>渠道、内容与Claim边界</li><li>验证模板和缺失输入</li></ul></article>
        <article className="delivery-card"><History/><h3>可版本化的治理件</h3><ul><li>Prompt与Schema版本</li><li>Category Pack版本</li><li>Gate规则版本</li><li>稳定实体ID与AuditEvent</li></ul></article>
        <article className="delivery-card"><AlertTriangle/><h3>当前未完成</h3><ul><li>Category Pack数据库外键</li><li>历史seed不可覆盖治理</li><li>第二行业真实验证</li><li>跨企业标准化效果评估</li></ul></article>
      </div>
    </section>

    <section id="evidence" className="border-y border-[#DFE6E9] bg-white/60 scroll-mt-24">
      <div className="page-frame delivery-section">
        <div className="delivery-heading"><p className="section-kicker">Technical evidence</p><h2>工程证据对应具体约束，不对应虚构业务分数</h2><p>公开构建与本地构建严格隔离；GitHub Pages不运行FastAPI、SQLite、附件目录或真实Provider。</p></div>
        <div className="enterprise-tech-grid">{technologies.map(item => <span key={item}>{item}</span>)}</div>
        <div className="delivery-grid three mt-8">
          <article className="delivery-card"><Database/><h3>持久化与恢复</h3><p>local_integrated使用FastAPI、SQLAlchemy、Pydantic和SQLite Schema 5；自动化测试覆盖后端重启恢复。</p></article>
          <article className="delivery-card"><Network/><h3>引用与失效</h3><p>AIProposal携带snapshot hash与项目内引用；Evidence变化按结构化引用使真实下游stale。</p></article>
          <article className="delivery-card"><ClipboardCheck/><h3>自动化证据</h3><p>后端、Vitest、public/local Playwright、双构建和公开产物扫描由GitHub Actions执行。</p></article>
        </div>
        <div className="mt-7 flex flex-wrap gap-3"><a className="secondary-action" href="https://github.com/sufangfang0123-svg/syy-ai-wb/actions/workflows/ci.yml" target="_blank" rel="noopener noreferrer">查看Quality checks</a><Link className="secondary-action" href="/proof">查看系统验收证明</Link></div>
      </div>
    </section>

    <section id="boundaries" className="page-frame delivery-section scroll-mt-24">
      <div className="delivery-heading"><p className="section-kicker">Boundaries and pilot</p><h2>当前边界必须与试点邀请同时出现</h2></div>
      <div className="enterprise-boundary-grid">
        <article><LockKeyhole/><h3>公开互动演示</h3><p>只使用固定模拟或脱敏系统验收夹具；不包含客户数据，不请求FastAPI，不证明市场需求、模型准确率或经营成果。</p></article>
        <article><Database/><h3>本地封闭试点</h3><p>单企业、单用户、本机FastAPI＋SQLite；无账号、RBAC、多租户、云生产和可信身份审计。</p></article>
        <article><Bot/><h3>AI运行边界</h3><p>Provider默认关闭，请求次数为0。已实现AIProposal合同、导入、校验、审核和stale治理，未测量Precision或Recall。</p></article>
      </div>
      <div className="delivery-cta mt-8"><div><p className="section-kicker">Next evidence</p><h2>下一步不是继续堆功能，而是跑一份授权、脱敏企业材料</h2><p>用一次人工POC测量从材料到决策单的时间、复核负担、追溯完整率、提前发现的风险和持续使用意愿。</p></div><Link href="/pilot" className="primary-action px-5 py-3">查看试点条件<ArrowRight className="h-4 w-4" /></Link></div>
    </section>
  </div>;
}
