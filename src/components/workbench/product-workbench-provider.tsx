"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildExperimentScenarios, demoProductWorkbenchState } from "@/data/demo/product-workbench-data";
import { ExperimentScenario, FeedbackRecord as DemoFeedbackRecord, ProductConceptCandidate, ProductWorkbenchState, ReviewStatus, ScenarioReview, WorkflowStatus } from "@/domain/product-workbench-types";
import { runtimeConfig } from "@/config/runtime";
import { CategoryPack, LocalWorkbenchBundle, localWorkbenchAdapter } from "@/lib/local-workbench-adapter";
import { loadPublicFixtureState, resetPublicFixtureState, savePublicFixtureState } from "@/lib/public-workbench-adapter";
import { Project } from "@/lib/real-api";

export type WorkbenchMode = "public_fixture" | "local_api";
type MutationResult = Record<string, unknown> | unknown[] | void;

interface ProductWorkbenchContextValue {
  mode: WorkbenchMode;
  state: ProductWorkbenchState;
  selectedConcept: ProductConceptCandidate;
  scenarios: ExperimentScenario[];
  localProjects: Project[];
  localCategoryPacks: CategoryPack[];
  localBundle: LocalWorkbenchBundle | null;
  localLoading: boolean;
  localError: string;
  refreshLocal: () => Promise<void>;
  selectLocalProject: (projectId:string) => Promise<void>;
  createLocalProject: (payload:Record<string,unknown>) => Promise<Project>;
  mutateLocal: <T=MutationResult>(path:string,method:"POST"|"PATCH",payload?:unknown)=>Promise<T>;
  uploadLocal: <T=MutationResult>(path:string,body:FormData)=>Promise<T>;
  reviewOpportunity: (id: string, status: WorkflowStatus, note: string) => void;
  selectConcept: (id: string, reason: string) => void;
  updateConcept: (id: string, patch: Partial<ProductConceptCandidate>) => void;
  lockConcept: (id: string) => void;
  reviewScenario: (id: string, status: ScenarioReview["status"], owner: string, note: string) => void;
  updateContent: (id: string, editedText: string) => void;
  reviewContent: (id: string, status: ReviewStatus, note: string) => void;
  addFeedback: (draft: Omit<DemoFeedbackRecord, "id" | "conceptId" | "dataNature">) => void;
  addNextRoundItem: (item: string) => void;
  resetPublicFixture: () => void;
}

const ProductWorkbenchContext = createContext<ProductWorkbenchContextValue | null>(null);
const emptyState: ProductWorkbenchState = {selectedOpportunityId:"",opportunityStatus:{},opportunityNotes:{},concepts:[],selectedConceptId:"",scenarioReviews:[],contentAssets:[],feedbackRecords:[],nextRoundItems:[],revision:0,lastSavedAt:"",auditEvents:[]};
const emptyConcept: ProductConceptCandidate = {id:"",opportunityId:"",name:"未创建真实产品概念",targetUser:"",scenario:"",need:"",genes:[],functions:"",material:"",specification:"",packaging:"",priceBand:"",sellingPoint:"",evidenceIds:[],assumptionIds:[],supplyRisk:"",complianceRisk:"",uniqueVariable:"",source:"manual_import",version:0,originalSnapshot:"",status:"candidate",locked:false,stale:false,selectionReason:"",updatedAt:""};

export function ProductWorkbenchProvider({ children }: { children: ReactNode }) {
  const mode: WorkbenchMode = runtimeConfig.isLocalIntegrated ? "local_api" : "public_fixture";
  const [state, setState] = useState<ProductWorkbenchState>(() => mode === "public_fixture" ? structuredClone(demoProductWorkbenchState) : structuredClone(emptyState));
  const hydrated = useRef(false);
  const [localProjects,setLocalProjects] = useState<Project[]>([]);
  const [localCategoryPacks,setLocalCategoryPacks] = useState<CategoryPack[]>([]);
  const [localBundle,setLocalBundle] = useState<LocalWorkbenchBundle|null>(null);
  const [localLoading,setLocalLoading] = useState(mode === "local_api");
  const [localError,setLocalError] = useState("");

  const loadLocal = useCallback(async (preferredProjectId?:string) => {
    if (mode !== "local_api") return;
    setLocalLoading(true); setLocalError("");
    try {
      const [projects,packs] = await Promise.all([localWorkbenchAdapter.listProjects(),localWorkbenchAdapter.listCategoryPacks()]);
      setLocalProjects(projects); setLocalCategoryPacks(packs);
      const target = projects.find((item)=>item.id===preferredProjectId) ?? projects[0] ?? null;
      setLocalBundle(target ? await localWorkbenchAdapter.load(target.id) : null);
    } catch (error) {
      setLocalBundle(null);
      setLocalError(error instanceof Error ? error.message : "本地后端不可用；未回退到浏览器模拟状态。");
    } finally { setLocalLoading(false); }
  },[mode]);

  useEffect(() => {
    if (mode === "public_fixture") { setState(loadPublicFixtureState(window.localStorage)); hydrated.current = true; return; }
    void loadLocal();
  },[loadLocal,mode]);
  useEffect(() => { if (mode === "public_fixture" && hydrated.current) savePublicFixtureState(window.localStorage,state); },[mode,state]);

  const mutate = useCallback((action:string,object:string,summary:string,updater:(draft:ProductWorkbenchState)=>void) => {
    if (mode !== "public_fixture") return;
    setState((current)=>{const draft=structuredClone(current);updater(draft);const now=new Date().toLocaleString("zh-CN",{hour12:false});draft.lastSavedAt=now;draft.auditEvents.unshift({id:`WBA-${Date.now()}`,action,object,summary,createdAt:now,source:"模拟产品工作台",isDemo:true});draft.auditEvents=draft.auditEvents.slice(0,80);return draft;});
  },[mode]);

  const reviewOpportunity=useCallback((id:string,status:WorkflowStatus,note:string)=>{const reason=note.trim();if(!reason)return;mutate("复核机会",id,`${status} · ${reason}`,(draft)=>{draft.selectedOpportunityId=id;draft.opportunityStatus[id]=status;draft.opportunityNotes[id]=reason;draft.revision+=1;});},[mutate]);
  const selectConcept=useCallback((id:string,reason:string)=>{const selectionReason=reason.trim();if(!selectionReason)return;mutate("选择产品概念",id,selectionReason,(draft)=>{draft.selectedConceptId=id;draft.concepts.forEach((item)=>{item.status=item.id===id?"selected":item.status==="selected"?"candidate":item.status;});const selected=draft.concepts.find((item)=>item.id===id);if(selected)selected.selectionReason=selectionReason;draft.contentAssets.forEach((item)=>{if(item.conceptId!==id){item.conceptId=id;item.stale=true;}});});},[mutate]);
  const updateConcept=useCallback((id:string,patch:Partial<ProductConceptCandidate>)=>mutate("编辑产品概念",id,`人工更新：${Object.keys(patch).join("、")}`,(draft)=>{const target=draft.concepts.find((item)=>item.id===id);if(!target)return;Object.assign(target,patch,{version:target.version+1,locked:false,updatedAt:new Date().toLocaleString("zh-CN",{hour12:false})});draft.revision+=1;draft.scenarioReviews.forEach((item)=>{if(item.conceptId===id)item.stale=true;});draft.contentAssets.forEach((item)=>{if(item.conceptId===id)item.stale=true;});}),[mutate]);
  const lockConcept=useCallback((id:string)=>mutate("锁定产品概念",id,"人工确认当前版本进入后续工作流",(draft)=>{const target=draft.concepts.find((item)=>item.id===id);if(target)target.locked=true;}),[mutate]);
  const scenarios=useMemo(()=>mode==="public_fixture"?buildExperimentScenarios(state.selectedConceptId):[],[mode,state.selectedConceptId]);
  const reviewScenario=useCallback((id:string,status:ScenarioReview["status"],owner:string,note:string)=>{const scenario=scenarios.find((item)=>item.id===id);const actor=owner.trim(),reason=note.trim();if(!scenario||!actor||!reason)return;const evidenceIds=state.concepts.find((item)=>item.id===scenario.conceptId)?.evidenceIds??[];const existing=state.scenarioReviews.find((item)=>item.scenarioId===id);if(!evidenceIds.length||(status==="validation"&&existing?.status!=="shortlisted"))return;mutate("复核数字情景",id,`${status} · ${actor} · ${reason} · Evidence ${evidenceIds.join("/")}`,(draft)=>{const saved=draft.scenarioReviews.find((item)=>item.scenarioId===id);const payload={scenarioId:id,conceptId:scenario.conceptId,assumptionId:scenario.assumptionId,status,owner:actor,note:reason,evidenceIds,stale:false,updatedAt:new Date().toLocaleString("zh-CN",{hour12:false})};if(saved)Object.assign(saved,payload);else draft.scenarioReviews.push(payload);});},[mutate,scenarios,state.concepts,state.scenarioReviews]);
  const updateContent=useCallback((id:string,editedText:string)=>mutate("编辑内容版本",id,"保存人工版本并保留固定原始版本",(draft)=>{const item=draft.contentAssets.find((asset)=>asset.id===id);if(item){item.editedText=editedText;item.version+=1;item.reviewStatus="changes";}}),[mutate]);
  const reviewContent=useCallback((id:string,status:ReviewStatus,note:string)=>{const reason=note.trim();if(!reason)return;mutate("审核内容版本",id,`${status} · ${reason}`,(draft)=>{const item=draft.contentAssets.find((asset)=>asset.id===id);if(item){item.reviewStatus=status;item.reviewNote=reason;}});},[mutate]);
  const addFeedback=useCallback((input:Omit<DemoFeedbackRecord,"id"|"conceptId"|"dataNature">)=>mutate("记录转化反馈",input.contentAssetId,`${input.channel} · ${input.theme}`,(draft)=>{draft.feedbackRecords.unshift({...input,id:`WFB-${Date.now()}`,conceptId:draft.selectedConceptId,dataNature:"manual"});}),[mutate]);
  const addNextRoundItem=useCallback((item:string)=>mutate("创建下一轮待验证事项",state.selectedConceptId,item,(draft)=>{if(item.trim())draft.nextRoundItems.unshift(item.trim());}),[mutate,state.selectedConceptId]);
  const resetPublicFixture=useCallback(()=>{if(mode!=="public_fixture")return;resetPublicFixtureState(window.localStorage);setState(structuredClone(demoProductWorkbenchState));},[mode]);

  const refreshLocal=useCallback(()=>loadLocal(localBundle?.project.id),[loadLocal,localBundle?.project.id]);
  const selectLocalProject=useCallback((projectId:string)=>loadLocal(projectId),[loadLocal]);
  const createLocalProject=useCallback(async(payload:Record<string,unknown>)=>{const created=await localWorkbenchAdapter.createProject(payload);await loadLocal(created.id);return created;},[loadLocal]);
  const mutateLocal=useCallback(async<T,>(path:string,method:"POST"|"PATCH",payload?:unknown)=>{if(mode!=="local_api")throw new Error("公开构建禁止调用真实工作台API");const result=await localWorkbenchAdapter.mutate<T>(path,method,payload);await loadLocal(localBundle?.project.id);return result;},[loadLocal,localBundle?.project.id,mode]);
  const uploadLocal=useCallback(async<T,>(path:string,body:FormData)=>{if(mode!=="local_api")throw new Error("公开构建禁止上传真实工作台数据");const result=await localWorkbenchAdapter.upload<T>(path,body);await loadLocal(localBundle?.project.id);return result;},[loadLocal,localBundle?.project.id,mode]);
  const selectedConcept=mode==="public_fixture"?(state.concepts.find((item)=>item.id===state.selectedConceptId)??state.concepts[0]??emptyConcept):emptyConcept;
  const value=useMemo<ProductWorkbenchContextValue>(()=>({mode,state,selectedConcept,scenarios,localProjects,localCategoryPacks,localBundle,localLoading,localError,refreshLocal,selectLocalProject,createLocalProject,mutateLocal,uploadLocal,reviewOpportunity,selectConcept,updateConcept,lockConcept,reviewScenario,updateContent,reviewContent,addFeedback,addNextRoundItem,resetPublicFixture}),[mode,state,selectedConcept,scenarios,localProjects,localCategoryPacks,localBundle,localLoading,localError,refreshLocal,selectLocalProject,createLocalProject,mutateLocal,uploadLocal,reviewOpportunity,selectConcept,updateConcept,lockConcept,reviewScenario,updateContent,reviewContent,addFeedback,addNextRoundItem,resetPublicFixture]);
  return <ProductWorkbenchContext.Provider value={value}>{children}</ProductWorkbenchContext.Provider>;
}

export function useProductWorkbench(){const value=useContext(ProductWorkbenchContext);if(!value)throw new Error("useProductWorkbench must be used inside ProductWorkbenchProvider");return value;}
