"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RawSignal } from "@/types";
import { sentimentMeta } from "@/lib/utils";
import { Zap, BarChart3 } from "lucide-react";

interface RawSignalsStreamProps {
  signals: RawSignal[];
  onViewEvidence?: (signal: RawSignal) => void;
}

export function RawSignalsStream({ signals, onViewEvidence }: RawSignalsStreamProps) {
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="rounded-xl border border-border bg-card flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">实时消费信号流</h3>
        </div>
        <Badge variant="secondary" className="text-xs h-6">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse mr-1.5" />
          自动采集中
        </Badge>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {signals.map((signal) => {
            const sentiment = sentimentMeta[signal.sentiment] || sentimentMeta.neutral;
            return (
              <div
                key={signal.signal_id}
                className="rounded-lg border border-border p-3 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-primary">{formatTime(signal.collected_at)}</span>
                  <span className="text-xs text-muted-foreground">{signal.platform}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px]`} style={{ backgroundColor: sentiment.bg, color: sentiment.color }}>
                    <span className={`h-1.5 w-1.5 rounded-full ${sentiment.dot}`} />
                    {sentiment.label}
                  </span>
                  {signal.is_clustered && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto">
                      <BarChart3 className="h-2.5 w-2.5 mr-0.5" />
                      已聚类
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-foreground mb-2 line-clamp-2">{signal.content}</p>
                <div className="flex items-center gap-3 mb-2">
                  {signal.product_category && (
                    <span className="text-xs text-muted-foreground">品类: {signal.product_category}</span>
                  )}
                  {signal.scenario && (
                    <span className="text-xs text-muted-foreground">场景: {signal.scenario}</span>
                  )}
                  {signal.pain_point && (
                    <span className="text-xs text-muted-foreground">痛点: {signal.pain_point}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    置信度 {(signal.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    互动: {signal.engagement.likes}赞 / {signal.engagement.replies}评
                  </span>
                  {signal.source_url && (
                    <>
                      <span className="text-xs text-muted-foreground">·</span>
                      <a
                        href={signal.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        原始链接
                      </a>
                    </>
                  )}
                  {onViewEvidence && (
                    <button
                      onClick={() => onViewEvidence(signal)}
                      className="text-xs text-primary hover:underline ml-auto"
                    >
                      查看证据
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
