"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { GlobalNav } from "@/components/layout/global-nav";
import { CreateTaskDialog } from "@/components/radar/create-task-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MonitorTask, JsonDataWrapper } from "@/types";
import { Play, Pause, Plus, ArrowRight, Search, Globe, Clock, Zap, ShieldCheck } from "lucide-react";
import tasksJson from "@/data/monitor-tasks.json";

export default function MonitorTasksPage() {
  const [tasks] = useState<MonitorTask[]>(
    (tasksJson as JsonDataWrapper<MonitorTask>).items
  );
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "info" | "success" } | null>(null);

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

  const handleNewTask = useCallback(() => {
    setTaskDialogOpen(true);
  }, []);

  const handleScanNow = useCallback(() => {
    setToast({ msg: "正在启动实时扫描...（演示模式）", type: "info" });
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleSaveTask = useCallback((_task: Partial<MonitorTask>) => {
    setToast({ msg: "监测任务已保存（演示模式）", type: "success" });
    setTimeout(() => setToast(null), 2000);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <GlobalNav onNewTask={handleNewTask} onScanNow={handleScanNow} />

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-foreground">监测任务管理</h1>
              <p className="text-sm text-muted-foreground mt-1">创建和管理持续运行的消费信号监测任务</p>
            </div>
            <Button onClick={handleNewTask} className="h-10 gap-1.5 bg-primary text-white">
              <Plus className="h-4 w-4" />
              新建监测任务
            </Button>
          </div>

          {/* Task list */}
          <div className="space-y-4">
            {tasks.map((task) => {
              const s = statusConfig[task.status];
              return (
                <div
                  key={task.task_id}
                  className="rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-foreground">{task.name}</h3>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${s.bg} ${s.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                        {task.alert_on_anomaly && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            异常提醒开启
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{task.theme}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.status === "running" ? (
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                          <Pause className="h-3 w-3" />
                          暂停
                        </Button>
                      ) : (
                        <Button size="sm" className="h-8 text-xs gap-1 bg-primary text-white">
                          <Play className="h-3 w-3" />
                          立即运行
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Keywords */}
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1.5">监测关键词</p>
                    <div className="flex flex-wrap gap-1.5">
                      {task.keywords.slice(0, 6).map((kw, i) => (
                        <span key={i} className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                          {kw}
                        </span>
                      ))}
                      {task.keywords.length > 6 && (
                        <span className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground">
                          +{task.keywords.length - 6}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Search className="h-3 w-3" />
                      {task.keywords.length}个关键词
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {task.sources.length}个数据源
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {freqLabel[task.frequency]}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      今日+{task.signals_today}
                    </span>
                    <span className="flex items-center gap-1">
                      累计{task.total_signals}条信号
                    </span>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      上次扫描: {task.last_scan_at
                        ? new Date(task.last_scan_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "从未"}
                      {task.next_scan_at && ` · 下次: ${new Date(task.next_scan_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`}
                    </span>
                    <Link href="/radar">
                      <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-primary">
                        前往雷达页面
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 h-11 flex items-center border-t border-border bg-card px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-normal">
            当前结果用于产品机会预筛，不代表真实市场需求或销量预测。
          </p>
        </div>
      </footer>

      <CreateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSave={handleSaveTask}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div
            className={`flex items-center gap-2 rounded-xl px-5 py-3 shadow-lg border ${
              toast.type === "success"
                ? "bg-primary text-white border-primary"
                : "bg-card text-foreground border-border"
            }`}
          >
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-medium">{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
