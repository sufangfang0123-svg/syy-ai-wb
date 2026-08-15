"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { demoDecisionState } from "@/data/demo/decision-data";
import { DecisionAuditLog, DecisionEngineState, DecisionEvidence, DecisionProject, DecisionRecommendation, ProductTier, ResultFeedback } from "@/domain/decision-types";

const DEMO_STORAGE = "evolution-lab:decision-demo:v1";

interface DecisionContextValue {
  state: DecisionEngineState;
  isHydrated: boolean;
  setTier: (tier: ProductTier) => void;
  updateProject: (patch: Partial<DecisionProject>) => void;
  addEvidence: (draft: Pick<DecisionEvidence, "title" | "source" | "sourceUrl" | "level" | "finding" | "scope" | "limitation">) => void;
  addResult: (draft: Pick<ResultFeedback, "type" | "summary" | "outcome" | "source">) => void;
  confirmDecision: (decision: DecisionRecommendation, note: string) => void;
  setOnboardingStep: (step: number | null) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  clearDemoData: () => void;
}

const DecisionContext = createContext<DecisionContextValue | null>(null);

function loadState(): DecisionEngineState {
  const fallback = demoDecisionState;
  if (typeof window === "undefined") return structuredClone(fallback);
  const raw = window.localStorage.getItem(DEMO_STORAGE);
  if (!raw) return structuredClone(fallback);
  try {
    const parsed = JSON.parse(raw) as DecisionEngineState & { tests?: Array<DecisionEngineState["tests"][number] & { status: string }> };
    return {
      ...structuredClone(fallback),
      ...parsed,
      tests: (parsed.tests ?? fallback.tests).map((test) => ({ ...test, status: test.status === "running" || test.status === "completed" ? test.status : "proposed" })),
      decision: { ...structuredClone(fallback.decision), ...parsed.decision },
      auditLogs: parsed.auditLogs ?? structuredClone(fallback.auditLogs),
    } as DecisionEngineState;
  } catch { return structuredClone(fallback); }
}

export function DecisionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DecisionEngineState>(() => structuredClone(demoDecisionState));
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setIsHydrated(true);
  }, []);
  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(DEMO_STORAGE, JSON.stringify({ ...state, mode: "demo" }));
  }, [isHydrated, state]);

  const addAudit = useCallback((current: DecisionEngineState, entry: Omit<DecisionAuditLog, "id" | "createdAt" | "source" | "isDemo">) => ({
    ...current,
    auditLogs: [{ ...entry, id: `DEMO-AUD-${Date.now()}`, createdAt: new Date().toISOString(), source: "模拟决策流程" as const, isDemo: true as const }, ...current.auditLogs].slice(0, 50),
  }), []);
  const setTier = useCallback((tier: ProductTier) => setState((current) => ({ ...current, tier })), []);
  const updateProject = useCallback((patch: Partial<DecisionProject>) => setState((current) => {
    const changed = Object.entries(patch).filter(([key, value]) => current.project[key as keyof DecisionProject] !== value);
    if (!changed.length) return current;
    const next = addAudit(current, { action: "修改模拟项目", object: current.project.id, summary: `更新字段：${changed.map(([key]) => key).join("、")}` });
    return { ...next, project: { ...current.project, ...patch } };
  }), [addAudit]);
  const addEvidence = useCallback((draft: Pick<DecisionEvidence, "title" | "source" | "sourceUrl" | "level" | "finding" | "scope" | "limitation">) => setState((current) => {
    const id = `DEMO-${Date.now()}`;
    const next = addAudit(current, { action: "新增模拟Evidence", object: id, summary: `${draft.title}；当前尚未关联任何假设` });
    return { ...next, evidence: [...current.evidence, { ...draft, sourceUrl: draft.sourceUrl || undefined, id, observedAt: new Date().toISOString().slice(0, 10), sample: "模拟录入", projectId: current.project.id, isDemo: true }] };
  }), [addAudit]);
  const addResult = useCallback((draft: Pick<ResultFeedback, "type" | "summary" | "outcome" | "source">) => setState((current) => {
    const id = `DEMO-RES-${Date.now()}`;
    const next = addAudit(current, { action: "新增模拟结果回流", object: id, summary: `${draft.type} · ${draft.outcome} · ${draft.summary}` });
    return { ...next, results: [...current.results, { ...draft, id, projectId: current.project.id, recordedAt: new Date().toISOString().slice(0, 10), ruleChange: draft.outcome === "conflicts" ? "模拟进入人工复核，重新评估假设与阈值。" : "模拟记录不修改真实规则。", isDemo: true }] };
  }), [addAudit]);
  const confirmDecision = useCallback((humanDecision: DecisionRecommendation, humanNote: string) => setState((current) => {
    const next = addAudit(current, { action: "确认模拟人工决定", object: current.decision.id, summary: `${humanDecision} · ${humanNote}` });
    return { ...next, decision: { ...current.decision, humanDecision, humanNote, humanDecidedAt: new Date().toISOString() } };
  }), [addAudit]);
  const setOnboardingStep = useCallback((onboardingStep: number | null) => setState((current) => {
    const next = { ...current, onboardingStep };
    window.localStorage.setItem(DEMO_STORAGE, JSON.stringify(next));
    return next;
  }), []);
  const completeOnboarding = useCallback(() => setState((current) => {
    const next = { ...current, onboardingStep: null, onboardingCompleted: true };
    window.localStorage.setItem(DEMO_STORAGE, JSON.stringify(next));
    return next;
  }), []);
  const resetOnboarding = useCallback(() => setState((current) => {
    const next = { ...current, onboardingStep: 0, onboardingCompleted: false };
    window.localStorage.setItem(DEMO_STORAGE, JSON.stringify(next));
    return next;
  }), []);
  const clearDemoData = useCallback(() => {
    window.localStorage.removeItem(DEMO_STORAGE);
    setState(structuredClone(demoDecisionState));
  }, []);

  const value = useMemo(() => ({ state, isHydrated, setTier, updateProject, addEvidence, addResult, confirmDecision, setOnboardingStep, completeOnboarding, resetOnboarding, clearDemoData }), [state, isHydrated, setTier, updateProject, addEvidence, addResult, confirmDecision, setOnboardingStep, completeOnboarding, resetOnboarding, clearDemoData]);
  return <DecisionContext.Provider value={value}>{children}</DecisionContext.Provider>;
}

export function useDecision() {
  const value = useContext(DecisionContext);
  if (!value) throw new Error("useDecision must be used inside DecisionProvider");
  return value;
}
