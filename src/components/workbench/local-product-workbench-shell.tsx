"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { BarChart3, Boxes, CheckSquare2, ClipboardList, FileText, FlaskConical, LayoutDashboard, Megaphone, ShieldCheck } from "lucide-react";
import { useProductWorkbench } from "@/components/workbench/product-workbench-provider";

const stages = [
  {href:"/workspace",label:"项目总览",step:"01",icon:LayoutDashboard,paths:["/workspace"]},
  {href:"/insights",label:"洞察与机会",step:"02",icon:BarChart3,paths:["/insights","/opportunities","/radar"]},
  {href:"/launch",label:"情景宇宙与短名单",step:"03",icon:FlaskConical,paths:["/launch"]},
  {href:"/evolution",label:"基于短名单共创",step:"04",icon:Boxes,paths:["/evolution"]},
  {href:"/evidence",label:"预验证 Gate",step:"05",icon:ShieldCheck,paths:["/evidence","/assumptions","/tests"]},
  {href:"/content",label:"内容中枢",step:"06",icon:Megaphone,paths:["/content"]},
  {href:"/results",label:"转化反馈",step:"07",icon:FileText,paths:["/results"]},
  {href:"/decision",label:"决策与下一轮",step:"08",icon:CheckSquare2,paths:["/decision"]},
];

export function LocalProductWorkbenchShell({children}:{children:ReactNode}) {
  const pathname=usePathname();
  const {localBundle,localLoading,localError}=useProductWorkbench();
  const current=stages.find((item)=>item.paths.some((path)=>pathname.startsWith(path)))??stages[0];
  const concept=localBundle?.concepts.find((item)=>item.status==="selected"&&!item.is_stale)??localBundle?.concepts.findLast((item)=>!item.is_stale);
  const gate=localBundle?.gates.filter((item)=>!item.is_stale).at(-1);
  const stale=(localBundle?.scenarios.filter((item)=>item.is_stale).length??0)+(localBundle?.content_assets.filter((item)=>item.is_stale).length??0)+(localBundle?.change_proposals.filter((item)=>item.is_stale).length??0);
  return <div className="product-workbench local-product-workbench" data-product-workbench data-workbench-adapter="local_api">
    <section className="project-command-bar" aria-label="当前本地项目状态">
      <div className="project-command-primary"><span className="real-mode-chip">LOCAL · SQLite</span><div><strong>{localBundle?.project.name??(localLoading?"正在连接本地数据库":"尚未创建真实项目")}</strong><small>{localError||"刷新与后端重启后从SQLite恢复；不使用浏览器模拟回退。"}</small></div></div>
      <dl className="project-command-facts"><div><dt>当前阶段</dt><dd>{current.step} · {current.label}</dd></div><div><dt>Category Pack</dt><dd>{localBundle?.category_pack.name??"待选择"}</dd></div><div><dt>revision</dt><dd>{localBundle?`R${localBundle.project.revision}`:"—"}</dd></div><div><dt>Gate</dt><dd>{gate?`${gate.result} · ${gate.rule_version}`:"尚未运行"}</dd></div></dl>
    </section>
    <div className="product-workbench-grid">
      <aside className="stage-rail" aria-label="真实产品工作流阶段"><div className="stage-rail-title"><ClipboardList className="h-4 w-4"/><span>真实产品工作流</span></div><nav>{stages.map(({href,label,step,icon:Icon,paths})=>{const active=paths.some((path)=>pathname.startsWith(path));return <Link key={href} href={href} className={active?"active":""} aria-current={active?"step":undefined}><span>{step}</span><Icon className="h-4 w-4"/><strong>{label}</strong></Link>;})}</nav><div className="stage-rail-boundary"><strong>能力边界</strong><p>本地单用户、人工自述身份。AI只接收结构化建议包并等待人审；Provider请求为0，固定Gate不变。</p></div></aside>
      <main className="product-workbench-main">{children}</main>
      <aside className="context-rail" aria-label="当前本地上下文"><section><span>当前概念</span><strong>{concept?.name??"尚未确认"}</strong><small>{concept?`${concept.id} · V${concept.version} · ${concept.locked?"已锁定":"待锁定"}`:"先确认Opportunity并完成人工shortlist"}</small></section><section><span>持久化对象</span><strong>{localBundle?localBundle.opportunities.length+localBundle.concepts.length+localBundle.scenarios.length+localBundle.content_assets.length+localBundle.feedback_records.length:0} 项</strong><small>FastAPI / SQLite · 不含public fixture</small></section><section><span>stale</span><strong>{stale} 项</strong><small>{stale?"需人工复核后再进入下一轮":"当前未发现下游失效"}</small></section><section><span>Provider</span><strong>禁用 · 请求0次</strong><small>仅允许手工导入结构化AIProposal</small></section></aside>
    </div>
  </div>;
}
