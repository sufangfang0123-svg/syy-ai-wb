import type { Metadata } from "next";
import { EvolutionProvider } from "@/components/demo/evolution-provider";
import { SiteShell } from "@/components/layout/site-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "棉生万物 · AI爆款进化舱",
  description: "以证据、实验、淘汰和真人校准驱动的产品概念数字进化系统",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <EvolutionProvider>
          <SiteShell>{children}</SiteShell>
        </EvolutionProvider>
      </body>
    </html>
  );
}
