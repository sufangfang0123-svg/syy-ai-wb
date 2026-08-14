import type { Metadata } from "next";
import { EvolutionProvider } from "@/components/demo/evolution-provider";
import { DecisionProvider } from "@/components/decision/decision-provider";
import { SiteShell } from "@/components/layout/site-shell";
import { RuntimeBoundaryProvider } from "@/components/system/runtime-boundary-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next-Dollar Gate · 企业试点演示版",
  description: "面向消费新品负责人的投前补证与决策方法演示。",
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
