"use client";

import { useState, useMemo } from "react";
import { GlobalNav } from "@/components/layout/global-nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dna,
  GitBranch,
  Trophy,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Zap,
  Layers,
  X,
  TrendingUp,
  BarChart3,
  MessageSquare,
  MousePointer,
  ShoppingCart,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface Concept {
  concept_id: string;
  name: string;
  status: "surviving" | "evolving" | "eliminated";
  score: number;
  generation: number;
  parent_id: string | null;
  mutations: string[];
  launch_round: string;
  engagement: { exposure: number; click_rate: number; interaction: number; conversion: number };
  genes: Record<string, string>;
  veto: Record<string, boolean>;
}

const concepts: Concept[] = [
  {
    concept_id: "C01",
    name: "棉感随行胶囊",
    status: "surviving",
    score: 89.0,
    generation: 1,
    parent_id: null,
    mutations: [],
    launch_round: "C-内容对战",
    engagement: { exposure: 12400, click_rate: 4.8, interaction: 890, conversion: 2.1 },
    genes: { G1: "18-30岁年轻女性", G2: "宿舍/通勤/短途旅行", G3: "洁面+经期+清洁+换洗", G4: "全棉水刺无纺布", G5: "模块化、单手取用、隐私收纳", G6: "安心、体面、松弛", G7: "对比实验、清单化", G8: "基础盒+补充芯" },
    veto: { V1: true, V2: true, V3: true, V4: true, V5: true },
  },
  {
    concept_id: "C01-V2",
    name: "棉感随行胶囊 · 经期加强版",
    status: "surviving",
    score: 91.5,
    generation: 2,
    parent_id: "C01",
    mutations: ["G3: 增加经期护理", "G4: 增加吸水纤维", "G5: 增加大吸量", "G8: 增加经期专项包"],
    launch_round: "C-内容对战",
    engagement: { exposure: 15600, click_rate: 5.2, interaction: 1100, conversion: 2.8 },
    genes: { G1: "18-30岁年轻女性（经期重点）", G2: "宿舍/通勤/短途旅行", G3: "洁面+经期护理+清洁+换洗", G4: "全棉水刺+吸水纤维", G5: "模块化、单手取用、隐私收纳、大吸量", G6: "安心、体面、掌控感", G7: "对比实验、清单化、开箱", G8: "基础盒+补充芯+经期专项包" },
    veto: { V1: true, V2: true, V3: true, V4: true, V5: true },
  },
  {
    concept_id: "C02",
    name: "高温湿热通勤净护包",
    status: "evolving",
    score: 87.5,
    generation: 1,
    parent_id: null,
    mutations: [],
    launch_round: "B-版本进化",
    engagement: { exposure: 8600, click_rate: 3.9, interaction: 520, conversion: 1.6 },
    genes: { G1: "易出汗、敏感感受人群", G2: "高温湿热城市通勤", G3: "清洁+吸汗+舒缓", G4: "Cotton Cool技术", G5: "清凉触感、便携、速干", G6: "体面、清爽", G7: "场景反差、可视化", G8: "单品+组合装" },
    veto: { V1: true, V2: true, V3: true, V4: false, V5: true },
  },
  {
    concept_id: "C03",
    name: "办公桌女性安心抽屉",
    status: "eliminated",
    score: 87.2,
    generation: 1,
    parent_id: null,
    mutations: [],
    launch_round: "D-商业审判",
    engagement: { exposure: 4200, click_rate: 2.1, interaction: 180, conversion: 0.8 },
    genes: { G1: "职场女性", G2: "办公室/实习", G3: "收纳+备用+隐私", G4: "标准全棉", G5: "抽屉适配、隐蔽", G6: "安心、体面", G7: "清单化", G8: "订阅制" },
    veto: { V1: true, V2: true, V3: true, V4: true, V5: false },
  },
];

const geneMeta: Record<string, { label: string; color: string }> = {
  G1: { label: "人群", color: "bg-blue-100 text-blue-700" },
  G2: { label: "场景", color: "bg-green-100 text-green-700" },
  G3: { label: "任务", color: "bg-purple-100 text-purple-700" },
  G4: { label: "材料", color: "bg-orange-100 text-orange-700" },
  G5: { label: "体验", color: "bg-pink-100 text-pink-700" },
  G6: { label: "情绪", color: "bg-amber-100 text-amber-700" },
  G7: { label: "传播", color: "bg-cyan-100 text-cyan-700" },
  G8: { label: "商业", color: "bg-gray-100 text-gray-700" },
};

const vetoLabels: Record<string, string> = {
  V1: "V1 消费者否决",
  V2: "V2 技术可行性否决",
  V3: "V3 品牌一致性否决",
  V4: "V4 供应链否决",
  V5: "V5 商业可持续否决",
};

export default function EvolutionPage() {
  const [selectedConcept, setSelectedConcept] = useState<string | null>("C01");
  const [geneFilter, setGeneFilter] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "info" | "success" } | null>(null);

  const showToast = (msg: string, type: "info" | "success" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const activeConcept = concepts.find((c) => c.concept_id === selectedConcept) || null;

  const filteredConcepts = useMemo(() => {
    if (!geneFilter) return concepts;
    return concepts.filter((c) => c.genes[geneFilter]);
  }, [geneFilter]);

  const stats = useMemo(() => {
    const total = concepts.length;
    const surviving = concepts.filter((c) => c.status === "surviving").length;
    const evolving = concepts.filter((c) => c.status === "evolving").length;
    const eliminated = concepts.filter((c) => c.status === "eliminated").length;
    return { total, surviving, evolving, eliminated };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <GlobalNav />

      <main className="flex-1 overflow-auto">
        {/* Stats */}
        <div className="px-6 pt-6 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Layers} label="概念总数" value={stats.total} color="primary" />
            <StatCard icon={Trophy} label="存活中" value={stats.surviving} color="green" />
            <StatCard icon={Zap} label="进化中" value={stats.evolving} color="amber" />
            <StatCard icon={X} label="已淘汰" value={stats.eliminated} color="red" />
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 pb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-sm text-muted-foreground mr-2">基因筛选:</span>
            {Object.entries(geneMeta).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setGeneFilter(geneFilter === key ? null : key)}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium transition-colors",
                  geneFilter === key ? "ring-1 ring-primary bg-primary/10" : "hover:bg-secondary"
                )}
              >
                <span className={cn("inline-block w-2 h-2 rounded-full mr-1", meta.color.split(" ")[0])} />
                {meta.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            className="h-9 gap-1.5 ml-auto"
            onClick={() => showToast("基因交叉实验功能开发中", "info")}
          >
            <Dna className="h-4 w-4" />
            基因交叉
          </Button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Left - Concept list */}
            <div className="xl:col-span-7 space-y-3">
              {filteredConcepts.map((concept) => (
                <div
                  key={concept.concept_id}
                  onClick={() => setSelectedConcept(concept.concept_id)}
                  className={cn(
                    "cursor-pointer rounded-xl border bg-card p-5 transition-all hover:shadow-md",
                    selectedConcept === concept.concept_id
                      ? "border-primary ring-1 ring-primary/20"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={concept.status} />
                      {concept.generation > 1 && (
                        <Badge variant="outline" className="text-xs">
                          <GitBranch className="h-3 w-3 mr-1" />
                          第{concept.generation}代
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground font-mono">
                        {concept.concept_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold text-primary">{concept.score}</span>
                      <span className="text-xs text-muted-foreground">分</span>
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-foreground mb-2">{concept.name}</h3>

                  {/* Genes */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {Object.entries(concept.genes).map(([geneKey, geneVal]) => (
                      <span
                        key={geneKey}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                          geneMeta[geneKey]?.color || "bg-gray-100 text-gray-700"
                        )}
                      >
                        <span className="font-bold">{geneKey}</span>
                        <span className="opacity-70">{geneMeta[geneKey]?.label}</span>
                      </span>
                    ))}
                  </div>

                  {/* Mutations */}
                  {concept.mutations.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-muted-foreground mb-1">基因突变:</div>
                      <div className="flex flex-wrap gap-1">
                        {concept.mutations.map((m, i) => (
                          <span key={i} className="text-xs bg-amber-50 text-amber-700 rounded px-2 py-0.5">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Engagement mini stats */}
                  <div className="grid grid-cols-4 gap-2">
                    <MiniStat label="曝光" value={concept.engagement.exposure.toLocaleString()} icon={TrendingUp} />
                    <MiniStat label="点击" value={`${concept.engagement.click_rate}%`} icon={MousePointer} />
                    <MiniStat label="互动" value={concept.engagement.interaction.toLocaleString()} icon={MessageSquare} />
                    <MiniStat label="转化" value={`${concept.engagement.conversion}%`} icon={ShoppingCart} />
                  </div>
                </div>
              ))}
            </div>

            {/* Right - Detail panel */}
            <div className="xl:col-span-5">
              {activeConcept ? (
                <div className="sticky top-0 space-y-4">
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <StatusBadge status={activeConcept.status} />
                      {activeConcept.generation > 1 && (
                        <Badge variant="outline" className="text-xs">
                          <GitBranch className="h-3 w-3 mr-1" />
                          第{activeConcept.generation}代
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground font-mono">
                        {activeConcept.concept_id}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-foreground mb-2">{activeConcept.name}</h2>
                    <div className="text-sm text-muted-foreground mb-4">
                      {activeConcept.launch_round} · 评分 {activeConcept.score}
                    </div>

                    {/* Score meter */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">综合评分</span>
                        <span className="text-lg font-bold text-primary">{activeConcept.score}分</span>
                      </div>
                      <Progress value={activeConcept.score} className="h-2" />
                    </div>

                    {/* Gene details */}
                    <div className="mb-5">
                      <div className="text-sm font-medium text-muted-foreground mb-2">基因图谱 (8类棉基因)</div>
                      <div className="space-y-2">
                        {Object.entries(activeConcept.genes).map(([key, val]) => (
                          <div key={key} className="flex items-start gap-2">
                            <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium flex-shrink-0", geneMeta[key]?.color)}>
                              <span className="font-bold">{key}</span>
                            </span>
                            <span className="text-sm text-foreground">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Veto gates */}
                    <div className="mb-5">
                      <div className="text-sm font-medium text-muted-foreground mb-2">五道否决门</div>
                      <div className="space-y-1.5">
                        {Object.entries(activeConcept.veto).map(([key, passed]) => (
                          <div key={key} className="flex items-center gap-2">
                            {passed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                            <span className={cn("text-sm", passed ? "text-foreground" : "text-red-600 font-medium")}>
                              {vetoLabels[key] || key}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 gap-1.5"
                        onClick={() => showToast("已进入虚拟上市", "success")}
                      >
                        <Trophy className="h-4 w-4" />
                        进入虚拟上市
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-1.5"
                        onClick={() => showToast("基因突变实验已启动", "info")}
                      >
                        <Dna className="h-4 w-4" />
                        基因突变
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sticky top-0 flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border bg-card/50">
                  <Dna className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">点击左侧概念卡片查看基因详情</p>
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
            概念评分基于AI消费者模拟测试，不代表真实市场表现。所有概念须通过五道否决门和真人校准验证。
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    surviving: { label: "存活中", className: "bg-green-100 text-green-700" },
    evolving: { label: "进化中", className: "bg-amber-100 text-amber-700" },
    eliminated: { label: "已淘汰", className: "bg-red-100 text-red-700" },
  };
  const cfg = map[status] || map.surviving;
  return <Badge variant="secondary" className={cn("text-xs", cfg.className)}>{cfg.label}</Badge>;
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
    red: "bg-red-100 text-red-700",
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

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="bg-secondary/50 rounded-lg p-2 text-center">
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="text-sm font-semibold flex items-center justify-center gap-1">
        <Icon className="h-3 w-3 text-muted-foreground" />
        {value}
      </div>
    </div>
  );
}
