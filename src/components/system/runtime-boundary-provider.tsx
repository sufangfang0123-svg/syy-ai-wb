"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isHealthyPayload, runtimeConfig } from "@/config/runtime";

export type BackendStatus = "disabled" | "checking" | "available" | "unavailable";
export type ActiveSpace = "demo" | "real-boundary";

interface RuntimeBoundaryContextValue {
  config: typeof runtimeConfig;
  backendStatus: BackendStatus;
  activeSpace: ActiveSpace;
  lastCheckedAt: string | null;
  checkBackend: () => Promise<void>;
  openDemo: () => void;
  openRealBoundary: () => void;
}

const RuntimeBoundaryContext = createContext<RuntimeBoundaryContextValue | null>(null);

export function RuntimeBoundaryProvider({ children }: { children: ReactNode }) {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>(
    runtimeConfig.realWorkspaceConfigured ? "checking" : "disabled",
  );
  const [activeSpace, setActiveSpace] = useState<ActiveSpace>("demo");
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  const checkBackend = useCallback(async () => {
    if (!runtimeConfig.realWorkspaceConfigured) {
      setBackendStatus("disabled");
      setActiveSpace("demo");
      return;
    }

    setBackendStatus("checking");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3_000);
    try {
      const response = await fetch(runtimeConfig.healthUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });
      const payload: unknown = response.ok ? await response.json() : null;
      const available = response.ok && isHealthyPayload(payload);
      setBackendStatus(available ? "available" : "unavailable");
      if (!available) setActiveSpace("demo");
    } catch {
      setBackendStatus("unavailable");
      setActiveSpace("demo");
    } finally {
      window.clearTimeout(timeout);
      setLastCheckedAt(new Date().toISOString());
    }
  }, []);

  useEffect(() => {
    void checkBackend();
  }, [checkBackend]);

  const openDemo = useCallback(() => setActiveSpace("demo"), []);
  const openRealBoundary = useCallback(() => {
    if (backendStatus === "available") setActiveSpace("real-boundary");
  }, [backendStatus]);

  const value = useMemo(() => ({
    config: runtimeConfig,
    backendStatus,
    activeSpace,
    lastCheckedAt,
    checkBackend,
    openDemo,
    openRealBoundary,
  }), [activeSpace, backendStatus, checkBackend, lastCheckedAt, openDemo, openRealBoundary]);

  return <RuntimeBoundaryContext.Provider value={value}>{children}</RuntimeBoundaryContext.Provider>;
}

export function useRuntimeBoundary() {
  const value = useContext(RuntimeBoundaryContext);
  if (!value) throw new Error("useRuntimeBoundary must be used inside RuntimeBoundaryProvider");
  return value;
}
