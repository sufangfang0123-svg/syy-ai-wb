"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildExperimentScenarios, demoProductWorkbenchState } from "@/data/demo/product-workbench-data";
import { ExperimentScenario, FeedbackRecord, ProductConceptCandidate, ProductWorkbenchState, ReviewStatus, ScenarioReview, WorkflowStatus } from "@/domain/product-workbench-types";

const STORAGE_KEY = "cotton-product-workbench-demo:v1";

interface ProductWorkbenchContextValue {
  state: ProductWorkbenchState;
  selectedConcept: ProductConceptCandidate;
  scenarios: ExperimentScenario[];
  reviewOpportunity: (id: string, status: WorkflowStatus, note: string) => void;
  selectConcept: (id: string, reason: string) => void;
  updateConcept: (id: string, patch: Partial<ProductConceptCandidate>) => void;
  lockConcept: (id: string) => void;
  reviewScenario: (id: string, status: ScenarioReview["status"], owner: string, note: string) => void;
  updateContent: (id: string, editedText: string) => void;
  reviewContent: (id: string, status: ReviewStatus, note: string) => void;
  addFeedback: (draft: Omit<FeedbackRecord, "id" | "conceptId" | "dataNature">) => void;
  addNextRoundItem: (item: string) => void;
}

const ProductWorkbenchContext = createContext<ProductWorkbenchContextValue | null>(null);

function loadState(): ProductWorkbenchState {
  if (typeof window === "undefined") return structuredClone(demoProductWorkbenchState);
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(demoProductWorkbenchState);
  try {
    const saved = JSON.parse(raw) as Partial<ProductWorkbenchState>;
    return { ...structuredClone(demoProductWorkbenchState), ...saved };
  } catch {
    return structuredClone(demoProductWorkbenchState);
  }
}

export function ProductWorkbenchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProductWorkbenchState>(() => structuredClone(demoProductWorkbenchState));
  const hydrated = useRef(false);
  useEffect(() => { setState(loadState()); hydrated.current = true; }, []);
  useEffect(() => { if (hydrated.current) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  const mutate = useCallback((action: string, object: string, summary: string, updater: (draft: ProductWorkbenchState) => void) => {
    setState((current) => {
      const draft = structuredClone(current);
      updater(draft);
      const now = new Date().toLocaleString("zh-CN", { hour12: false });
      draft.lastSavedAt = now;
      draft.auditEvents.unshift({ id: `WBA-${Date.now()}`, action, object, summary, createdAt: now, source: "模拟产品工作台", isDemo: true });
      draft.auditEvents = draft.auditEvents.slice(0, 80);
      return draft;
    });
  }, []);

  const reviewOpportunity = useCallback((id: string, status: WorkflowStatus, note: string) => mutate("复核机会", id, `${status} · ${note || "未填写补充说明"}`, (draft) => {
    draft.selectedOpportunityId = id;
    draft.opportunityStatus[id] = status;
    draft.opportunityNotes[id] = note;
  }), [mutate]);

  const selectConcept = useCallback((id: string, reason: string) => mutate("选择产品概念", id, reason, (draft) => {
    draft.selectedConceptId = id;
    draft.concepts.forEach((item) => { item.status = item.id === id ? "selected" : item.status === "selected" ? "candidate" : item.status; });
    const selected = draft.concepts.find((item) => item.id === id);
    if (selected) selected.selectionReason = reason;
    draft.contentAssets.forEach((item) => { if (item.conceptId !== id) { item.conceptId = id; item.stale = true; } });
  }), [mutate]);

  const updateConcept = useCallback((id: string, patch: Partial<ProductConceptCandidate>) => mutate("编辑产品概念", id, `人工更新：${Object.keys(patch).join("、")}`, (draft) => {
    const target = draft.concepts.find((item) => item.id === id);
    if (!target) return;
    Object.assign(target, patch, { version: target.version + 1, locked: false, updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }) });
    draft.revision += 1;
    draft.scenarioReviews.forEach((item) => { if (item.conceptId === id) item.stale = true; });
    draft.contentAssets.forEach((item) => { if (item.conceptId === id) item.stale = true; });
  }), [mutate]);

  const lockConcept = useCallback((id: string) => mutate("锁定产品概念", id, "人工确认当前版本进入后续工作流", (draft) => {
    const target = draft.concepts.find((item) => item.id === id);
    if (target) target.locked = true;
  }), [mutate]);

  const scenarios = useMemo<ExperimentScenario[]>(() => buildExperimentScenarios(state.selectedConceptId), [state.selectedConceptId]);

  const reviewScenario = useCallback((id: string, status: ScenarioReview["status"], owner: string, note: string) => mutate("复核数字情景", id, `${status} · ${owner || "待认领"}`, (draft) => {
    const scenario = scenarios.find((item) => item.id === id);
    if (!scenario) return;
    const existing = draft.scenarioReviews.find((item) => item.scenarioId === id);
    const payload = { scenarioId: id, conceptId: scenario.conceptId, assumptionId: scenario.assumptionId, status, owner, note, stale: false, updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }) };
    if (existing) Object.assign(existing, payload); else draft.scenarioReviews.push(payload);
  }), [mutate, scenarios]);

  const updateContent = useCallback((id: string, editedText: string) => mutate("编辑内容版本", id, "保存人工版本并保留固定原始版本", (draft) => {
    const item = draft.contentAssets.find((asset) => asset.id === id);
    if (item) { item.editedText = editedText; item.version += 1; item.reviewStatus = "changes"; }
  }), [mutate]);

  const reviewContent = useCallback((id: string, status: ReviewStatus, note: string) => mutate("审核内容版本", id, `${status} · ${note || "未填写审核意见"}`, (draft) => {
    const item = draft.contentAssets.find((asset) => asset.id === id);
    if (item) { item.reviewStatus = status; item.reviewNote = note; }
  }), [mutate]);

  const addFeedback = useCallback((input: Omit<FeedbackRecord, "id" | "conceptId" | "dataNature">) => mutate("记录转化反馈", input.contentAssetId, `${input.channel} · ${input.theme}`, (draft) => {
    draft.feedbackRecords.unshift({ ...input, id: `WFB-${Date.now()}`, conceptId: draft.selectedConceptId, dataNature: "manual" });
  }), [mutate]);

  const addNextRoundItem = useCallback((item: string) => mutate("创建下一轮待验证事项", state.selectedConceptId, item, (draft) => {
    if (item.trim()) draft.nextRoundItems.unshift(item.trim());
  }), [mutate, state.selectedConceptId]);

  const selectedConcept = state.concepts.find((item) => item.id === state.selectedConceptId) ?? state.concepts[0];
  const value = useMemo(() => ({ state, selectedConcept, scenarios, reviewOpportunity, selectConcept, updateConcept, lockConcept, reviewScenario, updateContent, reviewContent, addFeedback, addNextRoundItem }), [state, selectedConcept, scenarios, reviewOpportunity, selectConcept, updateConcept, lockConcept, reviewScenario, updateContent, reviewContent, addFeedback, addNextRoundItem]);
  return <ProductWorkbenchContext.Provider value={value}>{children}</ProductWorkbenchContext.Provider>;
}

export function useProductWorkbench() {
  const value = useContext(ProductWorkbenchContext);
  if (!value) throw new Error("useProductWorkbench must be used inside ProductWorkbenchProvider");
  return value;
}
