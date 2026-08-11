"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { demoDecisionState, emptyDecisionState } from "@/data/demo/decision-data";
import { DecisionEngineState, DecisionEvidence, DecisionProject, DecisionRecommendation, ProductTier, ResultFeedback, WorkspaceMode } from "@/domain/decision-types";

const STORAGE = { demo: "evolution-lab:decision-demo:v1", real: "evolution-lab:decision-real:v1" } as const;
const ACTIVE_MODE = "evolution-lab:decision-active-mode:v1";

interface DecisionContextValue {
  state: DecisionEngineState;
  isHydrated: boolean;
  setMode: (mode: WorkspaceMode) => void;
  setTier: (tier: ProductTier) => void;
  updateProject: (patch: Partial<DecisionProject>) => void;
  addEvidence: (draft: Pick<DecisionEvidence, "title" | "source" | "level" | "finding" | "scope" | "limitation">) => void;
  addResult: (draft: Pick<ResultFeedback, "type" | "summary" | "outcome" | "source">) => void;
  confirmDecision: (decision: DecisionRecommendation, note: string) => void;
  setOnboardingStep: (step: number | null) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  clearDemoData: () => void;
}

const DecisionContext = createContext<DecisionContextValue | null>(null);

function loadState(mode: WorkspaceMode): DecisionEngineState {
  const fallback = mode === "demo" ? demoDecisionState : emptyDecisionState;
  if (typeof window === "undefined") return structuredClone(fallback);
  const raw = window.localStorage.getItem(STORAGE[mode]);
  if (!raw) return structuredClone(fallback);
  try {
    const parsed = JSON.parse(raw) as DecisionEngineState & { tests?: Array<DecisionEngineState["tests"][number] & { status: string }> };
    return {
      ...structuredClone(fallback),
      ...parsed,
      tests: (parsed.tests ?? fallback.tests).map((test) => ({ ...test, status: test.status === "running" || test.status === "completed" ? test.status : "proposed" })),
      decision: { ...structuredClone(fallback.decision), ...parsed.decision },
    } as DecisionEngineState;
  } catch { return structuredClone(fallback); }
}

function loadActiveMode(): WorkspaceMode {
  if (typeof window === "undefined") return "demo";
  return window.localStorage.getItem(ACTIVE_MODE) === "real" ? "real" : "demo";
}

export function DecisionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DecisionEngineState>(() => structuredClone(demoDecisionState));
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setState(loadState(loadActiveMode()));
    setIsHydrated(true);
  }, []);
  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(STORAGE[state.mode], JSON.stringify(state));
  }, [isHydrated, state]);

  const setMode = useCallback((mode: WorkspaceMode) => {
    window.localStorage.setItem(ACTIVE_MODE, mode);
    setState(loadState(mode));
  }, []);
  const setTier = useCallback((tier: ProductTier) => setState((current) => ({ ...current, tier })), []);
  const updateProject = useCallback((patch: Partial<DecisionProject>) => setState((current) => ({ ...current, project: { ...current.project, ...patch } })), []);
  const addEvidence = useCallback((draft: Pick<DecisionEvidence, "title" | "source" | "level" | "finding" | "scope" | "limitation">) => setState((current) => ({
    ...current,
    evidence: [...current.evidence, { ...draft, id: `${current.mode === "demo" ? "DEMO" : "EV"}-${Date.now()}`, observedAt: new Date().toISOString().slice(0, 10), sample: "用户录入", projectId: current.project.id, isDemo: current.mode === "demo" }],
  })), []);
  const addResult = useCallback((draft: Pick<ResultFeedback, "type" | "summary" | "outcome" | "source">) => setState((current) => ({
    ...current,
    results: [...current.results, { ...draft, id: `RES-${Date.now()}`, projectId: current.project.id, recordedAt: new Date().toISOString().slice(0, 10), ruleChange: draft.outcome === "conflicts" ? "进入人工复核，重新评估假设与阈值。" : "暂无自动规则修改，等待责任人确认。", isDemo: current.mode === "demo" }],
  })), []);
  const confirmDecision = useCallback((humanDecision: DecisionRecommendation, humanNote: string) => setState((current) => ({
    ...current,
    decision: { ...current.decision, humanDecision, humanNote, humanDecidedAt: new Date().toISOString() },
  })), []);
  const setOnboardingStep = useCallback((onboardingStep: number | null) => setState((current) => {
    const next = { ...current, onboardingStep };
    window.localStorage.setItem(STORAGE[next.mode], JSON.stringify(next));
    return next;
  }), []);
  const completeOnboarding = useCallback(() => setState((current) => {
    const next = { ...current, onboardingStep: null, onboardingCompleted: true };
    window.localStorage.setItem(STORAGE[next.mode], JSON.stringify(next));
    return next;
  }), []);
  const resetOnboarding = useCallback(() => setState((current) => {
    const next = { ...current, onboardingStep: 0, onboardingCompleted: false };
    window.localStorage.setItem(STORAGE[next.mode], JSON.stringify(next));
    return next;
  }), []);
  const clearDemoData = useCallback(() => {
    window.localStorage.removeItem(STORAGE.demo);
    setState(structuredClone(demoDecisionState));
  }, []);

  const value = useMemo(() => ({ state, isHydrated, setMode, setTier, updateProject, addEvidence, addResult, confirmDecision, setOnboardingStep, completeOnboarding, resetOnboarding, clearDemoData }), [state, isHydrated, setMode, setTier, updateProject, addEvidence, addResult, confirmDecision, setOnboardingStep, completeOnboarding, resetOnboarding, clearDemoData]);
  return <DecisionContext.Provider value={value}>{children}</DecisionContext.Provider>;
}

export function useDecision() {
  const value = useContext(DecisionContext);
  if (!value) throw new Error("useDecision must be used inside DecisionProvider");
  return value;
}
