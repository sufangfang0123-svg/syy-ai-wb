"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MonitorTask } from "@/types";
import { Plus, X, Save, Play } from "lucide-react";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (task: Partial<MonitorTask>) => void;
}

export function CreateTaskDialog({ open, onOpenChange, onSave }: CreateTaskDialogProps) {
  const [name, setName] = useState("");
  const [theme, setTheme] = useState("");
  const [keywords, setKeywords] = useState<string[]>([""]);
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>([""]);
  const [sources, setSources] = useState<string[]>(["search_web", "ecommerce_review"]);
  const [frequency, setFrequency] = useState<"hourly" | "daily" | "weekly" | "manual">("daily");
  const [timeRange, setTimeRange] = useState(30);
  const [targets, setTargets] = useState<string[]>(["新痛点", "高频抱怨"]);
  const [alertOnAnomaly, setAlertOnAnomaly] = useState(true);

  const addKeyword = (list: string[], setter: (v: string[]) => void) => {
    setter([...list, ""]);
  };

  const updateKeyword = (index: number, value: string, list: string[], setter: (v: string[]) => void) => {
    const next = [...list];
    next[index] = value;
    setter(next);
  };

  const removeKeyword = (index: number, list: string[], setter: (v: string[]) => void) => {
    const next = list.filter((_, i) => i !== index);
    setter(next.length ? next : [""]);
  };

  const sourceOptions = [
    { value: "search_web", label: "搜索与公开网页" },
    { value: "ecommerce_review", label: "电商评论" },
    { value: "social_public", label: "社交公开内容" },
    { value: "news_industry", label: "行业资讯" },
    { value: "brand_content", label: "品牌公开内容" },
    { value: "user_authorized", label: "用户授权数据" },
  ];

  const targetOptions = [
    "新痛点", "高频抱怨", "新使用场景", "竞品变化", "价格敏感",
    "内容热点", "产品机会", "健康关注", "环保关注", "传播主题",
  ];

  const handleSave = (runNow: boolean) => {
    const task: Partial<MonitorTask> = {
      name,
      theme,
      keywords: keywords.filter((k) => k.trim()),
      exclude_keywords: excludeKeywords.filter((k) => k.trim()),
      sources,
      frequency,
      time_range_days: timeRange,
      monitoring_targets: targets,
      alert_on_anomaly: alertOnAnomaly,
      status: runNow ? "running" : "draft",
    };
    onSave?.(task);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">新建监测任务</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Task name */}
          <div className="space-y-2">
            <Label htmlFor="task-name">任务名称</Label>
            <Input
              id="task-name"
              placeholder="例如：年轻女性便携护理需求监测"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label htmlFor="task-theme">监测主题</Label>
            <Input
              id="task-theme"
              placeholder="描述本次监测的核心目标"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label>监测关键词</Label>
            <div className="space-y-2">
              {keywords.map((kw, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={`关键词 ${i + 1}`}
                    value={kw}
                    onChange={(e) => updateKeyword(i, e.target.value, keywords, setKeywords)}
                    className="h-10 flex-1"
                  />
                  {keywords.length > 1 && (
                    <button
                      onClick={() => removeKeyword(i, keywords, setKeywords)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => addKeyword(keywords, setKeywords)}
              >
                <Plus className="h-3 w-3" />
                添加关键词
              </Button>
            </div>
          </div>

          {/* Exclude keywords */}
          <div className="space-y-2">
            <Label>排除关键词</Label>
            <div className="space-y-2">
              {excludeKeywords.map((kw, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={`排除词 ${i + 1}`}
                    value={kw}
                    onChange={(e) => updateKeyword(i, e.target.value, excludeKeywords, setExcludeKeywords)}
                    className="h-10 flex-1"
                  />
                  {excludeKeywords.length > 1 && (
                    <button
                      onClick={() => removeKeyword(i, excludeKeywords, setExcludeKeywords)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => addKeyword(excludeKeywords, setExcludeKeywords)}
              >
                <Plus className="h-3 w-3" />
                添加排除词
              </Button>
            </div>
          </div>

          {/* Sources */}
          <div className="space-y-2">
            <Label>选择数据源</Label>
            <div className="flex flex-wrap gap-2">
              {sourceOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSources((prev) =>
                      prev.includes(opt.value)
                        ? prev.filter((s) => s !== opt.value)
                        : [...prev, opt.value]
                    );
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                    sources.includes(opt.value)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>扫描频率</Label>
            <div className="flex gap-2">
              {(["hourly", "daily", "weekly", "manual"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                    frequency === f
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {f === "hourly" ? "每小时" : f === "daily" ? "每天" : f === "weekly" ? "每周" : "手动"}
                </button>
              ))}
            </div>
          </div>

          {/* Time range */}
          <div className="space-y-2">
            <Label htmlFor="time-range">时间范围（天）</Label>
            <Input
              id="time-range"
              type="number"
              min={1}
              max={365}
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="h-10 w-32"
            />
          </div>

          {/* Monitoring targets */}
          <div className="space-y-2">
            <Label>监测目标</Label>
            <div className="flex flex-wrap gap-2">
              {targetOptions.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTargets((prev) =>
                      prev.includes(t)
                        ? prev.filter((x) => x !== t)
                        : [...prev, t]
                    );
                  }}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    targets.includes(t)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Alert on anomaly */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="alert-anomaly"
              checked={alertOnAnomaly}
              onChange={(e) => setAlertOnAnomaly(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="alert-anomaly" className="text-sm cursor-pointer">
              异常增长时自动提醒
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} className="gap-1">
            <Save className="h-4 w-4" />
            保存草稿
          </Button>
          <Button onClick={() => handleSave(true)} className="gap-1 bg-primary text-white">
            <Play className="h-4 w-4" />
            创建并运行
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
