"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnomalyAlert } from "@/types";
import { AlertTriangle, Eye, ArrowRight, Pin, X } from "lucide-react";
import Link from "next/link";

interface AnomalyAlertsProps {
  alerts: AnomalyAlert[];
  onViewEvidence?: (id: string) => void;
  onPin?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export function AnomalyAlerts({ alerts, onViewEvidence, onPin, onDismiss }: AnomalyAlertsProps) {
  const statusConfig = {
    new: { label: "新发现", bg: "bg-destructive/10", text: "text-destructive", dot: "bg-destructive" },
    viewed: { label: "已查看", bg: "bg-warning/10", text: "text-warning", dot: "bg-warning" },
    resolved: { label: "已处理", bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" },
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h3 className="text-base font-semibold text-foreground">异常机会预警</h3>
        </div>
        <Badge variant="secondary" className="text-xs h-6">{alerts.filter((a) => a.status === "new").length} 个新预警</Badge>
      </div>
      <div className="p-4 space-y-3">
        {alerts.map((alert) => {
          const s = statusConfig[alert.status];
          return (
            <div
              key={alert.alert_id}
              className="rounded-lg border border-border p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${s.bg} ${s.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    增长 {alert.growth_rate}%
                  </span>
                </div>
                {onDismiss && (
                  <button
                    onClick={() => onDismiss(alert.alert_id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <h4 className="text-sm font-semibold text-foreground mb-1">{alert.title}</h4>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{alert.description}</p>

              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs text-muted-foreground">
                  {alert.platforms.length}个平台
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {alert.related_signals}条相关信号
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  增长 {alert.growth_rate}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onViewEvidence && (
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => onViewEvidence(alert.alert_id)}>
                    <Eye className="h-3 w-3" />
                    查看证据
                  </Button>
                )}
                <Link href="/insights">
                  <Button size="sm" className="h-8 text-xs gap-1 bg-primary text-white">
                    <ArrowRight className="h-3 w-3" />
                    进入深入分析
                  </Button>
                </Link>
                {onPin && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 ml-auto" onClick={() => onPin(alert.alert_id)}>
                    <Pin className="h-3 w-3" />
                    加入重点监测
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
