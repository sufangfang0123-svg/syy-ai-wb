"use client";

import { Button } from "@/components/ui/button";
import { Cloud, Upload, Sparkles, FolderOpen } from "lucide-react";

interface TopNavProps {
  feedbackCount: number;
  clusterCount: number;
  onImport: () => void;
  onRunAI: () => void;
  isAnalyzing: boolean;
}

export function TopNav({
  feedbackCount,
  clusterCount,
  onImport,
  onRunAI,
  isAnalyzing,
}: TopNavProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      {/* Brand area */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Cloud className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[22px] font-semibold leading-none text-foreground tracking-tight">
              棉生万物
            </span>
            <span className="text-xs leading-none text-muted-foreground mt-1">
              AI爆款进化舱
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block h-8 w-px bg-border" />

        {/* Current project */}
        <div className="hidden md:flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">当前项目</span>
          <span className="text-sm font-medium text-foreground">
            年轻女性随行护理研究
          </span>
        </div>
      </div>

      {/* Data status - full text */}
      <div className="hidden lg:flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-foreground">{feedbackCount}</span>
          <span className="text-xs text-muted-foreground">条反馈</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-foreground">{clusterCount}</span>
          <span className="text-xs text-muted-foreground">个聚类</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-foreground">1</span>
          <span className="text-xs text-muted-foreground">个待确认机会</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="h-10 text-sm gap-1.5"
          onClick={onImport}
        >
          <Upload className="h-4 w-4" />
          导入反馈
        </Button>
        <Button
          className="h-10 bg-primary text-sm font-medium gap-1.5 hover:bg-primary-600 shadow-sm"
          onClick={onRunAI}
          disabled={isAnalyzing}
        >
          <Sparkles className="h-4 w-4" />
          {isAnalyzing ? "AI分析中…" : "运行AI洞察"}
        </Button>
      </div>
    </header>
  );
}
