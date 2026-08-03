"use client";

import { Badge } from "@/components/ui/badge";
import { SourceConnector } from "@/types";
import { Globe, Activity, AlertTriangle, Clock, WifiOff, Settings } from "lucide-react";

interface SourceStatusProps {
  connectors: SourceConnector[];
}

export function SourceStatus({ connectors }: SourceStatusProps) {
  const statusConfig = {
    active: { icon: <Activity className="h-3.5 w-3.5" />, label: "正常", color: "text-primary", bg: "bg-primary/10", dot: "bg-primary" },
    scanning: { icon: <Activity className="h-3.5 w-3.5 animate-pulse" />, label: "扫描中", color: "text-primary", bg: "bg-primary/10", dot: "bg-primary animate-pulse" },
    limited: { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "受限", color: "text-warning", bg: "bg-warning/10", dot: "bg-warning" },
    pending: { icon: <Settings className="h-3.5 w-3.5" />, label: "待配置", color: "text-muted-foreground", bg: "bg-muted", dot: "bg-muted-foreground" },
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">数据源状态</h3>
        </div>
        <Badge variant="secondary" className="text-xs h-6">
          {connectors.filter((c) => c.status === "active" || c.status === "scanning").length}/{connectors.length} 正常
        </Badge>
      </div>
      <div className="p-4 space-y-2">
        {connectors.map((conn) => {
          const s = statusConfig[conn.status];
          return (
            <div
              key={conn.connector_id}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${s.bg} ${s.color}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
                <div>
                  <span className="text-sm font-medium text-foreground">{conn.name}</span>
                  <p className="text-xs text-muted-foreground">{conn.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {conn.last_scan_at
                    ? new Date(conn.last_scan_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
                    : "未扫描"}
                </span>
                <span>今日+{conn.signals_today}</span>
                <span>累计{conn.total_signals}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
