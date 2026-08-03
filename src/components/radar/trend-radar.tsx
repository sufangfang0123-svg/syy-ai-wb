"use client";

import { Badge } from "@/components/ui/badge";
import { TrendTopic } from "@/types";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";

interface TrendRadarProps {
  topics: TrendTopic[];
}

export function TrendRadar({ topics }: TrendRadarProps) {
  const trendConfig = {
    rising: { icon: <TrendingUp className="h-3.5 w-3.5" />, color: "text-primary", barColor: "bg-primary", label: "上升" },
    stable: { icon: <Minus className="h-3.5 w-3.5" />, color: "text-muted-foreground", barColor: "bg-muted-foreground", label: "平稳" },
    falling: { icon: <TrendingDown className="h-3.5 w-3.5" />, color: "text-muted-foreground", barColor: "bg-muted-foreground", label: "下降" },
    new_conflict: { icon: <AlertCircle className="h-3.5 w-3.5" />, color: "text-warning", barColor: "bg-warning", label: "新矛盾" },
  };

  const maxSignals = Math.max(...topics.map((t) => t.signal_count));

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">趋势雷达</h3>
        </div>
        <Badge variant="secondary" className="text-xs h-6">近7天变化</Badge>
      </div>
      <div className="p-4 space-y-3">
        {topics.map((topic) => {
          const t = trendConfig[topic.trend];
          const barWidth = maxSignals > 0 ? (topic.signal_count / maxSignals) * 100 : 0;
          return (
            <div key={topic.topic_id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`${t.color}`}>{t.icon}</span>
                  <span className="text-sm font-medium text-foreground">{topic.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${topic.change_7d >= 0 ? "text-primary" : "text-muted-foreground"}`}>
                    {topic.change_7d >= 0 ? "+" : ""}{topic.change_7d}%
                  </span>
                  <span className="text-xs text-muted-foreground">{topic.signal_count}条</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full ${t.barColor} transition-all duration-500`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right">{t.label}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">{topic.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
