"use client";

import { useEffect } from "react";

export default function HomeRedirect() {
  useEffect(() => {
    // Client-side redirect for SPA navigation
    if (typeof window !== "undefined") {
      const base = window.location.pathname.replace(/\/[^\/]*$/, "/");
      window.location.href = base + "radar.html";
    }
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">正在进入全网消费信号雷达...</p>
      </div>
    </div>
  );
}
