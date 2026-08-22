"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Ban, CheckCircle2, ExternalLink, Filter, GitBranch, Grid2X2, ListFilter, Search, ShieldCheck, UserRound } from "lucide-react";
import { useEvolution } from "@/components/demo/evolution-provider";
import { EvidenceBadge } from "@/components/evidence/evidence-badge";
import { EvidenceUpgradePath } from "@/components/evidence/evidence-upgrade-path";
import { EvidenceLevel, Opportunity } from "@/domain/types";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useProductWorkbench } from "@/components/workbench/product-workbench-provider";
import { LocalWorkbenchStage } from "@/components/workbench/local-workbench-stage";
import { WorkflowStatus } from "@/domain/product-workbench-types";

const statusLabel: Record<WorkflowStatus, string> = {
  pending: "待人工复核",
  candidate: "人工候选",
  confirmed: "人工已确认",
  rejected: "人工已否决",
};

const levelOrder: EvidenceLevel[] = ["A", "B", "C", "D"];

export default function OpportunitiesPage() {
  const { mode } = useProductWorkbench();
  return mode === "local_api" ? <LocalWorkbenchStage stage="opportunities" /> : <PublicOpportunitiesPage />;
}

function PublicOpportunitiesPage() {
  const { state, selectedOpportunity, selectOpportunity } = useEvolution();
  const { state: workbench, reviewOpportunity } = useProductWorkbench();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<"all" | EvidenceLevel>("all");
  const [dataType, setDataType] = useState("all");
  const [view, setView] = useState<"active" | "failed">("active");
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");

  const effectiveStatus = (id: string): WorkflowStatus => workbench.opportunityStatus[id] ?? "pending";
  const evidenceFor = (opportunity: Opportunity) => state.evidence.filter((item) => opportunity.evidenceIds.includes(item.id));
  const confirmedFor = (opportunity: Opportunity) => evidenceFor(opportunity).filter((item) => item.reviewed);
  const highestLevelFor = (opportunity: Opportunity): EvidenceLevel => {
    const levels = evidenceFor(opportunity).map((item) => item.level);
    return levelOrder.find((candidate) => levels.includes(candidate)) ?? "D";
  };

  useEffect(() => {
    setReviewNote(workbench.opportunityNotes[selectedOpportunity.id] ?? "");
  }, [selectedOpportunity.id, workbench.opportunityNotes]);

  const visibleEvidence = useMemo(() => state.evidence.filter((item) => {
    const matchesQuery = `${item.id}${item.excerpt}${item.persona}${item.scenario}${item.painPoint}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (level === "all" || item.level === level) && (dataType === "all" || item.dataType === dataType);
  }), [state.evidence, query, level, dataType]);
  const visibleOpportunities = state.opportunities.filter((item) => view === "failed" ? effectiveStatus(item.id) === "rejected" : effectiveStatus(item.id) !== "rejected");
  const confirmedEvidence = confirmedFor(selectedOpportunity);
  const currentStatus = effectiveStatus(selectedOpportunity.id);
  const canReview = Boolean(reviewNote.trim());
  const canContinue = currentStatus === "confirmed";

  const chooseOpportunity = (id: string) => {
    selectOpportunity(id);
    setReviewNote(workbench.opportunityNotes[id] ?? "");
    if (window.innerWidth < 1180) setDetailOpen(true);
  };

  const saveReview = (status: WorkflowStatus) => {
    if (!canReview) return;
    reviewOpportunity(selectedOpportunity.id, status, reviewNote.trim());
    if (status === "rejected") setView("failed");
  };

  const detailPanel = <>
    <div className="border-b border-[#E1E6E3] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><EvidenceBadge level={highestLevelFor(selectedOpportunity)} /><span className="font-mono text-xs text-[#7D8B85]">{selectedOpportunity.id}</span></div>
        <span className={`status-text status-${currentStatus}`}>{statusLabel[currentStatus]}</span>
      </div>
      <h2 className="mt-4 text-2xl font-semibold text-[#26312D]">{selectedOpportunity.name}</h2>
      <p className="mt-2 text-xs leading-5 text-[#636E72]">固定演示机会卡。证据等级只描述来源强度，不表示市场成功概率。</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Mini label="已复核Evidence" value={String(confirmedEvidence.length)} />
        <Mini label="反向证据" value={String(selectedOpportunity.counterEvidence.length)} />
        <Mini label="尚缺证据" value={String(selectedOpportunity.missingEvidence.length)} />
      </div>
    </div>
    <div className="opportunity-detail-scroll space-y-5 overflow-y-auto p-5">
      <Detail label="目标人群" value={selectedOpportunity.persona} />
      <Detail label="核心场景" value={selectedOpportunity.scenario} />
      <Detail label="JTBD" value={selectedOpportunity.jtbd} />
      <Detail label="核心痛点" value={selectedOpportunity.painPoint} />
      <Detail label="当前替代方案" value={selectedOpportunity.alternative} />
      <Detail label="待验证产品假设" value={selectedOpportunity.hypothesis} />
      <Detail label="责任人" value={selectedOpportunity.owner} />
      <section className="rounded-xl border border-[#E2DCCF] bg-[#F8F4EC] p-4">
        <div className="flex items-center gap-2 text-[#6A5B42]"><ShieldCheck className="h-4 w-4" /><h3 className="text-sm font-semibold">进入下一步条件</h3></div>
        <p className="mt-2 text-xs leading-5 text-[#6D675D]">{canContinue ? "已由负责人明确确认；可进入概念比较，但仍不表示需求成立。" : "尚不可进入正式下一步；需要填写理由并由负责人明确确认。"}</p>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold">尚缺证据</h3>
        <ul className="space-y-2 text-xs leading-5 text-[#636E72]">{selectedOpportunity.missingEvidence.map((item) => <li key={item} className="rounded-lg bg-[#F3F5F3] px-3 py-2">{item}</li>)}</ul>
      </section>
      <section className="counter-evidence">
        <div className="mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /><h3 className="text-sm font-semibold">反向证据</h3></div>
        {selectedOpportunity.counterEvidence.map((counter) => <div key={counter.id} className="border-t border-[#E9C9C5] py-3 first:border-0 first:pt-0"><p className="text-xs font-medium text-[#7A3E3E]">{counter.statement}</p><dl className="mt-2 grid gap-1 text-[11px] text-[#805D5D]"><div><dt>替代方案</dt><dd>{counter.alternative}</dd></div><div><dt>不购买原因</dt><dd>{counter.nonPurchaseReason}</dd></div><div><dt>最危险假设</dt><dd>{counter.riskyAssumption}</dd></div><div><dt>Evidence引用</dt><dd>{counter.evidenceId}</dd></div></dl></div>)}
      </section>
      <EvidenceUpgradePath level={highestLevelFor(selectedOpportunity)} completed={confirmedEvidence.length} />
      <section className="opportunity-review">
        <label className="form-field"><span>人工判断与原因（必填）</span><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="记录采用、候选或否决的证据依据与限制" /></label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button disabled={!canReview} onClick={() => saveReview("candidate")} className="secondary-action justify-center"><CheckCircle2 className="h-4 w-4" />标记候选</button>
          <button disabled={!canReview} onClick={() => saveReview("confirmed")} className="primary-action justify-center"><ShieldCheck className="h-4 w-4" />人工确认机会</button>
          <button disabled={!canReview} onClick={() => saveReview("rejected")} className="danger-action justify-center"><Ban className="h-4 w-4" />不采用</button>
          {canContinue ? <Link href="/evolution" className="secondary-action justify-center"><GitBranch className="h-4 w-4" />进入产品共创</Link> : <button disabled className="secondary-action justify-center" aria-describedby="opportunity-next-step-reason"><GitBranch className="h-4 w-4" />进入产品共创</button>}
        </div>
        <p id="opportunity-next-step-reason" className="mt-2 text-[11px] leading-5 text-[#6F7D77]">当前状态：{statusLabel[currentStatus]}。所有人工操作均写入浏览器中的模拟产品工作台审计；未确认机会不能进入下一步。</p>
      </section>
    </div>
  </>;

  return <div className="page-frame">
    <div className="page-heading"><div><p className="section-kicker">Opportunity evidence workbench · fixed demo</p><h1 className="section-title">需求机会</h1><p className="page-description">只展示证据、反证、缺口与人工状态；不计算市场潜力、成功概率或综合排名。</p></div><div className="segmented"><button onClick={() => setView("active")} className={view === "active" ? "active" : ""}>活跃机会</button><button onClick={() => setView("failed")} className={view === "failed" ? "active" : ""}>失败谱系</button></div></div>
    <div className="opportunity-layout">
      <aside className="workbench-panel"><PanelTitle icon={ListFilter} title="模拟信号库" count={visibleEvidence.length} /><div className="space-y-2 border-b border-[#E1E6E3] p-3"><label className="search-field"><Search className="h-4 w-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索证据、人群、场景…" aria-label="搜索消费信号" /></label><div className="grid grid-cols-2 gap-2"><select value={level} onChange={(event) => setLevel(event.target.value as "all" | EvidenceLevel)} aria-label="证据等级筛选"><option value="all">全部等级</option><option value="A">A级</option><option value="B">B级</option><option value="C">C级</option><option value="D">D级</option></select><select value={dataType} onChange={(event) => setDataType(event.target.value)} aria-label="数据类型筛选"><option value="all">全部模拟数据</option><option value="humanResearch">模拟人研夹具</option><option value="publicEvidence">模拟公开信号</option><option value="syntheticSimulation">模拟情景</option></select></div></div><div className="max-h-[calc(100vh-300px)] space-y-2 overflow-y-auto p-3">{visibleEvidence.map((item) => <article key={item.id} className={`signal-card ${selectedOpportunity.evidenceIds.includes(item.id) ? "signal-card-linked" : ""}`}><div className="flex items-center justify-between gap-2"><span className="font-mono text-[11px] font-semibold text-[#52625B]">{item.id}</span><EvidenceBadge level={item.level} compact /></div><p className="mt-2 text-xs font-medium leading-5 text-[#2D3436]">{item.excerpt}</p><div className="mt-2 flex flex-wrap gap-1"><span className="meta-chip">{item.platform}</span><span className="meta-chip">{item.scenario}</span>{item.isHuman ? <span className="meta-chip meta-human"><UserRound className="h-3 w-3" />模拟人研夹具</span> : null}{item.dataType === "syntheticSimulation" ? <span className="simulation-mini">模拟预筛</span> : null}</div>{item.sourceUrl && item.dataType !== "syntheticSimulation" ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#5B8C5A]">查看允许公开的来源<ExternalLink className="h-3 w-3" /></a> : <p className="mt-2 text-[11px] text-[#7D8B85]">无公开URL · 模拟/脱敏来源</p>}</article>)}</div></aside>
      <section className="workbench-panel"><PanelTitle icon={Grid2X2} title={view === "active" ? "固定机会夹具" : "失败机会"} count={visibleOpportunities.length} /><div className="border-b border-[#E1E6E3] px-4 py-3"><div className="flex items-center gap-2 text-xs text-[#636E72]"><Filter className="h-3.5 w-3.5" />列表按固定ID展示，不代表优先级或排名</div></div><div className="workbench-scroll space-y-3 overflow-y-auto p-4">{visibleOpportunities.length === 0 ? <div className="empty-state"><GitBranch className="h-9 w-9" /><p>暂无失败机会。填写理由并人工否决后，记录会进入失败谱系。</p></div> : visibleOpportunities.map((opportunity) => { const status = effectiveStatus(opportunity.id); return <button key={opportunity.id} onClick={() => chooseOpportunity(opportunity.id)} className={`opportunity-card ${selectedOpportunity.id === opportunity.id ? "opportunity-card-active" : ""}`}><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="font-mono text-xs font-semibold text-[#52625B]">{opportunity.id}</span><EvidenceBadge level={highestLevelFor(opportunity)} compact /></div><span className={`status-text status-${status}`}>{statusLabel[status]}</span></div><h2 className="mt-3 text-left text-lg font-semibold text-[#2D3436]">{opportunity.name}</h2><p className="mt-2 line-clamp-2 text-left text-xs leading-5 text-[#636E72]">{opportunity.jtbd}</p><div className="mt-4 grid grid-cols-3 gap-2"><Mini label="已复核Evidence" value={String(confirmedFor(opportunity).length)} /><Mini label="反向证据" value={String(opportunity.counterEvidence.length)} /><Mini label="尚缺证据" value={String(opportunity.missingEvidence.length)} /></div><div className="mt-3 flex flex-wrap gap-1"><span className="meta-chip">{opportunity.persona}</span><span className="meta-chip">{opportunity.scenario}</span></div><span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#315C46]">查看事实与人工状态<ArrowRight className="h-3 w-3" /></span></button>; })}</div></section>
      <aside className="workbench-panel detail-panel opportunity-detail-desktop">{detailPanel}</aside>
    </div>
    <Sheet open={detailOpen} onOpenChange={setDetailOpen}><SheetContent className="w-[94vw] max-w-[560px] overflow-hidden p-0"><SheetHeader className="sr-only"><SheetTitle>机会详情</SheetTitle><SheetDescription>查看证据、反向证据、缺口和人工状态</SheetDescription></SheetHeader>{detailPanel}</SheetContent></Sheet>
  </div>;
}

function PanelTitle({ icon: Icon, title, count }: { icon: React.ElementType; title: string; count: number }) { return <div className="flex h-14 items-center justify-between border-b border-[#E1E6E3] px-4"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-[#5B8C5A]" /><h2 className="text-sm font-semibold">{title}</h2></div><span className="count-chip">{count}</span></div>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-[#F3F5F3] p-2 text-left"><p className="text-[10px] text-[#7D8B85]">{label}</p><p className="mt-0.5 text-sm font-semibold text-[#315C46]">{value}</p></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <section><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7D8B85]">{label}</p><p className="mt-1.5 text-sm leading-6 text-[#37423E]">{value}</p></section>; }
