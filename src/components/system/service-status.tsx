"use client";

import { AlertTriangle, CheckCircle2, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { useRuntimeBoundary } from "@/components/system/runtime-boundary-provider";

export function ServiceStatus() {
  const { config, backendStatus, checkBackend, lastCheckedAt } = useRuntimeBoundary();

  if (config.isPublicDemo) {
    return <div className="service-status public" role="status" data-testid="service-status-public">
      <ShieldCheck className="h-5 w-5" />
      <div><strong>公开展示构建 · 仅模拟</strong><p>真实项目入口已关闭；本页面不会连接真实项目服务。</p></div>
    </div>;
  }

  const content = {
    checking: { icon: LoaderCircle, title: "正在检查本地真实服务", body: "确认服务健康前，真实项目入口保持关闭。" },
    available: { icon: CheckCircle2, title: "本地真实服务可用", body: "v0.3.1单企业本地封闭试点入口已开放；数据只保存到本地SQLite与私有附件目录。" },
    unavailable: { icon: AlertTriangle, title: "真实服务不可用", body: "真实项目入口已关闭，且不会回退到浏览器存储。请启动后端服务后重试。" },
    disabled: { icon: AlertTriangle, title: "真实项目能力未启用", body: "本地构建未开启真实项目配置。" },
  }[backendStatus];
  const Icon = content.icon;

  return <div className={`service-status ${backendStatus}`} role="status" data-testid={`service-status-${backendStatus}`}>
    <Icon className={`h-5 w-5 ${backendStatus === "checking" ? "animate-spin" : ""}`} />
    <div className="min-w-0 flex-1"><strong>{content.title}</strong><p>{content.body}</p>{lastCheckedAt ? <small>最近检查：{new Date(lastCheckedAt).toLocaleTimeString("zh-CN")}</small> : null}</div>
    {backendStatus !== "checking" ? <button type="button" onClick={() => void checkBackend()} className="secondary-action shrink-0"><RefreshCw className="h-4 w-4" />重新检查</button> : null}
  </div>;
}
