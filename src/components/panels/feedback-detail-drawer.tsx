"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Heart, MessageCircle, ExternalLink, Calendar } from "lucide-react";
import { FeedbackItem } from "@/types";
import { platformMeta, sentimentMeta, dataTypeMeta } from "@/lib/utils";

interface FeedbackDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FeedbackItem | null;
}

export function FeedbackDetailDrawer({ open, onOpenChange, item }: FeedbackDetailDrawerProps) {
  if (!item) return null;

  const pm = platformMeta[item.platform];
  const sm = sentimentMeta[item.sentiment];
  const dtm = dataTypeMeta[item.data_type];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-flex items-center rounded-lg px-2.5 py-1 text-sm font-medium"
              style={{ backgroundColor: pm.bg, color: pm.color }}
            >
              {pm.label}
            </span>
            <span className="text-sm text-muted-foreground">{item.product_name}</span>
          </div>
          <SheetTitle className="text-lg font-bold">反馈详情</SheetTitle>
          <SheetDescription className="sr-only">查看反馈详细信息</SheetDescription>
        </SheetHeader>

        {/* Raw text */}
        <div className="mb-5">
          <div className="rounded-xl border border-border bg-secondary/50 p-4">
            <p className="text-sm text-foreground leading-relaxed">{item.raw_text}</p>
          </div>
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { icon: <Heart className="h-4 w-4" />, label: "点赞数", value: item.likes },
            { icon: <MessageCircle className="h-4 w-4" />, label: "评论数", value: item.reply_count },
            { icon: <Calendar className="h-4 w-4" />, label: "发布时间", value: item.publish_date },
            { icon: <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: dtm.color }} />, label: "数据类型", value: dtm.label },
          ].map((m, i) => (
            <div key={i} className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-muted-foreground">{m.icon}</span>
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{m.value}</span>
            </div>
          ))}
        </div>

        <Separator className="mb-5 bg-border" />

        {/* Tags sections */}
        <div className="mb-4">
          <span className="text-xs font-medium text-muted-foreground mb-2 block">品类</span>
          <Badge variant="outline" className="text-sm h-7 px-3">{item.category}</Badge>
        </div>

        <div className="mb-4">
          <span className="text-xs font-medium text-muted-foreground mb-2 block">情绪标签</span>
          <Badge variant="outline" className="text-sm h-7 px-3">{sm.label}</Badge>
        </div>

        <div className="mb-4">
          <span className="text-xs font-medium text-muted-foreground mb-2 block">使用场景</span>
          <div className="flex flex-wrap gap-1.5">
            {item.scenarios.map((s) => (
              <Badge key={s} variant="secondary" className="text-sm h-7 px-3">{s}</Badge>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <span className="text-xs font-medium text-muted-foreground mb-2 block">AI提取痛点</span>
          <div className="flex flex-wrap gap-1.5">
            {item.pain_points.map((p) => (
              <Badge key={p} variant="outline" className="text-sm h-7 px-3 border-destructive/30 text-destructive">{p}</Badge>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <span className="text-xs font-medium text-muted-foreground mb-2 block">期望体验</span>
          <p className="text-sm text-foreground bg-secondary/50 rounded-xl p-3">{item.expected_experience}</p>
        </div>

        {/* Confidence */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">AI置信度</span>
            <span className="text-sm font-bold text-foreground">{item.confidence}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${item.confidence}%` }} />
          </div>
        </div>

        {/* Source link */}
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          查看原帖
        </a>
      </SheetContent>
    </Sheet>
  );
}
