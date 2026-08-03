"use client";

import { useState, useCallback, useMemo } from "react";
import { TopNav } from "@/components/layout/top-nav";
import { FeedbackPanel } from "@/components/panels/feedback-panel";
import { ClusterPanel } from "@/components/panels/cluster-panel";
import { OpportunityPanel } from "@/components/panels/opportunity-panel";
import { FeedbackDetailDrawer } from "@/components/panels/feedback-detail-drawer";
import { AIAnalysisOverlay } from "@/components/panels/ai-analysis-overlay";
import { ShieldCheck, Info, Zap } from "lucide-react";
import { FeedbackItem, Cluster, Opportunity, AIAnalysisStep, JsonDataWrapper } from "@/types";
import feedbackJson from "@/data/feedback.json";
import clusterJson from "@/data/clusters.json";
import opportunityJson from "@/data/opportunities.json";

const aiSteps: AIAnalysisStep[] = [
  { id: "clean", label: "正在清洗反馈" },
  { id: "scenario", label: "正在提取用户场景" },
  { id: "pain", label: "正在识别高频痛点" },
  { id: "cluster", label: "正在生成需求聚类" },
  { id: "opportunity", label: "正在构建机会卡" },
];

export default function InsightsPage() {
  const [feedback] = useState<FeedbackItem[]>(
    (feedbackJson as JsonDataWrapper<FeedbackItem>).items
  );
  const [clusters] = useState<Cluster[]>(
    (clusterJson as JsonDataWrapper<Cluster>).items
  );
  const [opportunities] = useState<Opportunity[]>(
    (opportunityJson as JsonDataWrapper<Opportunity>).items
  );

  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeOppId, setActiveOppId] = useState<string>(
    opportunities[0]?.opportunity_id || ""
  );
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [pooledIds, setPooledIds] = useState<Set<string>>(new Set());
  const [aiOverlayOpen, setAiOverlayOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "info" | "success" } | null>(null);

  const totalPainPoints = useMemo(() => {
    const set = new Set<string>();
    feedback.forEach((f) => f.pain_points.forEach((p) => set.add(p)));
    return set.size;
  }, [feedback]);

  const handleSelectFeedback = useCallback((item: FeedbackItem) => {
    setSelectedFeedback(item);
    setDrawerOpen(true);
  }, []);

  const handleSelectCluster = useCallback((cluster: Cluster) => {
    setActiveClusterId((prev) =>
      prev === cluster.cluster_id ? null : cluster.cluster_id
    );
  }, []);

  const handleRunAI = useCallback(() => {
    setAiOverlayOpen(true);
  }, []);

  const handleAIComplete = useCallback(() => {
    setAiOverlayOpen(false);
    setToast({ msg: "AI分析完成！已生成需求聚类和机会卡。", type: "success" });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleConfirm = useCallback((id: string) => {
    setConfirmedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setToast({ msg: "机会卡已人工确认", type: "success" });
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleAddToPool = useCallback((id: string) => {
    setPooledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setToast({ msg: "已加入待验证池", type: "info" });
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleGenerate = useCallback((_id: string) => {
    setToast({ msg: "产品棉基因模块将在下一版本接入", type: "info" });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleImport = useCallback(() => {
    setToast({ msg: "反馈导入功能将在下一版本接入", type: "info" });
    setTimeout(() => setToast(null), 2000);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top Navigation — 64px height */}
      <TopNav
        feedbackCount={feedback.length}
        clusterCount={clusters.length}
        onImport={handleImport}
        onRunAI={handleRunAI}
        isAnalyzing={aiOverlayOpen}
      />

      {/* Main 3-column work area */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left panel - Feedback 280px */}
        <div className="w-[280px] flex-shrink-0 border-r border-border hidden md:block">
          <FeedbackPanel
            feedback={feedback}
            activeClusterId={activeClusterId}
            onSelectFeedback={handleSelectFeedback}
            selectedFeedbackId={selectedFeedback?.feedback_id || null}
            title="消费信号库"
            showAutoStatus
          />
        </div>

        {/* Center panel - Clusters */}
        <div className="flex-1 min-w-0">
          <ClusterPanel
            clusters={clusters}
            activeClusterId={activeClusterId}
            onSelectCluster={handleSelectCluster}
            totalFeedback={feedback.length}
            totalPainPoints={totalPainPoints}
            totalOpportunities={opportunities.length}
          />
        </div>

        {/* Right panel - Opportunity 360px */}
        <div className="w-[360px] flex-shrink-0 border-l border-border hidden lg:block">
          <OpportunityPanel
            opportunities={opportunities}
            activeId={activeOppId}
            onSelect={setActiveOppId}
            onConfirm={handleConfirm}
            onAddToPool={handleAddToPool}
            onGenerate={handleGenerate}
            confirmedIds={confirmedIds}
            pooledIds={pooledIds}
            autoDetected
          />
        </div>
      </main>

      {/* Footer disclaimer — 44px height */}
      <footer className="shrink-0 h-11 flex items-center border-t border-border bg-card px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-normal">
            当前结果用于产品机会预筛，不代表真实市场需求或销量预测。所有机会必须经过真人访谈、问卷、概念测试和企业数据验证。
          </p>
        </div>
      </footer>

      {/* Feedback Detail Drawer */}
      <FeedbackDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        item={selectedFeedback}
      />

      {/* AI Analysis Overlay */}
      <AIAnalysisOverlay
        open={aiOverlayOpen}
        steps={aiSteps}
        onComplete={handleAIComplete}
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
            {toast.type === "success" ? (
              <ShieldCheck className="h-5 w-5" />
            ) : (
              <Zap className="h-5 w-5 text-primary" />
            )}
            <span className="text-sm font-medium">{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
