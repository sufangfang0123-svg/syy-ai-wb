"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, ArrowRight, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { useDecision } from "@/components/decision/decision-provider";
import { DataBoundary, EmptyState, WorkspaceHeading } from "@/components/decision/workspace-ui";
import { EvidenceLevel } from "@/domain/types";

export default function EvidencePage() {
  const { state, addEvidence } = useDecision();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState({ title: "", source: "", sourceUrl: "", level: "C" as EvidenceLevel, finding: "", scope: "", limitation: "" });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (draft.sourceUrl && !publicSourceUrl(draft.sourceUrl)) {
      setNotice("公开来源URL仅支持HTTP或HTTPS地址；本次Evidence尚未保存。");
      return;
    }
    addEvidence(draft);
    setDraft({ title: "", source: "", sourceUrl: "", level: "C", finding: "", scope: "", limitation: "" });
    setOpen(false);
    setNotice("Evidence已保存，当前尚未关联假设。需由负责人选择支持、反驳或缺口关系；只有确认且建立关系的Evidence才影响Gate。");
  };
  return <div className="page-frame">
    <WorkspaceHeading eyebrow="Evidence Hub" title="证据库" description="每条证据必须说明从哪里来、能支持什么、不能支持什么。证据不足或互相冲突时，系统必须停止强行判断。" actions={<button onClick={() => setOpen(!open)} className="primary-action"><Plus className="h-4 w-4" />录入证据</button>} />
    <DataBoundary />
    {notice ? <div className="service-status available mb-5" role="status"><div><strong>Evidence尚未建立因果关系</strong><p>{notice}</p></div></div> : null}
    {open ? <form onSubmit={submit} className="panel-surface mb-5"><div className="form-grid"><label className="form-field"><span>证据标题</span><input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label className="form-field"><span>来源</span><input required value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} /></label><label className="form-field"><span>公开来源URL（可空）</span><input type="url" value={draft.sourceUrl} onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })} placeholder="https://公开且允许访问的来源" /></label><label className="form-field"><span>证据等级</span><select value={draft.level} onChange={(event) => setDraft({ ...draft, level: event.target.value as EvidenceLevel })}>{["A", "B", "C", "D"].map((level) => <option key={level}>{level}</option>)}</select></label><label className="form-field"><span>适用范围</span><input required value={draft.scope} onChange={(event) => setDraft({ ...draft, scope: event.target.value })} /></label><label className="form-field form-field-wide"><span>观察到的事实</span><textarea required value={draft.finding} onChange={(event) => setDraft({ ...draft, finding: event.target.value })} /></label><label className="form-field form-field-wide"><span>限制与不能支持的结论</span><textarea required value={draft.limitation} onChange={(event) => setDraft({ ...draft, limitation: event.target.value })} /></label></div><button className="primary-action mt-5">保存证据卡</button></form> : null}
    {state.evidence.length === 0 ? <EmptyState title="尚无证据，不能生成结论" body="请先录入评论、访谈、问卷、销售数据、竞品、报价或历史实验。" /> : <div className="grid gap-4">{state.evidence.map((item, index) => <article key={item.id} className="evidence-record" data-guide={index === 0 ? "evidence-card" : undefined}><div className="evidence-level-block"><strong>{item.level}</strong><span>{item.level === "A" ? "企业行为" : item.level === "B" ? "B级方法 · 模拟人研夹具" : item.level === "C" ? "公开证据" : "合成假设"}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2>{item.title}</h2><span className="meta-chip">{item.id}</span>{item.conflictsWith ? <span className="conflict-chip"><AlertTriangle className="h-3 w-3" />与 {item.conflictsWith} 存在张力</span> : null}</div><p className="mt-2 text-sm leading-6 text-[#46554E]">{item.finding}</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><Meta label="来源" value={item.source} /><Meta label="适用范围" value={item.scope} /><Meta label="限制" value={item.limitation} /></div></div>{publicSourceUrl(item.sourceUrl) ? <a className="evidence-source-link" href={publicSourceUrl(item.sourceUrl)} target="_blank" rel="noopener noreferrer" aria-label={`打开公开来源：${item.source}`}><ExternalLink className="h-4 w-4" />查看公开来源</a> : <span className="evidence-source-label">模拟/脱敏来源</span>}</article>)}</div>}
    <div className="mt-6 flex justify-end"><Link href="/assumptions" className="primary-action">进入风险假设<ArrowRight className="h-4 w-4" /></Link></div>
  </div>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="evidence-meta"><span>{label}</span><p>{value}</p></div>;
}

function publicSourceUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch { return undefined; }
}
