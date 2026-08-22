import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Banknote, Blocks, ClipboardCheck, FileCheck2, FlaskConical, GitBranch, History, Network, ShieldCheck, Target } from "lucide-react";

const repo = "https://github.com/sufangfang0123-svg/syy-ai-wb";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const loop = [
  ["01", "明确下一笔投入", "把打样、备货、投放或渠道费用写成一个可回答的决策问题。"],
  ["02", "导入并确认Evidence", "保留材料原文、来源、时间、限制和确认状态。"],
  ["03", "建立关键假设与关系", "由负责人明确Evidence支持或反驳哪项假设，不自动制造因果关系。"],
  ["04", "设计阈值化Validation", "预先记录指标、方向、基线、通过阈值、停止阈值和验证成本。"],
  ["05", "执行Gate并人工决定", "确定性规则计算继续、补证或停止；人工负责人记录最终决定和理由。"],
  ["06", "失效、下一轮与导出", "影响结论的数据变化使旧Gate和Decision变为stale，历史保留并可导出。"],
] as const;

const innovations = [
  [Banknote, "围绕下一笔投入", "不追求泛化的创意数量，先回答下一笔不可逆费用是否值得发生。"],
  [Target, "按错误代价排序", "优先处理高损失、可避免且证据不足的关键假设。"],
  [FlaskConical, "明确下一项待补证据", "由负责人把结论缺口转成可设阈值的验证动作；本版不自动生成实验。"],
  [ShieldCheck, "规则与责任分离", "Gate由可审计规则计算，最终决定由人工负责人确认。"],
  [GitBranch, "变化触发失效", "关键数据改变后，旧结论明确标记stale，不静默覆盖。"],
  [History, "历史不覆盖", "每轮Gate、Decision、结果和审计事件都保留在追溯链中。"],
] as const;

const frames = [
  ["01-project-created.jpg", "01 创建系统验收项目"],
  ["02-material-imported.jpg", "02 导入固定脱敏材料"],
  ["03-evidence-confirmed.jpg", "03 人工确认Evidence"],
  ["04-assumptions-linked.jpg", "04 建立假设与人工关系"],
  ["05-validation-results.jpg", "05 设置Validation并回填结果"],
  ["06-gate-evaluated.jpg", "06 执行确定性Gate"],
  ["07-human-decision.jpg", "07 记录人工Decision"],
  ["08-decision-stale.jpg", "08 数据变化触发stale"],
  ["09-next-round.jpg", "09 创建下一轮并保留历史"],
  ["10-export-ready.jpg", "10 核验JSON导出与追溯"],
] as const;

export default function ProofPage() {
  return <div>
    <section className="delivery-hero"><div className="page-frame py-14 md:py-20"><span className="enterprise-preview-badge">系统验收证明 · 非客户成果</span><p className="section-kicker mt-6">Evolution Lab · Next-Dollar Gate v0.4.0</p><h1>为什么下一笔不可逆新品费用，<span>需要先补足关键证据。</span></h1><p>面向新品负责人、产品负责人和中小企业经营者，在打样、开模、备货、投放或渠道费用发生前，用可追溯证据判断继续、补证还是停止。</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/pilot" className="primary-action px-5 py-3">查看企业试点说明<ArrowRight className="h-4 w-4" /></Link><Link href="/enterprise-demo" className="secondary-action px-5 py-3">查看企业闭环演示</Link><Link href="/workspace" className="secondary-action px-5 py-3">体验模拟流程</Link></div></div></section>

    <section className="page-frame delivery-section"><div className="delivery-heading"><p className="section-kicker">Decision gap</p><h2>现有工具能整理信息，却难以承担投前决策追溯</h2></div><div className="delivery-grid three"><ProofCard icon={Blocks} title="Excel与散落材料" body="能记录数据，但证据、假设、验证、Gate与历史版本容易断开。" /><ProofCard icon={FileCheck2} title="问卷与研究报告" body="能提供局部事实，但不直接明确下一项待补证据及验证方案。" /><ProofCard icon={Network} title="通用生成式AI" body="能辅助表达和整理，但不可替代来源核验、确定性Gate和人工责任。" /></div></section>

    <section className="border-y border-[#DFE6E9] bg-white/60"><div className="page-frame delivery-section"><div className="delivery-heading"><p className="section-kicker">Six-step closed loop</p><h2>Next-Dollar Gate 六步闭环</h2><p>Evidence → Assumption → Validation → Gate → Decision 的每个判断都回到具体记录。</p></div><div className="proof-loop">{loop.map(([number,title,body])=><article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div><div className="trace-chain" aria-label="追溯关系"><span>Evidence</span><ArrowRight/><span>Assumption</span><ArrowRight/><span>Validation</span><ArrowRight/><span>Gate</span><ArrowRight/><span>Decision</span></div></div></section>

    <section className="page-frame delivery-section"><div className="delivery-heading"><p className="section-kicker">Deterministic gate</p><h2>五维Gate与人工责任边界</h2><p>NEED、COMMERCIAL、PRODUCT、SUPPLY、COMPLIANCE 由 <code>NDG_GATE_V0.3.0</code> 确定性规则计算；人工负责人作最终决定。当前版本没有AI模型参与Gate。规则只会从负责人已录入的验证方案中给出执行顺序，不会自动设计实验。</p></div><div className="gate-dimensions">{["NEED 需求","COMMERCIAL 商业","PRODUCT 产品","SUPPLY 供应","COMPLIANCE 合规"].map(item=><span key={item}>{item}</span>)}</div><div className="delivery-grid three mt-8">{innovations.map(([Icon,title,body])=><ProofCard key={title} icon={Icon} title={title} body={body}/>)}</div></section>

    <section className="border-y border-[#DFE6E9] bg-[#F3F1EC]"><div className="page-frame delivery-section"><div className="delivery-heading"><p className="section-kicker">System acceptance evidence</p><h2>固定脱敏UAT：本地真实项目闭环系统验收</h2><p>以下为系统验收案例，使用固定脱敏夹具在 local_integrated 构建运行；不是客户案例、访谈成果或经营结果。</p></div><div className="uat-gallery">{frames.map(([frame,title])=><a key={frame} href={`${basePath}/evidence/uat-v0.3.1/frames/${frame}`} target="_blank" rel="noopener noreferrer" aria-label={`打开${title}`}><Image src={`${basePath}/evidence/uat-v0.3.1/frames/${frame}`} alt={`系统验收案例：${title}`} width={1440} height={900} loading="eager" unoptimized/><span>{title}</span></a>)}</div><div className="mt-6 flex flex-wrap gap-3"><a className="secondary-action" href={`${basePath}/evidence/uat-v0.3.1/system-acceptance-export.json`} target="_blank" rel="noopener noreferrer">查看脱敏UAT JSON</a><a className="secondary-action" href={`${basePath}/evidence/uat-v0.3.1/manifest.json`} target="_blank" rel="noopener noreferrer">查看证据清单与SHA-256</a></div></div></section>

    <section className="page-frame delivery-section"><div className="delivery-heading"><p className="section-kicker">Verified capability</p><h2>当前已完成能力与工程证据</h2></div><div className="delivery-grid two"><article className="delivery-card"><BadgeCheck/><h3>本地真实闭环</h3><ul><li>FastAPI＋SQLite单企业本地持久化</li><li>材料导入、Evidence确认及人工关系</li><li>五维假设、阈值验证、Gate与人工Decision</li><li>stale、下一轮、审计与JSON导出</li></ul></article><article className="delivery-card"><ClipboardCheck/><h3>自动化与部署</h3><ul><li>后端、单元、public/local E2E</li><li>public_demo与local_integrated双构建</li><li>公开产物敏感文件扫描</li><li><a href={`${repo}/actions/workflows/ci.yml`} target="_blank" rel="noopener noreferrer">查看持续集成</a> · <a href={`${repo}/actions/workflows/deploy.yml`} target="_blank" rel="noopener noreferrer">查看Pages部署</a></li></ul></article></div><div className="boundary-panel"><ShieldCheck/><div><strong>公开与本地严格分离</strong><p>GitHub Pages只运行 public_demo：固定模拟夹具、方法说明和系统验收材料。真实项目、FastAPI、SQLite与私有附件只在企业本机的 local_integrated 运行。</p></div></div></section>

    <section className="page-frame delivery-final"><div className="delivery-cta"><div><p className="section-kicker">Known limits</p><h2>当前是单企业、本地、单用户的封闭试点</h2><p>没有云后端、账号、RBAC、多租户、企业审批、全网采集或真实AI分析；不得用于自动作出生产、投资、合规或经营决策。</p></div><Link href="/pilot" className="primary-action px-5 py-3">查看试点条件<ArrowRight className="h-4 w-4" /></Link></div></section>
  </div>;
}

function ProofCard({icon:Icon,title,body}:{icon:typeof Blocks;title:string;body:string}){return <article className="delivery-card"><Icon/><h3>{title}</h3><p>{body}</p></article>}
