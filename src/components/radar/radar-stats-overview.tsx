"use client";

import { Activity, Database, Zap, TrendingUp, AlertTriangle, Clock } from "lucide-react";

interface RadarStatsOverviewProps {
  taskCount: number;
  sourceCount: number;
  signalsToday: number;
  trendTopics: number;
  anomalies: number;
  lastScanMinutes: number;
}

export function RadarStatsOverview({
  taskCount,
  sourceCount,
  signalsToday,
  trendTopics,
  anomalies,
  lastScanMinutes,
}: RadarStatsOverviewProps) {
  const stats = [
    {
      icon: <Activity className="h-4 w-4 text-primary" />,
      label: "运行中监测任务",
      value: taskCount,
      unit: "个",
    },
    {
      icon: <Database className="h-4 w-4 text-primary" />,
      label: "已连接数据源",
      value: sourceCount,
      unit: "个",
    },
    {
      icon: <Zap className="h-4 w-4 text-warning" />,
      label: "今日新增信号",
      value: signalsToday,
      unit: "条",
    },
    {
      icon: <TrendingUp className="h-4 w-4 text-primary" />,
      label: "增长主题",
      value: trendTopics,
      unit: "个",
    },
    {
      icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
      label: "异常机会",
      value: anomalies,
      unit: "个",
    },
    {
      icon: <Clock className="h-4 w-4 text-muted-foreground" />,
      label: "上次扫描",
      value: lastScanMinutes,
      unit: "分钟前",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 px-6 py-4">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            {stat.icon}
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{stat.value}</span>
            <span className="text-xs text-muted-foreground">{stat.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
