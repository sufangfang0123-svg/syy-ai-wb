"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Target,
  Users,
  Layers,
  ClipboardList,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  FlaskConical,
  ArrowRight,
  Shield,
  FileText,
} from "lucide-react";
import { Opportunity } from "@/types";

interface OpportunityPanelProps {
  opportunities: Opportunity[];
  activeId: string;
  onSelect: (id: string) => void;
  onConfirm: (id: string) => void;
  onAddToPool: (id: string) => void;
  onGenerate: (id: string) => void;
  confirmedIds: Set<string>;
  pooledIds: Set<string>;
  autoDetected?: boolean;
}

export function OpportunityPanel({
  opportunities,
  activeId,
  onSelect,
  onConfirm,
  onAddToPool,
  onGenerate,
  confirmedIds,
  pooledIds,
  autoDetected = false,
}: OpportunityPanelProps) {
  const active = opportunities.find((o) => o.opportunity_id === activeId);

  if (!active) return null;

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Tabs */}
      <div className="border-b border-border px-4 pt-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-0">
          {opportunities.map((o) => (
            <button
              key={o.opportunity_id}
              onClick={() => onSelect(o.opportunity_id)}
              className={`flex-shrink-0 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeId === o.opportunity_id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.title}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {/* 1. Opportunity number + title */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <span className="text-sm text-muted-foreground block mb-1">
                机会编号 {active.opportunity_id}
              </span>
              <h2 className="text-lg font-bold text-foreground leading-tight">
                {active.title}
              </h2>
            </div>
            <div className="flex gap-2 flex-shrink-0 ml-3">
              {/* 2. High potential + pending confirmation status */}
              <Badge className="bg-warning text-white text-xs h-6 px-2">高潜力</Badge>
              {!confirmedIds.has(active.opportunity_id) && (
                <Badge variant="outline" className="text-xs h-6 px-2 border-border">
                  待人工确认
                </Badge>
              )}
              {confirmedIds.has(active.opportunity_id) && (
                <Badge className="bg-primary text-white text-xs h-6 px-2">
                  <CheckCircle2 className="h-3 w-3" />
                  已确认
                </Badge>
              )}
            </div>
          </div>

          {/* Auto detection info */}
          {autoDetected && (
            <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">
                由系统于23:18自动发现 · 来源于3个平台、7条有效信号
              </span>
            </div>
          )}

          {/* 3. Metrics: evidence + heat + confidence */}
          <div className="grid grid-cols-3 gap-3">
            <MetricBox label="证据强度" value={active.evidence_level.split("（")[0]} />
            <MetricBox label="需求热度" value={`${active.evidence_count}条`} />
            <MetricBox label="AI置信度" value={`${active.confidence}%`} />
          </div>

          {/* 4. Target persona */}
          <InfoBlock icon={<Users className="h-4 w-4" />} label="目标人群" value={active.target_persona} />

          {/* 5. Core scenario */}
          <InfoBlock icon={<Layers className="h-4 w-4" />} label="核心场景" value={active.core_scenario} />

          {/* 6. User task */}
          <InfoBlock icon={<ClipboardList className="h-4 w-4" />} label="用户任务" value={active.user_task} />

          {/* 7. Core insight quote — light green background */}
          <div className="rounded-xl bg-primary-50 border border-primary-100 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">核心洞察</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              用户需要的不是更小的棉柔巾，而是一套在有限空间内完成多项护理任务的解决方案。
            </p>
          </div>

          <Separator className="bg-border" />

          {/* 8. Current hypothesis — yellow alert box */}
          <div className="rounded-xl bg-warning/10 border border-warning/20 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="h-4 w-4 text-warning" />
              <span className="text-sm font-semibold text-foreground">当前假设</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{active.current_hypothesis}</p>
          </div>

          {/* 9. Pending questions — numbered list */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">待验证问题</span>
            </div>
            <ul className="space-y-2">
              {active.pending_questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-secondary text-xs font-medium text-muted-foreground flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground leading-relaxed">{q}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 10. Evidence composition */}
          <div className="flex items-start gap-2 rounded-xl bg-secondary/80 border border-border p-3">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <span className="text-sm font-medium text-foreground block">证据组成</span>
              <span className="text-xs text-muted-foreground">
                {active.evidence_count} 条反馈支撑 · 证据等级 {active.evidence_level}
              </span>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* 11. Bottom action bar — fixed */}
      <div className="border-t border-border p-4 bg-card shrink-0">
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-10 text-sm">
            <Shield className="h-4 w-4" />
            查看原始证据
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-10 text-sm"
            onClick={() => onAddToPool(active.opportunity_id)}
          >
            <FlaskConical className="h-4 w-4" />
            {pooledIds.has(active.opportunity_id) ? "已在验证池" : "加入验证池"}
          </Button>
        </div>
        {/* Primary button — only main action */}
        <Button
          className="mt-3 w-full h-10 bg-primary text-sm font-medium hover:bg-primary-600 shadow-sm"
          onClick={() => onConfirm(active.opportunity_id)}
        >
          <CheckCircle2 className="h-4 w-4" />
          {confirmedIds.has(active.opportunity_id) ? "已确认 · 生成产品概念" : "确认并生成产品概念"}
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
      </div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/80 border border-border p-3 text-center">
      <span className="text-sm font-bold text-foreground block">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function InfoBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <span className="text-xs text-muted-foreground block mb-0.5">{label}</span>
        <span className="text-sm text-foreground leading-relaxed">{value}</span>
      </div>
    </div>
  );
}
