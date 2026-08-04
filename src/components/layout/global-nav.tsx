"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalNavProps {
  onNewTask?: () => void;
  onScanNow?: () => void;
}

const navItems = [
  { href: "/radar", label: "全网雷达", active: true },
  { href: "/insights", label: "信号洞察", active: true },
  { href: "/opportunities", label: "需求机会", active: true },
  { href: "/evolution", label: "产品进化", active: true },
  { href: "/launch", label: "虚拟上市", active: true },
  { href: "/content", label: "内容中枢", active: true },
];

export function GlobalNav({ onNewTask, onScanNow }: GlobalNavProps) {
  const pathname = usePathname();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      {/* Logo + Brand */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Cloud className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold leading-none text-foreground">
              棉生万物
            </span>
            <span className="text-xs leading-none text-muted-foreground mt-0.5">
              AI爆款进化舱
            </span>
          </div>
        </div>

        <div className="hidden md:block h-8 w-px bg-border" />

        {/* Global Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.active ? item.href : "#"}
              className={cn(
                "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "text-primary bg-primary/10"
                  : item.active
                  ? "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  : "text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              {item.label}
              {!item.active && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-muted text-[8px] text-muted-foreground">
                  soon
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {onNewTask && (
          <button
            onClick={onNewTask}
            className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            新建监测任务
          </button>
        )}
        {onScanNow && (
          <button
            onClick={onScanNow}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-600 shadow-sm"
          >
            立即扫描
          </button>
        )}
      </div>
    </header>
  );
}
