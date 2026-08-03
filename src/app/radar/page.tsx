"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { GlobalNav } from "@/components/layout/global-nav";
import { RadarStatsOverview } from "@/components/radar/radar-stats-overview";
import { MonitorTasksCard } from "@/components/radar/monitor-tasks-card";
import { RawSignalsStream } from "@/components/radar/raw-signals-stream";
import { TrendRadar } from "@/components/radar/trend-radar";
import { AnomalyAlerts } from "@/components/radar/anomaly-alerts";
import { SourceStatus } from "@/components/radar/source-status";
import { CreateTaskDialog } from "@/components/radar/create-task-dialog";
import { ShieldCheck, Info } from "lucide-react";
import {
  MonitorTask,
  RawSignal,
  TrendTopic,
  AnomalyAlert,
  SourceConnector,
  JsonDataWrapper,
} from "@/types";

import tasksJson from "@/data/monitor-tasks.json";
import signalsJson from "@/data/raw-signals.json";
import topicsJson from "@/data/trend-topics.json";
import alertsJson from "@/data/anomaly-alerts.json";
import connectorsJson from "@/data/source-connectors.json";

export default function RadarPage() {
  const [tasks] = useState<MonitorTask[]>(
    (tasksJson as JsonDataWrapper<MonitorTask>).items
  );
  const [signals] = useState<RawSignal[]>(
    (signalsJson as JsonDataWrapper<RawSignal>).items
  );
  const [topics] = useState<TrendTopic[]>(
    (topicsJson as JsonDataWrapper<TrendTopic>).items
  );
  const [alerts] = useState<AnomalyAlert[]>(
    (alertsJson as JsonDataWrapper<AnomalyAlert>).items
  );
  const [connectors] = useState<SourceConnector[]>(
    (connectorsJson as JsonDataWrapper<SourceConnector>).items
  );

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "info" | "success" } | null>(null);

  const totalSignalsToday = signals.length; // In real system this would be computed from all connectors

  const handleNewTask = useCallback(() => {
    setTaskDialogOpen(true);
  }, []);

  const handleScanNow = useCallback(() => {
    setToast({ msg: "正在启动实时扫描...（演示模式）", type: "info" });
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleRunTask = useCallback((id: string) => {
    setToast({ msg: `任务 ${id} 已开始扫描（演示模式）`, type: "success" });
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handlePauseTask = useCallback((id: string) => {
    setToast({ msg: `任务 ${id} 已暂停（演示模式）`, type: "info" });
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleSaveTask = useCallback((_task: Partial<MonitorTask>) => {
    setToast({ msg: "监测任务已保存（演示模式）", type: "success" });
    setTimeout(() => setToast(null), 2000);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Global Nav */}
      <GlobalNav onNewTask={handleNewTask} onScanNow={handleScanNow} />

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Stats overview */}
        <RadarStatsOverview
          taskCount={tasks.filter((t) => t.status === "running").length}
          sourceCount={connectors.filter((c) => c.status === "active" || c.status === "scanning").length}
          signalsToday={totalSignalsToday}
          trendTopics={topics.filter((t) => t.trend === "rising" || t.trend === "new_conflict").length}
          anomalies={alerts.filter((a) => a.status === "new").length}
          lastScanMinutes={8}
        />

        {/* Two-column layout */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Left column - 8 cols */}
            <div className="xl:col-span-8 space-y-5">
              <MonitorTasksCard
                tasks={tasks}
                onRunTask={handleRunTask}
                onPauseTask={handlePauseTask}
              />
              <RawSignalsStream signals={signals} />
              <SourceStatus connectors={connectors} />
            </div>

            {/* Right column - 4 cols */}
            <div className="xl:col-span-4 space-y-5">
              <TrendRadar topics={topics} />
              <AnomalyAlerts
                alerts={alerts}
                onViewEvidence={(id) => console.log("View evidence:", id)}
                onPin={(id) => console.log("Pin alert:", id)}
                onDismiss={(id) => console.log("Dismiss alert:", id)}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer disclaimer */}
      <footer className="shrink-0 h-11 flex items-center border-t border-border bg-card px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-normal">
            当前结果用于产品机会预筛，不代表真实市场需求或销量预测。所有机会必须经过真人访谈、问卷、概念测试和企业数据验证。
          </p>
        </div>
      </footer>

      {/* Create Task Dialog */}
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
