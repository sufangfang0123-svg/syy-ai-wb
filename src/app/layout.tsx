import type { Metadata } from "next";
import { EvolutionProvider } from "@/components/demo/evolution-provider";
import { DecisionProvider } from "@/components/decision/decision-provider";
import { SiteShell } from "@/components/layout/site-shell";
import { RuntimeBoundaryProvider } from "@/components/system/runtime-boundary-provider";
import { ProductWorkbenchProvider } from "@/components/workbench/product-workbench-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evolution Lab · Next-Dollar Gate v0.3.1",
  description: "新品投前决策与证据验证工作台；公开模拟展示与单企业本地封闭试点说明。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <RuntimeBoundaryProvider><EvolutionProvider><DecisionProvider><ProductWorkbenchProvider><SiteShell>{children}</SiteShell></ProductWorkbenchProvider></DecisionProvider></EvolutionProvider></RuntimeBoundaryProvider>
      </body>
    </html>
  );
}
