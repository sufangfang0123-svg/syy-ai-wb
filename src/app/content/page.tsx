"use client";

import { useState, useMemo } from "react";
import { GlobalNav } from "@/components/layout/global-nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Sparkles,
  TrendingUp,
  MousePointer,
  MessageSquare,
  ShoppingCart,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Users,
  Tag,
  Eye,
  Heart,
  Share2,
  Bookmark,
  ChevronRight,
  Filter,
} from "lucide-react";

interface ContentAsset {
  asset_id: string;
  concept_id: string;
  concept_name: string;
  channel: "xiaohongshu" | "douyin" | "video" | "ecommerce" | "live" | "private";
  status: "published" | "draft" | "review";
  compliance: "green" | "yellow" | "red";
  structure: {
    fact: string;
    persona: string;
    selling: string;
    evidence: string;
    creative: string;
    performance: string;
  };
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
}

const channelMeta: Record<string, { label: string; color: string; icon: string }> = {
  xiaohongshu: { label: "小红书", color: "bg-red-100 text-red-700", icon: "BookOpen" },
  douyin: { label: "抖音", color: "bg-black text-white", icon: "Music" },
  video: { label: "视频号", color: "bg-green-100 text-green-700", icon: "Video" },
  ecommerce: { label: "电商", color: "bg-orange-100 text-orange-700", icon: "ShoppingBag" },
  live: { label: "直播", color: "bg-purple-100 text-purple-700", icon: "Radio" },
  private: { label: "私域", color: "bg-blue-100 text-blue-700", icon: "MessageCircle" },
};

const assets: ContentAsset[] = [
  {
    asset_id: "CA-001",
    concept_id: "C01",
    concept_name: "棉感随行胶囊",
    channel: "xiaohongshu",
    status: "published",
    compliance: "green",
    structure: {
      fact: "全棉水刺无纺布，零荧光零添加",
      persona: "18-30岁通勤年轻女性",
      selling: "模块化收纳，单手取用，隐私包装",
      evidence: "第三方检测报告，棉纤维含量>99%",
      creative: "通勤包整理vlog，对比实验展示",
      performance: "曝光1.2万，点击率4.8%",
    },
    metrics: { views: 12400, likes: 890, comments: 156, shares: 78, saves: 345 },
  },
  {
    asset_id: "CA-002",
    concept_id: "C01",
    concept_name: "棉感随行胶囊",
    channel: "douyin",
    status: "published",
    compliance: "green",
    structure: {
      fact: "经期加强版，增加吸水纤维",
      persona: "经期关注年轻女性",
      selling: "大吸量+隐私收纳+经期专项",
      evidence: "对比实验视频，吸水速度实测",
      creative: "15秒快节奏开箱+场景演示",
      performance: "曝光1.8万，完播率62%",
    },
    metrics: { views: 18900, likes: 1450, comments: 230, shares: 120, saves: 560 },
  },
  {
    asset_id: "CA-003",
    concept_id: "C02",
    concept_name: "高温湿热通勤净护包",
    channel: "video",
    status: "review",
    compliance: "yellow",
    structure: {
      fact: "Cotton Cool技术，清凉触感",
      persona: "易出汗敏感人群",
      selling: "清凉+便携+速干",
      evidence: "温度对比测试（待补充真人测试）",
      creative: "高温通勤场景反差对比",
      performance: "待发布",
    },
    metrics: { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 },
  },
  {
    asset_id: "CA-004",
    concept_id: "C01",
    concept_name: "棉感随行胶囊",
    channel: "ecommerce",
    status: "published",
    compliance: "green",
    structure: {
      fact: "基础盒+补充芯，可循环使用",
      persona: "宿舍/通勤年轻女性",
      selling: "环保+经济+隐私",
      evidence: "销量数据+好评率98%",
      creative: "产品详情页+买家秀合集",
      performance: "月销800+，复购率35%",
    },
    metrics: { views: 8600, likes: 520, comments: 89, shares: 45, saves: 210 },
  },
  {
    asset_id: "CA-005",
    concept_id: "C01",
    concept_name: "棉感随行胶囊",
    channel: "private",
    status: "draft",
    compliance: "green",
    structure: {
      fact: "经期专项补充装，限定私域首发",
      persona: "已购用户高复购群体",
      selling: "限定色+专属价+会员权益",
      evidence: "复购数据+用户反馈截图",
      creative: "私域社群图文+小程序卡片",
      performance: "草稿中",
    },
    metrics: { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 },
  },
];

const complianceMeta: Record<string, { label: string; className: string; dot: string }> = {
  green: { label: "合规通过", className: "bg-green-100 text-green-700", dot: "bg-green-500" },
  yellow: { label: "待审核", className: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  red: { label: "风险", className: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

export default function ContentPage() {
  const [selectedAsset, setSelectedAsset] = useState<string | null>("CA-002");
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "info" | "success" } | null>(null);

  const showToast = (msg: string, type: "info" | "success" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const activeAsset = assets.find((a) => a.asset_id === selectedAsset) || null;

  const filteredAssets = useMemo(() => {
    if (!channelFilter) return assets;
    return assets.filter((a) => a.channel === channelFilter);
  }, [channelFilter]);

  const stats = useMemo(() => {
    const published = assets.filter((a) => a.status === "published").length;
    const draft = assets.filter((a) => a.status === "draft").length;
    const review = assets.filter((a) => a.status === "review").length;
    const totalViews = assets.reduce((s, a) => s + a.metrics.views, 0);
    const totalLikes = assets.reduce((s, a) => s + a.metrics.likes, 0);
    return { published, draft, review, totalViews, totalLikes };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <GlobalNav />

      <main className="flex-1 overflow-auto">
        {/* Stats */}
        <div className="px-6 pt-6 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Layers} label="内容资产" value={assets.length} color="primary" />
            <StatCard icon={CheckCircle2} label="已发布" value={stats.published} color="green" />
            <StatCard icon={Eye} label="总曝光" value={stats.totalViews.toLocaleString()} color="blue" />
            <StatCard icon={Heart} label="总互动" value={stats.totalLikes.toLocaleString()} color="amber" />
          </div>
        </div>

        {/* Channel filter */}
        <div className="px-6 pb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-sm text-muted-foreground mr-2">渠道筛选:</span>
            <button
              onClick={() => setChannelFilter(null)}
              className={cn(
                "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                !channelFilter ? "bg-primary text-white" : "hover:bg-secondary text-muted-foreground"
              )}
            >
              全部
            </button>
            {Object.entries(channelMeta).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setChannelFilter(channelFilter === key ? null : key)}
                className={cn(
                  "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                  channelFilter === key ? "ring-1 ring-primary bg-primary/10" : "hover:bg-secondary text-muted-foreground"
                )}
              >
                {meta.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            className="h-9 gap-1.5 ml-auto"
            onClick={() => showToast("跨渠道内容生成功能开发中", "info")}
          >
            <Sparkles className="h-4 w-4" />
            一稿多发
          </Button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Left - Asset list */}
            <div className="xl:col-span-7 space-y-3">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.asset_id}
                  onClick={() => setSelectedAsset(asset.asset_id)}
                  className={cn(
                    "cursor-pointer rounded-xl border bg-card p-5 transition-all hover:shadow-md",
                    selectedAsset === asset.asset_id
                      ? "border-primary ring-1 ring-primary/20"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={cn("text-xs", channelMeta[asset.channel]?.color)}>
                        {channelMeta[asset.channel]?.label}
                      </Badge>
                      <ComplianceBadge level={asset.compliance} />
                      <span className="text-xs text-muted-foreground font-mono">{asset.asset_id}</span>
                    </div>
                    <div className="text-sm font-semibold text-foreground">{asset.concept_name}</div>
                  </div>

                  <h3 className="text-base font-semibold text-foreground mb-2">
                    {asset.structure.creative}
                  </h3>

                  {/* 6-block structure summary */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <StructureBlock label="事实" value={asset.structure.fact} />
                    <StructureBlock label="人群" value={asset.structure.persona} />
                    <StructureBlock label="卖点" value={asset.structure.selling} />
                    <StructureBlock label="证据" value={asset.structure.evidence} />
                    <StructureBlock label="创意" value={asset.structure.creative} />
                    <StructureBlock label="表现" value={asset.structure.performance} />
                  </div>

                  {/* Metrics */}
                  {asset.status === "published" ? (
                    <div className="grid grid-cols-5 gap-2">
                      <MiniMetric icon={Eye} value={asset.metrics.views.toLocaleString()} label="曝光" />
                      <MiniMetric icon={Heart} value={asset.metrics.likes.toLocaleString()} label="点赞" />
                      <MiniMetric icon={MessageSquare} value={asset.metrics.comments.toLocaleString()} label="评论" />
                      <MiniMetric icon={Share2} value={asset.metrics.shares.toLocaleString()} label="分享" />
                      <MiniMetric icon={Bookmark} value={asset.metrics.saves.toLocaleString()} label="收藏" />
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2 text-center">
                      {asset.status === "draft" ? "草稿中，尚未发布" : "待审核中"}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Right - Detail panel */}
            <div className="xl:col-span-5">
              {activeAsset ? (
                <div className="sticky top-0 space-y-4">
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="secondary" className={cn("text-xs", channelMeta[activeAsset.channel]?.color)}>
                        {channelMeta[activeAsset.channel]?.label}
                      </Badge>
                      <ComplianceBadge level={activeAsset.compliance} />
                      <span className="text-xs text-muted-foreground font-mono">{activeAsset.asset_id}</span>
                    </div>

                    <h2 className="text-xl font-bold text-foreground mb-2">{activeAsset.concept_name}</h2>
                    <div className="text-sm text-muted-foreground mb-4">{activeAsset.structure.creative}</div>

                    {/* 6-block content structure */}
                    <div className="mb-5">
                      <div className="text-sm font-medium text-muted-foreground mb-3">内容资产六块</div>
                      <div className="space-y-3">
                        <StructureDetail icon={FileText} label="事实块" value={activeAsset.structure.fact} color="blue" />
                        <StructureDetail icon={Users} label="人群块" value={activeAsset.structure.persona} color="green" />
                        <StructureDetail icon={Tag} label="卖点块" value={activeAsset.structure.selling} color="amber" />
                        <StructureDetail icon={ShieldCheck} label="证据块" value={activeAsset.structure.evidence} color="purple" />
                        <StructureDetail icon={Sparkles} label="创意块" value={activeAsset.structure.creative} color="pink" />
                        <StructureDetail icon={TrendingUp} label="表现块" value={activeAsset.structure.performance} color="cyan" />
                      </div>
                    </div>

                    {/* Compliance status */}
                    <div className="mb-5">
                      <div className="text-sm font-medium text-muted-foreground mb-2">合规标签</div>
                      <div className={cn("rounded-lg p-3 text-sm", complianceMeta[activeAsset.compliance].className)}>
                        {complianceMeta[activeAsset.compliance].label}
                        {activeAsset.compliance === "yellow" && ": 证据块缺少真人测试数据，需补充后重新审核"}
                        {activeAsset.compliance === "red" && ": 存在绝对化用语或虚假宣传风险，需修改"}
                      </div>
                    </div>

                    {/* Performance metrics */}
                    {activeAsset.status === "published" && activeAsset.metrics.views > 0 ? (
                      <div className="mb-5">
                        <div className="text-sm font-medium text-muted-foreground mb-2">数据回流</div>
                        <div className="grid grid-cols-5 gap-2">
                          <MetricBox icon={Eye} value={activeAsset.metrics.views.toLocaleString()} label="曝光" />
                          <MetricBox icon={Heart} value={activeAsset.metrics.likes.toLocaleString()} label="点赞" />
                          <MetricBox icon={MessageSquare} value={activeAsset.metrics.comments.toLocaleString()} label="评论" />
                          <MetricBox icon={Share2} value={activeAsset.metrics.shares.toLocaleString()} label="分享" />
                          <MetricBox icon={Bookmark} value={activeAsset.metrics.saves.toLocaleString()} label="收藏" />
                        </div>
                      </div>
                    ) : null}

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 gap-1.5"
                        onClick={() => showToast("已复制内容资产到剪贴板", "success")}
                      >
                        <FileText className="h-4 w-4" />
                        复制内容
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-1.5"
                        onClick={() => showToast("跨渠道适配功能开发中", "info")}
                      >
                        <Layers className="h-4 w-4" />
                        一稿多发
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sticky top-0 flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border bg-card/50">
                  <Layers className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">点击左侧内容资产查看详情</p>
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
            内容资产数据来源于平台公开接口与后台回流，已脱敏处理。合规标签基于平台规则预检，最终以平台审核结果为准。
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

function ComplianceBadge({ level }: { level: string }) {
  const meta = complianceMeta[level] || complianceMeta.green;
  return (
    <Badge variant="secondary" className={cn("text-xs", meta.className)}>
      <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1", meta.dot)} />
      {meta.label}
    </Badge>
  );
}

function StructureBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary/50 rounded-lg p-2">
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="text-xs font-medium text-foreground line-clamp-1">{value}</div>
    </div>
  );
}

function StructureDetail({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-500 bg-blue-50",
    green: "text-green-500 bg-green-50",
    amber: "text-amber-500 bg-amber-50",
    purple: "text-purple-500 bg-purple-50",
    pink: "text-pink-500 bg-pink-50",
    cyan: "text-cyan-500 bg-cyan-50",
  };
  return (
    <div className="flex items-start gap-2">
      <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0", colorMap[color])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        <div className="text-sm text-foreground">{value}</div>
      </div>
    </div>
  );
}

function MiniMetric({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="bg-secondary/50 rounded-lg p-2 text-center">
      <Icon className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
      <div className="text-xs font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function MetricBox({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="bg-secondary/50 rounded-lg p-3 text-center">
      <Icon className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
      <div className="text-sm font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
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
