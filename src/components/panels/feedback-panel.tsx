"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Heart, MessageCircle, MapPin } from "lucide-react";
import { FeedbackItem, Platform, Sentiment } from "@/types";
import { platformMeta, sentimentMeta, dataTypeMeta } from "@/lib/utils";

interface FeedbackPanelProps {
  feedback: FeedbackItem[];
  activeClusterId: string | null;
  onSelectFeedback: (item: FeedbackItem) => void;
  selectedFeedbackId: string | null;
  title?: string;
  showAutoStatus?: boolean;
}

export function FeedbackPanel({
  feedback,
  activeClusterId,
  onSelectFeedback,
  selectedFeedbackId,
  title = "原始反馈库",
  showAutoStatus = false,
}: FeedbackPanelProps) {
  const [search, setSearch] = useState("");
  const [dataTypeFilter, setDataTypeFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | "all">("all");
  const [scenarioFilter, setScenarioFilter] = useState<string>("all");

  const allScenarios = useMemo(() => {
    const set = new Set<string>();
    feedback.forEach((f) => f.scenarios.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [feedback]);

  const filtered = useMemo(() => {
    return feedback.filter((f) => {
      if (activeClusterId && f.cluster_id !== activeClusterId) return false;
      if (dataTypeFilter !== "all" && f.data_type !== dataTypeFilter) return false;
      if (platformFilter !== "all" && f.platform !== platformFilter) return false;
      if (sentimentFilter !== "all" && f.sentiment !== sentimentFilter) return false;
      if (scenarioFilter !== "all" && !f.scenarios.includes(scenarioFilter)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!f.raw_text.toLowerCase().includes(q) && !f.product_name.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [feedback, activeClusterId, dataTypeFilter, platformFilter, sentimentFilter, scenarioFilter, search]);

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <Badge variant="secondary" className="text-xs h-6 px-2">
            {filtered.length} 条
          </Badge>
        </div>

        {showAutoStatus && (
          <div className="flex items-center gap-2 mb-3 rounded-lg bg-secondary px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">自动更新中</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">上次扫描：8分钟前</span>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索反馈内容…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>

        {/* Data type segmented control — 3 options only */}
        <div className="flex items-center rounded-lg border border-border p-1 bg-secondary mb-3">
          {[
            { key: "all", label: "全部" },
            { key: "public", label: "公开反馈" },
            { key: "interview", label: "真人访谈" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setDataTypeFilter(opt.key)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                dataTypeFilter === opt.key
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Dropdown filters — 3 columns */}
        <div className="grid grid-cols-3 gap-2">
          <DropdownFilter
            label="平台"
            value={platformFilter === "all" ? "全部" : platformMeta[platformFilter]?.label || platformFilter}
            onChange={(v) => setPlatformFilter(v as Platform | "all")}
            options={[
              { value: "all", label: "全部平台" },
              ...Object.entries(platformMeta).map(([key, v]) => ({ value: key, label: v.label })),
            ]}
          />
          <DropdownFilter
            label="情绪"
            value={sentimentFilter === "all" ? "全部" : sentimentMeta[sentimentFilter]?.label || sentimentFilter}
            onChange={(v) => setSentimentFilter(v as Sentiment | "all")}
            options={[
              { value: "all", label: "全部情绪" },
              ...Object.entries(sentimentMeta).map(([key, v]) => ({ value: key, label: v.label })),
            ]}
          />
          <DropdownFilter
            label="场景"
            value={scenarioFilter === "all" ? "全部" : scenarioFilter}
            onChange={(v) => setScenarioFilter(v)}
            options={[
              { value: "all", label: "全部场景" },
              ...allScenarios.map((s) => ({ value: s, label: s })),
            ]}
          />
        </div>
      </div>

      {/* Feedback list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              暂无匹配的反馈数据
            </div>
          ) : (
            filtered.map((item) => (
              <FeedbackCard
                key={item.feedback_id}
                item={item}
                isSelected={selectedFeedbackId === item.feedback_id}
                onClick={() => onSelectFeedback(item)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function DropdownFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <label className="text-[11px] text-muted-foreground mb-0.5 block">{label}</label>
      <select
        value={options.find((o) => o.label === value)?.value || "all"}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-secondary px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FeedbackCard({
  item,
  isSelected,
  onClick,
}: {
  item: FeedbackItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const pm = platformMeta[item.platform];
  const sm = sentimentMeta[item.sentiment];
  const dtm = dataTypeMeta[item.data_type];

  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer rounded-xl border transition-all no-select ${
        isSelected
          ? "border-primary bg-primary-50 shadow-sm"
          : "border-border bg-white hover:border-border/80 hover:shadow-sm"
      }`}
    >
      {/* Left accent bar — 3px brand green when selected */}
      <div
        className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full transition-colors ${
          isSelected ? "bg-primary" : "bg-transparent group-hover:bg-border"
        }`}
      />

      <div className="p-4 pl-5">
        {/* Meta row */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: pm.bg, color: pm.color }}
          >
            {pm.label}
          </span>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${sm.dot}`} />
          <span className="text-xs text-muted-foreground">{sm.label}</span>
          <span className="text-xs text-muted-foreground ml-auto">{item.publish_date}</span>
        </div>

        {/* Raw text — up to 3 lines */}
        <p className="text-sm text-foreground line-clamp-3 leading-relaxed">{item.raw_text}</p>

        {/* Footer */}
        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{item.likes}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{item.reply_count}</span>
          </div>
          {item.scenarios[0] && (
            <div className="flex items-center gap-0.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{item.scenarios[0]}</span>
            </div>
          )}
          <span
            className="ml-auto inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: dtm.bg, color: dtm.color }}
          >
            {dtm.label}
          </span>
        </div>

        {/* Tags — max 2 */}
        {item.pain_points.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.pain_points.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs py-0.5 px-1.5 font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
