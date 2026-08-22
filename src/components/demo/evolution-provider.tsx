"use client";

import { demoEvolutionState } from "@/data/demo/evolution-data";
import { EvolutionState } from "@/domain/types";
import { DemoEvolutionRepository } from "@/repositories/demo/demo-evolution-repository";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

interface EvolutionContextValue {
  state: EvolutionState;
  selectedOpportunity: EvolutionState["opportunities"][number];
  selectOpportunity: (id: string) => void;
  resetDemo: () => void;
}

const EvolutionContext = createContext<EvolutionContextValue | null>(null);
const repository = new DemoEvolutionRepository();

export function EvolutionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EvolutionState>(() => structuredClone(demoEvolutionState));
  const hydrated = useRef(false);

  useEffect(() => {
    repository.load().then((saved) => {
      setState(saved);
      hydrated.current = true;
    });
  }, []);

  useEffect(() => {
    if (hydrated.current) void repository.save(state);
  }, [state]);

  const selectOpportunity = useCallback((id: string) => {
    setState((current) => current.opportunities.some((item) => item.id === id)
      ? { ...current, selectedOpportunityId: id }
      : current);
  }, []);

  const resetDemo = useCallback(() => {
    void repository.reset().then((fresh) => {
      setState(fresh);
      hydrated.current = true;
    });
  }, []);

  const selectedOpportunity = state.opportunities.find((item) => item.id === state.selectedOpportunityId) ?? state.opportunities[0];
  const value = useMemo<EvolutionContextValue>(() => ({ state, selectedOpportunity, selectOpportunity, resetDemo }), [state, selectedOpportunity, selectOpportunity, resetDemo]);

  return <EvolutionContext.Provider value={value}>{children}</EvolutionContext.Provider>;
}

export function useEvolution(): EvolutionContextValue {
  const context = useContext(EvolutionContext);
  if (!context) throw new Error("useEvolution must be used within EvolutionProvider");
  return context;
}
