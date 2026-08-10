"use client";

import { ReactNode } from "react";
import { Database, Info, PlayCircle } from "lucide-react";
import { useDecision } from "@/components/decision/decision-provider";

export function WorkspaceHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="page-heading"><div><p className="section-kicker">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{actions}</div>;
}

export function ModeSwitch() {
  const { state, setMode } = useDecision();
  return <div className="mode-switch" aria-label="数据空间"><button onClick={() => setMode("demo")} className={state.mode === "demo" ? "active" : ""}><PlayCircle className="h-4 w-4" />模拟项目</button><button onClick={() => setMode("real")} className={state.mode === "real" ? "active" : ""}><Database className="h-4 w-4" />真实项目草稿</button></div>;
}

export function DataBoundary() {
  const { state } = useDecision();
  return <div className={`workspace-boundary ${state.mode}`}><Info className="h-4 w-4" /><span>{state.mode === "demo" ? "当前为模拟数据空间。所有记录均为演示样例，可一键清空，不会与企业真实项目混合。" : "当前为真实项目草稿空间。数据只保存在此浏览器；尚未接入企业身份、权限、后端审计和加密存储。"}</span></div>;
}

export function EmptyState({ title, body }: { title: string; body: string }) { return <div className="empty-state"><Database className="h-8 w-8" /><h2>{title}</h2><p>{body}</p></div>; }

export const recommendationLabel = { continue: "继续投入", supplement: "先补证", stop: "停止" } as const;
