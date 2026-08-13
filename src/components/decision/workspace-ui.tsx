"use client";

import { ReactNode } from "react";
import { Database, Info, PlayCircle } from "lucide-react";
import { useRuntimeBoundary } from "@/components/system/runtime-boundary-provider";

export function WorkspaceHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="page-heading"><div><p className="section-kicker">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{actions}</div>;
}

export function ModeSwitch() {
  const { config, activeSpace, backendStatus, openDemo, openRealBoundary } = useRuntimeBoundary();
  return <div className="mode-switch" aria-label="数据空间">
    <button onClick={openDemo} className={activeSpace === "demo" ? "active" : ""}><PlayCircle className="h-4 w-4" />模拟研究实验室</button>
    {config.realWorkspaceConfigured ? <button onClick={openRealBoundary} disabled={backendStatus !== "available"} className={activeSpace === "real-boundary" ? "active" : ""}><Database className="h-4 w-4" />真实项目入口</button> : null}
  </div>;
}

export function DataBoundary() {
  return <div className="workspace-boundary demo" data-testid="demo-boundary"><Info className="h-4 w-4" /><span><strong>独立模拟研究实验室 · 模拟演示</strong> · 本页使用固定演示夹具说明方法，不代表真实研究、实时计算或企业结论。</span></div>;
}

export function EmptyState({ title, body }: { title: string; body: string }) { return <div className="empty-state"><Database className="h-8 w-8" /><h2>{title}</h2><p>{body}</p></div>; }

export const recommendationLabel = { continue: "继续投入", supplement: "先补证", stop: "停止" } as const;
