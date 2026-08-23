import Link from "next/link";
import { ArrowRight, BookOpenCheck, Bot, FileCheck2, Film, Github, Scale, ShieldCheck, UserCheck } from "lucide-react";

const repository = "https://github.com/sufangfang0123-svg/syy-ai-wb";
const releaseBase = `${repository}/releases/download/v0.4.0-competition-closeout`;

const responsibilities = [
  [Bot, "AI", "提出带引用的候选、反证、不确定性与缺失输入；当前公开版不调用Provider。"],
  [Scale, "规则", "校验Schema、项目引用、stale与NDG_GATE_V0.3.0；不冒充模型。"],
  [UserCheck, "人工", "确认事实、选择Shortlist、审核候选并承担最终Decision责任。"],
] as const;

const statusRows = [
  ["已实现", "公开固定演示、本地Evidence→Decision闭环、AIProposal合同、Audit、stale、固定Gate"],
  ["固定演示", "棉品案例、100个未评分Scenario、模拟内容与反馈；均非客户成果"],
  ["待试点", "授权脱敏企业材料、人工复核时间、追溯完整率与业务持续使用意愿"],
  ["规划", "真实Provider评测、飞书集成、账号、RBAC、多租户与云生产"],
] as const;

export default function JudgeKitPage() {
  return <div>
    <section className="delivery-hero">
      <div className="page-frame py-14 md:py-20">
        <span className="enterprise-preview-badge">v0.4.0 · 评委快速入口</span>
        <p className="section-kicker mt-6">Competition review kit</p>
        <h1>三分钟看清：AI负责候选，规则负责约束，<span>人负责最终决定。</span></h1>
        <p>Evolution Lab · Next-Dollar Gate帮助新品负责人在下一笔打样、备货、投放或渠道费用发生前，识别最高风险假设、补齐关键证据，并记录继续、补证或停止的人工决定。</p>
        <div className="enterprise-boundary-line" role="note"><ShieldCheck className="h-5 w-5"/><strong>固定脱敏演示</strong><span>Provider请求0次</span><span>非客户成果</span><span>非云生产系统</span></div>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/workspace" className="primary-action px-5 py-3">立即体验产品<ArrowRight className="h-4 w-4"/></Link><Link href="/enterprise-demo" className="secondary-action px-5 py-3">查看企业闭环</Link></div>
      </div>
    </section>

    <section className="page-frame delivery-section">
      <div className="delivery-heading"><p className="section-kicker">60-second route</p><h2>评委快速体验路径</h2><p>从公开夹具理解交互，再用技术与QA证据核对真实边界。</p></div>
      <ol className="pilot-flow">{[
        ["打开工作台", "查看下一笔投入、Evidence与当前Gate"],
        ["进入数字情景候选宇宙", "确认100项全部未评分，Shortlist必须人工选择"],
        ["查看Decision", "区分只读Gate建议与人工最终决定"],
        ["回到本页", "核对AIProposal、测试、材料、视频与边界"],
      ].map(([title, body], index)=><li key={title}><span>{String(index+1).padStart(2,"0")}</span><div><strong>{title}</strong><small className="block mt-1">{body}</small></div></li>)}</ol>
    </section>

    <section className="border-y border-[#DFE6E9] bg-white/60"><div className="page-frame delivery-section">
      <div className="delivery-heading"><p className="section-kicker">AI + Rules + Human</p><h2>为什么不是普通ChatGPT文案生成</h2><p>模型候选必须经过稳定ID、输入快照、Evidence引用、Schema、人工审核、Audit和stale治理，且不能进入固定Gate规则。</p></div>
      <div className="enterprise-layer-grid">{responsibilities.map(([Icon,title,body])=><article key={title}><Icon/><span>{title}层</span><h3>{title}承担什么</h3><p>{body}</p></article>)}</div>
      <div className="mt-7"><Link href="/enterprise-demo#ai-proposal-instance" className="secondary-action px-5 py-3">查看AIProposal工作实例<ArrowRight className="h-4 w-4"/></Link></div>
    </div></section>

    <section className="page-frame delivery-section">
      <div className="delivery-heading"><p className="section-kicker">Implementation truth</p><h2>能力状态不混算</h2></div>
      <div className="enterprise-status-grid">{statusRows.map(([title,body],index)=><article key={title} className={`enterprise-status-card ${["implemented","demo","pilot","planned"][index]}`}><span>{title}</span><p>{body}</p></article>)}</div>
    </section>

    <section className="border-y border-[#DFE6E9] bg-[#F3F1EC]"><div className="page-frame delivery-section">
      <div className="delivery-heading"><p className="section-kicker">Submission evidence</p><h2>材料、代码与视频入口</h2><p>以下均为公开链接；视频由真实公开站画面合成，不包含账号、客户材料或私有数据库。</p></div>
      <div className="delivery-grid three">
        <article className="delivery-card"><Film/><h3>演示视频</h3><p>180秒完整版与60秒精华版，均保留固定演示、Provider 0和非云生产边界。</p><div className="mt-4 flex flex-wrap gap-2"><a className="secondary-action" href={`${releaseBase}/evolution-lab-v040-full-180s.mp4`} target="_blank" rel="noopener noreferrer">180秒MP4</a><a className="secondary-action" href={`${releaseBase}/evolution-lab-v040-highlight-60s.mp4`} target="_blank" rel="noopener noreferrer">60秒MP4</a></div></article>
        <article className="delivery-card"><BookOpenCheck/><h3>比赛材料</h3><p>参赛正文、30/30/20/20证据映射、评委反方问题、AI架构和飞书粘贴终稿。</p><a className="secondary-action mt-4" href={`${repository}/blob/main/docs/submission-index-v0.4.0.md`} target="_blank" rel="noopener noreferrer">打开参赛索引</a></article>
        <article className="delivery-card"><Github/><h3>工程证据</h3><p>源代码、后端与前端测试、public/local E2E、双构建及公开产物扫描。</p><a className="secondary-action mt-4" href={`${repository}/actions/workflows/ci.yml`} target="_blank" rel="noopener noreferrer">查看Quality checks</a></article>
      </div>
    </div></section>

    <section className="page-frame delivery-section"><div className="delivery-cta"><div><p className="section-kicker">Evidence boundary</p><h2>当前证据能证明工程路径，不能证明市场与商业结果</h2><p>尚未证明真实需求、客户采用、模型准确率、销量提升、ROI或企业生产部署能力。Category Pack复制的是治理结构，不是爆款结论。</p></div><Link href="/proof" className="primary-action px-5 py-3"><FileCheck2 className="h-4 w-4"/>查看验收证明</Link></div></section>
  </div>;
}
