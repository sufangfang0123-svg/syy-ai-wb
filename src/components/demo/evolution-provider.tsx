"use client";

import { demoEvolutionState } from "@/data/demo/evolution-data";
import {
  EvolutionState,
  GateDecision,
  GateStatus,
  GenomeCategory,
  MutationInput,
  ProductGenome,
} from "@/domain/types";
import { DemoEvolutionRepository } from "@/repositories/demo/demo-evolution-repository";
import { applyDimensionImpacts, calculateFitness } from "@/services/scoring-service";
import { resolveProductStatus } from "@/services/gate-service";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface EvolutionActions {
  selectOpportunity: (id: string) => void;
  addToValidationPool: (id: string) => void;
  rejectOpportunity: (id: string) => void;
  generateConcept: (id: string) => void;
  toggleGenomeValue: (category: GenomeCategory, valueId: string) => void;
  toggleGenomeLock: (category: GenomeCategory, valueId: string) => void;
  createMutation: (input: MutationInput) => void;
  setGateStatus: (id: GateDecision["id"], status: GateStatus) => void;
  advanceExperiment: () => void;
  setDemoStep: (step: number | null) => void;
  resetDemo: () => void;
}

interface EvolutionContextValue extends EvolutionActions {
  state: EvolutionState;
  currentVersion: EvolutionState["versions"][number];
  selectedOpportunity: EvolutionState["opportunities"][number];
}

const EvolutionContext = createContext<EvolutionContextValue | null>(null);
const repository = new DemoEvolutionRepository();

function cloneGenome(genome: ProductGenome): ProductGenome {
  return {
    G1: genome.G1.map((value) => ({ ...value })),
    G2: genome.G2.map((value) => ({ ...value })),
    G3: genome.G3.map((value) => ({ ...value })),
    G4: genome.G4.map((value) => ({ ...value })),
    G5: genome.G5.map((value) => ({ ...value })),
    G6: genome.G6.map((value) => ({ ...value })),
    G7: genome.G7.map((value) => ({ ...value })),
    G8: genome.G8.map((value) => ({ ...value })),
  };
}

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

  const addAudit = useCallback((draft: EvolutionState, entry: Omit<EvolutionState["auditLogs"][number], "id" | "createdAt">) => {
    draft.auditLogs = [
      {
        ...entry,
        id: `AUD-${Date.now()}`,
        createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      },
      ...draft.auditLogs,
    ].slice(0, 30);
  }, []);

  const selectOpportunity = useCallback((id: string) => {
    setState((current) => ({ ...current, selectedOpportunityId: id }));
  }, []);

  const addToValidationPool = useCallback((id: string) => {
    setState((current) => {
      const next = structuredClone(current);
      const opportunity = next.opportunities.find((item) => item.id === id);
      if (!opportunity) return current;
      const oldValue = opportunity.validationPool ? "已加入" : "未加入";
      opportunity.validationPool = !opportunity.validationPool;
      opportunity.status = opportunity.validationPool ? "validation" : "active";
      addAudit(next, { action: "Validation Pool", object: id, oldValue, newValue: opportunity.validationPool ? "已加入" : "已移出", source: "Human Action", aiGenerated: false });
      return next;
    });
  }, [addAudit]);

  const rejectOpportunity = useCallback((id: string) => {
    setState((current) => {
      const next = structuredClone(current);
      const opportunity = next.opportunities.find((item) => item.id === id);
      if (!opportunity) return current;
      opportunity.status = "rejected";
      addAudit(next, { action: "Opportunity Rejected", object: id, oldValue: "active", newValue: "rejected", source: "Human Decision", aiGenerated: false });
      return next;
    });
  }, [addAudit]);

  const generateConcept = useCallback((id: string) => {
    setState((current) => {
      const next = structuredClone(current);
      const opportunity = next.opportunities.find((item) => item.id === id);
      const source = next.versions.find((item) => item.id === next.currentVersionId);
      if (!opportunity || !source) return current;
      opportunity.status = "concept";
      const newId = `PV-${Date.now()}`;
      next.versions.push({ ...source, id: newId, label: "V0.1", opportunityId: id, name: opportunity.name, parentId: undefined, status: "testing", createdAt: new Date().toISOString().slice(0, 10), mutation: "由机会生成初始物种", genome: cloneGenome(source.genome) });
      addAudit(next, { action: "Concept Generated", object: id, oldValue: "opportunity", newValue: newId, source: "Demo AI Provider", aiGenerated: true });
      return next;
    });
  }, [addAudit]);

  const updateGenome = useCallback((category: GenomeCategory, valueId: string, field: "selected" | "locked") => {
    setState((current) => {
      const next = structuredClone(current);
      const version = next.versions.find((item) => item.id === next.currentVersionId);
      if (!version) return current;
      const value = version.genome[category].find((item) => item.id === valueId);
      if (!value || (field === "selected" && value.locked)) return current;
      const previous = String(value[field]);
      value[field] = !value[field];
      addAudit(next, { action: field === "selected" ? "Genome Selection" : "Genome Lock", object: `${category}/${valueId}`, oldValue: previous, newValue: String(value[field]), source: "Human Action", aiGenerated: false });
      return next;
    });
  }, [addAudit]);

  const toggleGenomeValue = useCallback((category: GenomeCategory, valueId: string) => updateGenome(category, valueId, "selected"), [updateGenome]);
  const toggleGenomeLock = useCallback((category: GenomeCategory, valueId: string) => updateGenome(category, valueId, "locked"), [updateGenome]);

  const createMutation = useCallback((input: MutationInput) => {
    setState((current) => {
      const next = structuredClone(current);
      const source = next.versions.find((item) => item.id === next.currentVersionId);
      if (!source) return current;
      const selectedEvidence = next.evidence.filter((item) => source.fitness.evidenceIds.includes(item.id));
      const dimensions = applyDimensionImpacts(source.fitness.dimensions, input.impacts);
      const fitness = calculateFitness(dimensions, selectedEvidence, source.fitness.evidenceCoverage, source.fitness.riskPenalty, next.gates);
      const labelNumber = Number(source.label.replace("V", ""));
      const label = `V${(labelNumber + 0.1).toFixed(1)}`;
      const id = `PV-${Date.now()}`;
      const genome = cloneGenome(source.genome);
      const target = genome[input.category].find((item) => item.id === input.valueId);
      if (target) target.selected = true;
      source.status = "testing";
      next.versions.push({ ...source, id, label, parentId: source.id, status: resolveProductStatus(next.gates), fitness, mutation: input.label, genome, createdAt: new Date().toISOString().slice(0, 10) });
      next.currentVersionId = id;
      next.experiments.push({ id: `EXP-${Date.now()}`, round: Math.min(100, next.experiments.length + 38), parentVersionId: source.id, experimentType: "genome", variable: input.label, hypothesis: `验证${input.label}对八维适应度的影响`, evidenceLevel: "D", result: "evolve", decision: `生成${label}并进入下一轮验证`, nextVersionId: id, createdAt: new Date().toISOString().slice(0, 10) });
      addAudit(next, { action: "Mutation", object: id, oldValue: source.label, newValue: `${label}：${input.label}`, source: "Synthetic Simulation", aiGenerated: true });
      return next;
    });
  }, [addAudit]);

  const setGateStatus = useCallback((id: GateDecision["id"], status: GateStatus) => {
    setState((current) => {
      const next = structuredClone(current);
      const gate = next.gates.find((item) => item.id === id);
      const version = next.versions.find((item) => item.id === next.currentVersionId);
      if (!gate || !version) return current;
      const oldValue = gate.status;
      gate.status = status;
      version.status = resolveProductStatus(next.gates);
      if (version.status === "eliminated") {
        version.eliminatedBy = `${gate.id} ${gate.name}`;
        version.learning = "Hard Gate 失败，停止继续评分并转入失败谱系";
      }
      addAudit(next, { action: "Gate Decision", object: id, oldValue, newValue: status, source: "Human Approval", aiGenerated: false });
      return next;
    });
  }, [addAudit]);

  const advanceExperiment = useCallback(() => {
    setState((current) => {
      const next = structuredClone(current);
      const previousRound = next.experiments.at(-1)?.round ?? 37;
      const round = Math.min(100, previousRound + 1);
      const stage = round <= 50 ? "genome" : round <= 75 ? "content" : round <= 90 ? "business" : "reality";
      next.experiments.push({ id: `EXP-${Date.now()}`, round, parentVersionId: next.currentVersionId, experimentType: stage, variable: stage, hypothesis: "按实验协议推进结构化验证", evidenceLevel: stage === "reality" ? "B" : "D", result: "pending", decision: "等待本轮证据", createdAt: new Date().toISOString().slice(0, 10) });
      addAudit(next, { action: "Experiment Advanced", object: `Round ${round}`, oldValue: String(previousRound), newValue: String(round), source: stage === "reality" ? "Human Research" : "Synthetic Simulation", aiGenerated: stage !== "reality" });
      return next;
    });
  }, [addAudit]);

  const setDemoStep = useCallback((step: number | null) => setState((current) => ({ ...current, demoStep: step })), []);

  const resetDemo = useCallback(() => {
    void repository.reset().then((fresh) => {
      setState(fresh);
      hydrated.current = true;
    });
  }, []);

  const currentVersion = state.versions.find((item) => item.id === state.currentVersionId) ?? state.versions.at(-1)!;
  const selectedOpportunity = state.opportunities.find((item) => item.id === state.selectedOpportunityId) ?? state.opportunities[0];

  const value = useMemo<EvolutionContextValue>(() => ({
    state,
    currentVersion,
    selectedOpportunity,
    selectOpportunity,
    addToValidationPool,
    rejectOpportunity,
    generateConcept,
    toggleGenomeValue,
    toggleGenomeLock,
    createMutation,
    setGateStatus,
    advanceExperiment,
    setDemoStep,
    resetDemo,
  }), [state, currentVersion, selectedOpportunity, selectOpportunity, addToValidationPool, rejectOpportunity, generateConcept, toggleGenomeValue, toggleGenomeLock, createMutation, setGateStatus, advanceExperiment, setDemoStep, resetDemo]);

  return <EvolutionContext.Provider value={value}>{children}</EvolutionContext.Provider>;
}

export function useEvolution(): EvolutionContextValue {
  const context = useContext(EvolutionContext);
  if (!context) throw new Error("useEvolution must be used within EvolutionProvider");
  return context;
}
