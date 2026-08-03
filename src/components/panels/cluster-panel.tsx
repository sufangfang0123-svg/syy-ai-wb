"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Layers, ArrowRight, FileBarChart, Lightbulb, AlertTriangle, Gem, LayoutGrid, Share2, Grid3x3 } from "lucide-react";
import { Cluster } from "@/types";

interface ClusterPanelProps {
  clusters: Cluster[];
  activeClusterId: string | null;
  onSelectCluster: (cluster: Cluster) => void;
  totalFeedback: number;
  totalPainPoints: number;
  totalOpportunities: number;
}

export function ClusterPanel({
  clusters,
  activeClusterId,
  onSelectCluster,
  totalFeedback,
  totalPainPoints,
  totalOpportunities,
}: ClusterPanelProps) {
  return (
    <div className="flex h-full flex-col bg-secondary/50">
      {/* Data overview bar — 4 cards */}
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="grid grid-cols-4 gap-4">
          <OverviewCard icon={<FileBarChart className="h-4 w-4" />} label="有效反馈" value={totalFeedback} unit="条" />
          <OverviewCard icon={<Lightbulb className="h-4 w-4" />} label="需求聚类" value={clusters.length} unit="个" />
          <OverviewCard icon={<AlertTriangle className="h-4 w-4" />} label="核心痛点" value={totalPainPoints} unit="项" />
          <OverviewCard icon={<Gem className="h-4 w-4" />} label="产品机会" value={totalOpportunities} unit="个" />
        </div>
      </div>

      {/* Header with view toggle */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">AI需求聚类</h2>
          <Badge variant="secondary" className="text-xs h-6">{clusters.length} 个聚类</Badge>
        </div>
        <div className="flex items-center rounded-lg border border-border bg-secondary p-1">
          <button className="flex items-center gap-1 rounded-md bg-white px-3 py-1 text-xs font-medium text-foreground shadow-sm">
            <LayoutGrid className="h-3 w-3" />
            卡片视图
          </button>
          <button className="flex items-center gap-1 rounded-md px-3 py-1 text-xs text-muted-foreground" disabled>
            <Share2 className="h-3 w-3" />
            关系图
          </button>
          <button className="flex items-center gap-1 rounded-md px-3 py-1 text-xs text-muted-foreground" disabled>
            <Grid3x3 className="h-3 w-3" />
            证据矩阵
          </button>
        </div>
      </div>

      {/* Cluster cards — 2 column grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 p-6">
          {clusters.map((cluster, index) => (
            <ClusterCard
              key={cluster.cluster_id}
              index={index + 1}
              cluster={cluster}
              isActive={activeClusterId === cluster.cluster_id}
              onClick={() => onSelectCluster(cluster)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-secondary p-3 border border-border">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary">
        {icon}
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-[24px] font-bold text-foreground leading-none">{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

function ClusterCard({
  index,
  cluster,
  isActive,
  onClick,
}: {
  index: number;
  cluster: Cluster;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer rounded-xl border transition-all no-select ${
        isActive
          ? "border-primary bg-primary-50 shadow-sm"
          : "border-border bg-card hover:shadow-sm"
      }`}
    >
      {isActive && (
        <div className="absolute -top-2.5 left-3">
          <Badge className="bg-primary text-white text-[11px] h-5 px-2 font-medium">当前分析</Badge>
        </div>
      )}

      <div className="p-5">
        {/* Header: number + title + evidence badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-muted-foreground">{String(index).padStart(2, "0")}</span>
              <h3 className="text-base font-semibold text-foreground leading-tight">{cluster.cluster_name}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{cluster.feedback_count} 条相关反馈</p>
          </div>
          <Badge
            variant="outline"
            className={`text-xs h-6 flex-shrink-0 ${
              cluster.evidence_strength === "high"
                ? "border-primary text-primary"
                : cluster.evidence_strength === "medium"
                ? "border-warning text-warning"
                : "border-muted-foreground text-muted-foreground"
            }`}
          >
            {cluster.evidence_strength === "high"
              ? "强证据"
              : cluster.evidence_strength === "medium"
              ? "中证据"
              : "弱证据"}
          </Badge>
        </div>

        {/* One-line insight */}
        <div className="mb-3 rounded-lg bg-secondary/80 border border-border px-3 py-2">
          <p className="text-sm text-foreground leading-relaxed">{cluster.core_pain_point}</p>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex items-start gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <span className="text-xs text-muted-foreground block">主要人群</span>
              <span className="text-sm text-foreground">{cluster.main_persona}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Layers className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <span className="text-xs text-muted-foreground block">核心场景</span>
              <span className="text-sm text-foreground">{cluster.main_scenario}</span>
            </div>
          </div>
        </div>

        {/* Keywords */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {cluster.keywords.map((kw) => (
            <span
              key={kw}
              className="inline-block rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600"
            >
              {kw}
            </span>
          ))}
        </div>

        {/* Confidence */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">AI置信度</span>
            <span className="text-sm font-bold text-foreground">{cluster.confidence}%</span>
          </div>
          <Progress value={cluster.confidence} className="h-2" />
        </div>

        {/* CTA */}
        <button
          className={`mt-4 w-full rounded-lg border py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            isActive
              ? "border-primary bg-primary text-white shadow-sm"
              : "border-border text-muted-foreground hover:bg-secondary"
          }`}
        >
          {isActive ? "已筛选相关反馈" : "查看证据"}
          {!isActive && <ArrowRight className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
