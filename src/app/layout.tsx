import type { Metadata } from "next";
import { EvolutionProvider } from "@/components/demo/evolution-provider";
import { DecisionProvider } from "@/components/decision/decision-provider";
import { SiteShell } from "@/components/layout/site-shell";
import { RuntimeBoundaryProvider } from "@/components/system/runtime-boundary-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evolution Lab · 新品投前决策引擎",
  description: "在支付下一笔不可逆投入前，识别最危险假设并推荐成本最低的下一项验证。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <RuntimeBoundaryProvider><EvolutionProvider><DecisionProvider><SiteShell>{children}</SiteShell></DecisionProvider></EvolutionProvider></RuntimeBoundaryProvider>
      </body>
    </html>
  );
}
