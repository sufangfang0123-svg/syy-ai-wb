"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MonitorTask } from "@/types";
import { Play, Pause, Search, Globe, Clock, Zap } from "lucide-react";

interface MonitorTasksCardProps {
  tasks: MonitorTask[];
  onRunTask: (id: string) => void;
  onPauseTask: (id: string) => void;
}

export function MonitorTasksCard({ tasks, onRunTask, onPauseTask }: MonitorTasksCardProps) {
  const statusConfig = {
    running: { label: "运行中", dot: "bg-primary", bg: "bg-primary/10", text: "text-primary" },
    paused: { label: "已暂停", dot: "bg-muted-foreground", bg: "bg-muted", text: "text-muted-foreground" },
    draft: { label: "草稿", dot: "bg-warning", bg: "bg-warning/10", text: "text-warning" },
    error: { label: "异常", dot: "bg-destructive", bg: "bg-destructive/10", text: "text-destructive" },
  };

  const freqLabel: Record<string, string> = {
    hourly: "每小时",
    daily: "每天",
    weekly: "每周",
    manual: "手动",
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">监测任务</h3>
        </div>
        <Badge variant="secondary" className="text-xs h-6">{tasks.length} 个任务</Badge>
      </div>
      <div className="p-4 space-y-3">
        {tasks.map((task) => {
          const s = statusConfig[task.status];
          return (
            <div
              key={task.task_id}
              className="rounded-lg border border-border p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-foreground">{task.name}</h4>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${s.bg} ${s.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{task.theme}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-3">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  {task.sources.length}个数据源
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {freqLabel[task.frequency]}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  今日+{task.signals_today}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {task.status === "running" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => onPauseTask(task.task_id)}
                  >
                    <Pause className="h-3 w-3" />
                    暂停
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1 bg-primary text-white"
                    onClick={() => onRunTask(task.task_id)}
                  >
                    <Play className="h-3 w-3" />
                    立即运行
                  </Button>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  上次扫描: {task.last_scan_at ? new Date(task.last_scan_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "从未"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
