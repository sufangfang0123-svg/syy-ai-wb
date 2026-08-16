"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ArrowRight, Check, GitCompareArrows, Lock, PencilLine, ShieldAlert } from "lucide-react";
import { useProductWorkbench } from "@/components/workbench/product-workbench-provider";
import { ProductConceptCandidate } from "@/domain/product-workbench-types";

export default function EvolutionPage() {
  const { state, selectedConcept, selectConcept, updateConcept, lockConcept } = useProductWorkbench();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reason, setReason] = useState(selectedConcept.selectionReason);
  const [draft, setDraft] = useState<Partial<ProductConceptCandidate>>({});
  const startEdit = (concept: ProductConceptCandidate) => { setEditingId(concept.id); setDraft({ sellingPoint: concept.sellingPoint, specification: concept.specification, packaging: concept.packaging, priceBand: concept.priceBand }); };
  const save = (id: string) => { updateConcept(id, draft); setEditingId(null); };
  return <div className="page-frame">
    <header className="page-heading"><div><p className="section-kicker">Product co-creation · DEMO</p><h1>产品共创台</h1><p className="page-description">围绕已确认机会比较三个固定演示候选，保留人工修改、选择理由和版本状态；当前未连接真实AI。</p></div><span className="simulation-chip">比赛概念方案 · 非全棉时代正式产品</span></header>
    <section className="concept-boundary"><ShieldAlert className="h-5 w-5" /><p><strong>候选来源：</strong>固定演示夹具或人工导入，不是AI实时生成。产品概念变更会把相关数字情景和内容版本标记为 stale，但不会修改真实 Gate 规则。</p></section>
    <section className="concept-comparison" aria-label="三个产品概念比较">{state.concepts.map((concept) => {
      const active = state.selectedConceptId === concept.id;
      const editing = editingId === concept.id;
      const original = JSON.parse(concept.originalSnapshot) as ProductConceptCandidate;
      return <article key={concept.id} className={`concept-proposal ${active ? "active" : ""}`}>
        <header><div><span className="meta-chip">{concept.id} · V{concept.version}</span><h2>{concept.name}</h2></div><span className={concept.locked ? "approval-badge" : "warning-badge"}>{concept.locked ? <><Lock className="h-3.5 w-3.5" />已锁定</> : "待锁定"}</span></header>
        <div className="unique-variable"><GitCompareArrows className="h-4 w-4" /><span>唯一变量</span><strong>{concept.uniqueVariable}</strong></div>
        <dl className="concept-specs"><Row label="目标用户" value={concept.targetUser} /><Row label="使用场景" value={concept.scenario} /><Row label="核心需求" value={concept.need} /><Row label="产品基因" value={concept.genes.join(" · ")} /><Row label="功能" value={concept.functions} /><Row label="材质" value={concept.material} /></dl>
        {editing ? <div className="concept-edit"><Field label="规格" value={String(draft.specification ?? "")} onChange={(value) => setDraft({ ...draft, specification: value })} /><Field label="包装假设" value={String(draft.packaging ?? "")} onChange={(value) => setDraft({ ...draft, packaging: value })} /><Field label="价格带假设" value={String(draft.priceBand ?? "")} onChange={(value) => setDraft({ ...draft, priceBand: value })} /><Field label="核心卖点" value={String(draft.sellingPoint ?? "")} onChange={(value) => setDraft({ ...draft, sellingPoint: value })} /><div className="flex gap-2"><button className="primary-action" onClick={() => save(concept.id)}>保存人工版本</button><button className="secondary-action" onClick={() => setEditingId(null)}>取消</button></div></div> : <dl className="concept-specs"><Row label="规格" value={concept.specification} changed={concept.specification !== original.specification} /><Row label="包装假设" value={concept.packaging} changed={concept.packaging !== original.packaging} /><Row label="价格带假设" value={concept.priceBand} changed={concept.priceBand !== original.priceBand} /><Row label="核心卖点" value={concept.sellingPoint} changed={concept.sellingPoint !== original.sellingPoint} /></dl>}
        <div className="concept-risks"><p><AlertTriangle className="h-4 w-4" /><span><b>供应风险</b>{concept.supplyRisk}</span></p><p><ShieldAlert className="h-4 w-4" /><span><b>合规风险</b>{concept.complianceRisk}</span></p></div>
        <div className="trace-chips">{concept.evidenceIds.map((id) => <Link key={id} href="/evidence">Evidence {id}</Link>)}{concept.assumptionIds.map((id) => <Link key={id} href="/assumptions">{id}</Link>)}</div>
        <div className="concept-actions"><button className="secondary-action" onClick={() => startEdit(concept)}><PencilLine className="h-4 w-4" />编辑人工版本</button><button className={active ? "primary-action" : "secondary-action"} onClick={() => selectConcept(concept.id, reason || "负责人选择该概念进入数字情景整理。")}>{active ? <Check className="h-4 w-4" /> : null}{active ? "当前方案" : "选择方案"}</button></div>
      </article>;
    })}</section>
    <section className="panel-surface mt-6"><div className="panel-title-row"><div><p className="section-kicker">Human selection</p><h2>选择理由与版本锁定</h2></div><span className="simulation-chip">{selectedConcept.id} · V{selectedConcept.version}</span></div><label className="form-field mt-4"><span>人工选择理由</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="记录取舍依据、反证和仍需验证的问题" /></label><div className="mt-4 flex flex-wrap gap-3"><button className="primary-action" onClick={() => { selectConcept(selectedConcept.id, reason); lockConcept(selectedConcept.id); }}><Lock className="h-4 w-4" />确认并锁定当前版本</button><Link href="/launch" className="secondary-action">进入数字实验<ArrowRight className="h-4 w-4" /></Link></div></section>
  </div>;
}

function Row({ label, value, changed = false }: { label: string; value: string; changed?: boolean }) { return <div><dt>{label}</dt><dd>{value}{changed ? <span className="changed-chip">人工已修改</span> : null}</dd></div>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="form-field"><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
