import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "棉生万物 · AI爆款进化舱",
  description: "AI消费者反馈洞察工作台 - 将消费者反馈转化为结构化需求洞察和产品机会",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
