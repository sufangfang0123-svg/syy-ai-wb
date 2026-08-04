"use client";

import { useState } from "react";
import { GlobalNav } from "@/components/layout/global-nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Rocket,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  MousePointer,
  MessageSquare,
  ShoppingCart,
  Users,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
} from "lucide-react";

interface LaunchRecord {
  launch_id: string;
  concept_id: string;
  concept_name: string;
  round: string;
  round_number: number;
  result: "survive" | "evolve" | "eliminate";
  ai_count: number;
  engagement: { exposure: number; click_rate: number; interaction: number; conversion: number };
}

const launches: LaunchRecord[] = [
  {
    launch_id: "L-C01-01",
    concept_id: "C01",
    concept_name: "棉感随行胶囊",
    round: "A-概念生存",
    round_number: 1,
    result: "survive",
    ai_count: 500,
    engagement: { exposure: 12400, click_rate: 4.8, interaction: 890, conversion: 2.1 },
  },
  {
    launch_id: "L-C01-02",
    concept_id: "C01",
    concept_name: "棉感随行胶囊",
    round: "B-版本进化",
    round_number: 2,
    result: "evolve",
    ai_count: 800,
    engagement: { exposure: 15600, click_rate: 5.2, interaction: 1100, conversion: 2.8 },
  },
  {
    launch_id: "L-C01-03",
    concept_id: "C01",
    concept_name: "棉感随行胶囊 · 经期加强版",
    round: "C-内容对战",
    round_number: 3,
    result: "survive",
    ai_count: 1200,
    engagement: { exposure: 18900, click_rate: 5.8, interaction: 1450, conversion: 3.2 },
  },
  {
    launch_id: "L-C02-01",
    concept_id: "C02",
    concept_name: "高温湿热通勤净护包",
    round: "A-概念生存",
    round_number: 1,
    result: "survive",
    ai_count: 500,
    engagement: { exposure: 8600, click_rate: 3.9, interaction: 520, conversion: 1.6 },
  },
  {
    launch_id: "L-C03-01",
    concept_id: "C03",
    concept_name: "办公桌女性安心抽屉",
    round: "A-概念生存",
    round_number: 1,
    result: "eliminate",
    ai_count: 400,
    engagement: { exposure: 4200, click_rate: 2.1, interaction: 180, conversion: 0.8 },
  },
];

const rounds = [
  { key: "A", name: "概念生存", number: "1-20", target: "伪需求/低频/低品牌匹配", keep: "30->15" },
  { key: "B", name: "版本进化", number: "21-50", target: "价值感不足/复杂度过高", keep: "15->8" },
  { key: "C", name: "内容对战", number: "51-75", target: "点击高但理解低", keep: "8->4" },
  { key: "D", name: "商业审判", number: "76-90", target: "增长不可持续/供应链难", keep: "4->2" },
  { key: "E", name: "真人校准", number: "91-100", target: "AI偏差/意愿与行为不符", keep: "2->1" },
];

export default function LaunchPage() {
  const [selectedLaunch, setSelectedLaunch] = useState<string | null>("L-C01-03");
  const [toast, setToast] = useState<{ msg: string; type: "info" | "success" } | null>(null);

  const showToast = (msg: string, type: "info" | "success" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const active = launches.find((l) => l.launch_id === selectedLaunch) || null;

  const totalExposure = launches.reduce((s, l) => s + l.engagement.exposure, 0);
  const totalAI = launches.reduce((s, l) => s + l.ai_count, 0);
  const avgClick = (launches.reduce((s, l) => s + l.engagement.click_rate, 0) / launches.length).toFixed(1);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <GlobalNav />

      <main className="flex-1 overflow-auto">
        {/* Stats */}
        <div className="px-6 pt-6 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Rocket} label="上市轮次" value={launches.length} color="primary" />
            <StatCard icon={Users} label="AI消费者" value={totalAI.toLocaleString()} color="blue" />
            <StatCard icon={TrendingUp} label="总曝光" value={totalExposure.toLocaleString()} color="green" />
            <StatCard icon={MousePointer} label="平均点击率" value={`${avgClick}%`} color="amber" />
          </div>
        </div>

        {/* 5-stage funnel */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {rounds.map((r, idx) => (
              <div key={r.key} className="flex items-center flex-shrink-0">
                <div className="rounded-xl border border-border bg-card p-3 w-44">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                      {r.key}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{r.name}</div>
                      <div className="text-xs text-muted-foreground">轮次 {r.number}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">淘汰: {r.target}</div>
                  <div className="text-xs font-medium text-primary">保留: {r.keep}</div>
                </div>
                {idx < rounds.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Left - Launch list */}
            <div className="xl:col-span-7 space-y-3">
              {launches.map((launch) => (
                <div
                  key={launch.launch_id}
                  onClick={() => setSelectedLaunch(launch.launch_id)}
                  className={cn(
                    "cursor-pointer rounded-xl border bg-card p-5 transition-all hover:shadow-md",
                    selectedLaunch === launch.launch_id
                      ? "border-primary ring-1 ring-primary/20"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ResultBadge result={launch.result} />
                      <Badge variant="outline" className="text-xs">{launch.round}</Badge>
                      <span className="text-xs text-muted-foreground font-mono">{launch.launch_id}</span>
                    </div>
                    <div className="text-sm font-semibold text-foreground">{launch.concept_name}</div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <MiniStat label="曝光" value={launch.engagement.exposure.toLocaleString()} icon={TrendingUp} />
                    <MiniStat label="点击" value={`${launch.engagement.click_rate}%`} icon={MousePointer} />
                    <MiniStat label="互动" value={launch.engagement.interaction.toLocaleString()} icon={MessageSquare} />
                    <MiniStat label="转化" value={`${launch.engagement.conversion}%`} icon={ShoppingCart} />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {launch.ai_count} 位AI消费者参与
                  </div>
                </div>
              ))}
            </div>

            {/* Right - Detail panel */}
            <div className="xl:col-span-5">
              {active ? (
                <div className="sticky top-0 space-y-4">
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <ResultBadge result={active.result} />
                      <Badge variant="outline" className="text-xs font-mono">{active.launch_id}</Badge>
                    </div>

                    <h2 className="text-xl font-bold text-foreground mb-2">{active.concept_name}</h2>
                    <div className="text-sm text-muted-foreground mb-4">
                      {active.round} · 第{active.round_number}轮
                    </div>

                    {/* AI consumer count */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">AI消费者参与</span>
                        <span className="text-lg font-bold">{active.ai_count}</span>
                      </div>
                      <Progress value={(active.ai_count / 1200) * 100} className="h-2" />
                    </div>

                    {/* Engagement metrics */}
                    <div className="mb-5">
                      <div className="text-sm font-medium text-muted-foreground mb-2">本轮数据表现</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-1">曝光量</div>
                          <div className="text-lg font-bold">{active.engagement.exposure.toLocaleString()}</div>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-1">点击率</div>
                          <div className="text-lg font-bold">{active.engagement.click_rate}%</div>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-1">互动量</div>
                          <div className="text-lg font-bold">{active.engagement.interaction.toLocaleString()}</div>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-1">转化率</div>
                          <div className="text-lg font-bold">{active.engagement.conversion}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Experiment outputs */}
                    <div className="mb-5 space-y-3">
                      <div className="text-sm font-medium text-muted-foreground mb-2">每轮实验输出</div>
                      
                      <div className="rounded-lg border border-border bg-card p-3">
                        <div className="text-xs font-semibold text-foreground mb-1">1. 本轮解释</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {active.result === "survive"
                            ? "核心场景下需求真实且高频，概念在目标人群中获得正向反馈，关键指标（点击率>4%、转化率>2%）达到预设阈值。"
                            : active.result === "evolve"
                            ? "概念存在价值，但部分维度（如使用场景覆盖、价格敏感度）反馈不一致，需优化后重新测试。"
                            : "需求验证失败：目标场景下用户现有替代方案已足够，新概念未提供显著差异化价值，且转化率低于淘汰阈值。"}
                        </p>
                      </div>
                      
                      <div className="rounded-lg border border-border bg-card p-3">
                        <div className="text-xs font-semibold text-foreground mb-1">2. 反事实测试</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {active.result === "survive"
                            ? "若去掉'模块化收纳'卖点，点击率下降1.8%；若去掉'隐私包装'，收藏率下降12%。核心卖点组合不可替代。"
                            : active.result === "evolve"
                            ? "若价格降低20%，转化率提升至3.5%；若增加'经期专项'场景，目标人群扩大至40%。优化方向明确。"
                            : "若改为常规棉柔巾形式，各项指标无显著差异；若增加香氛元素，负反馈增加25%。概念无独特价值锚点。"}
                        </p>
                      </div>
                      
                      <div className="rounded-lg border border-border bg-card p-3">
                        <div className="text-xs font-semibold text-foreground mb-1">3. 风险标注</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {active.result === "survive"
                            ? "待验证：真人使用场景下的便携性体验；供应链端的小批量定制成本；竞品模仿周期预估。"
                            : active.result === "evolve"
                            ? "风险：场景扩展可能导致品牌定位模糊；多SKU增加库存管理复杂度；需确认企业现有产能可覆盖。"
                            : "风险消除：避免了错误投入模具/备货成本；防止了品牌与不适配场景强行关联的稀释效应。"}
                        </p>
                      </div>
                      
                      <div className="rounded-lg border border-border bg-card p-3">
                        <div className="text-xs font-semibold text-foreground mb-1">4. 下一步动作</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {active.result === "survive"
                            ? "进入下一轮虚拟上市测试（内容对战阶段），同步启动真人小样本验证（n≥50），准备A/B测试素材。"
                            : active.result === "evolve"
                            ? "退回产品进化舱进行基因突变优化，重点调整G3任务基因和G5体验基因，2周后重新提交虚拟上市。"
                            : "归档淘汰原因至知识库，释放资源投入其他候选概念；若后续市场变化，可从基因库重新组合复活。"}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 gap-1.5"
                        onClick={() => showToast("开始下一轮虚拟上市", "success")}
                      >
                        <Play className="h-4 w-4" />
                        下一轮
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-1.5"
                        onClick={() => showToast("重新运行当前轮次", "info")}
                      >
                        <RotateCcw className="h-4 w-4" />
                        重跑
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sticky top-0 flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border bg-card/50">
                  <Rocket className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">点击左侧上市轮次查看详情</p>
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
            虚拟上市结果基于AI消费者模拟，不代表真实市场需求。最终决策必须经过真人研究和行为实验验证。
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

function ResultBadge({ result }: { result: string }) {
  const map: Record<string, { label: string; className: string }> = {
    survive: { label: "通过", className: "bg-green-100 text-green-700" },
    evolve: { label: "需进化", className: "bg-amber-100 text-amber-700" },
    eliminate: { label: "淘汰", className: "bg-red-100 text-red-700" },
  };
  const cfg = map[result] || map.survive;
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
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
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
