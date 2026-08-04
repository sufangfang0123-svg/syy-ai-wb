"use client";

import { useState, useMemo } from "react";
import { GlobalNav } from "@/components/layout/global-nav";
import { Opportunity } from "@/types";
import opportunityJson from "@/data/opportunities.json";
import { JsonDataWrapper } from "@/types";
import {
  Target,
  Users,
  MapPin,
  ClipboardList,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function OpportunitiesPage() {
  const [opportunities] = useState<Opportunity[]>(
    (opportunityJson as JsonDataWrapper<Opportunity>).items
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "confirmed" | "pending">("all");
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "info" | "success" } | null>(null);

  const filtered = useMemo(() => {
    let list = opportunities;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          o.target_persona.toLowerCase().includes(q) ||
          o.core_scenario.toLowerCase().includes(q)
      );
    }
    if (filterStatus === "confirmed") {
      // For demo, assume opportunities with confidence >= 85 are "confirmed"
      list = list.filter((o) => o.confidence >= 85);
    } else if (filterStatus === "pending") {
      list = list.filter((o) => o.confidence < 85);
    }
    return list;
  }, [opportunities, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const total = opportunities.length;
    const confirmed = opportunities.filter((o) => o.confidence >= 85).length;
    const avgConfidence =
      Math.round(opportunities.reduce((s, o) => s + o.confidence, 0) / total) || 0;
    return { total, confirmed, pending: total - confirmed, avgConfidence };
  }, [opportunities]);

  const showToast = (msg: string, type: "info" | "success" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <GlobalNav />

      <main className="flex-1 overflow-auto">
        {/* Stats Overview */}
        <div className="px-6 pt-6 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Target} label="机会总数" value={stats.total} color="primary" />
            <StatCard icon={CheckCircle2} label="已确认" value={stats.confirmed} color="green" />
            <StatCard icon={Clock} label="待确认" value={stats.pending} color="amber" />
            <StatCard icon={TrendingUp} label="平均置信度" value={`${stats.avgConfidence}%`} color="blue" />
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 pb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索机会名称、人群或场景..."
              className="pl-9 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {(["all", "confirmed", "pending"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  filterStatus === status
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {status === "all" ? "全部" : status === "confirmed" ? "已确认" : "待确认"}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            className="h-10 gap-1.5"
            onClick={() => showToast("AI机会扫描功能开发中", "info")}
          >
            <Sparkles className="h-4 w-4" />
            AI扫描
          </Button>
        </div>

        {/* Two-column layout */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Left - Opportunity list */}
            <div className="xl:col-span-7 space-y-3">
              {filtered.map((opp) => (
                <div
                  key={opp.opportunity_id}
                  onClick={() => setSelectedOpp(opp)}
                  className={cn(
                    "group cursor-pointer rounded-xl border bg-card p-5 transition-all hover:shadow-md",
                    selectedOpp?.opportunity_id === opp.opportunity_id
                      ? "border-primary ring-1 ring-primary/20"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={opp.confidence >= 85 ? "default" : "secondary"}
                        className={cn(
                          opp.confidence >= 85
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                        )}
                      >
                        {opp.confidence >= 85 ? "已确认" : "待确认"}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {opp.opportunity_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold text-primary">{opp.confidence}</span>
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-foreground mb-2">{opp.title}</h3>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">人群:</span>
                      <span className="text-foreground">{opp.target_persona}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">场景:</span>
                      <span className="text-foreground">{opp.core_scenario}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 text-sm mb-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-muted-foreground">核心痛点:</span>
                    </div>
                    <p className="text-sm text-foreground bg-secondary/50 rounded-lg px-3 py-2">
                      {opp.main_pain_point}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ClipboardList className="h-3 w-3" />
                      {opp.evidence_count}条证据
                    </div>
                    <div className="flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                      查看详情
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right - Detail panel */}
            <div className="xl:col-span-5">
              {selectedOpp ? (
                <div className="sticky top-0 space-y-4">
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge
                        variant={selectedOpp.confidence >= 85 ? "default" : "secondary"}
                        className={cn(
                          selectedOpp.confidence >= 85
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                        )}
                      >
                        {selectedOpp.confidence >= 85 ? "已确认" : "待确认"}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {selectedOpp.opportunity_id}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-foreground mb-4">
                      {selectedOpp.title}
                    </h2>

                    {/* Confidence meter */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">AI置信度</span>
                        <span className="text-lg font-bold text-primary">{selectedOpp.confidence}%</span>
                      </div>
                      <Progress value={selectedOpp.confidence} className="h-2" />
                    </div>

                    {/* User task */}
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-1.5">
                        <ClipboardList className="h-4 w-4" />
                        用户任务
                      </div>
                      <p className="text-sm text-foreground bg-secondary/50 rounded-lg px-3 py-2">
                        {selectedOpp.user_task}
                      </p>
                    </div>

                    {/* Hypothesis */}
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-1.5">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        当前假设
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        {selectedOpp.current_hypothesis}
                      </p>
                    </div>

                    {/* Evidence */}
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-1.5">
                        <ShieldCheck className="h-4 w-4 text-green-500" />
                        证据等级
                      </div>
                      <p className="text-sm text-foreground">{selectedOpp.evidence_level}</p>
                    </div>

                    {/* Pending questions */}
                    <div className="mb-5">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        待验证问题
                      </div>
                      <div className="space-y-2">
                        {selectedOpp.pending_questions.map((q, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-sm text-foreground bg-amber-50 rounded-lg px-3 py-2"
                          >
                            <span className="text-amber-500 font-medium shrink-0">{i + 1}.</span>
                            <span>{q}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 gap-1.5"
                        onClick={() => showToast("已进入产品进化实验室", "success")}
                      >
                        <ArrowRight className="h-4 w-4" />
                        进入产品进化
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-1.5"
                        onClick={() => showToast("已加入待验证池", "success")}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        确认机会
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sticky top-0 flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border bg-card/50">
                  <Target className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">点击左侧机会卡片查看详情</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 h-11 flex items-center border-t border-border bg-card px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-normal">
            当前结果用于产品机会预筛，不代表真实市场需求或销量预测。所有机会必须经过真人访谈、问卷、概念测试和企业数据验证。
          </p>
        </div>
      </footer>

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
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}
