import type { Metadata } from "next";
import { EvolutionProvider } from "@/components/demo/evolution-provider";
import { DecisionProvider } from "@/components/decision/decision-provider";
import { SiteShell } from "@/components/layout/site-shell";
import { RuntimeBoundaryProvider } from "@/components/system/runtime-boundary-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evolution Lab · Next-Dollar Gate v0.4.0",
  description: "Evidence Copilot把授权材料转为待人工复核的候选证据；Gate仍由确定性规则计算。公开站仅为模拟展示。",
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
