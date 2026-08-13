import { runtimeConfig } from "../config/runtime";

export type Project = { id:string; name:string; description:string; product_category:string; target_user:string; decision_question:string; status:"active"|"archived"; revision:number; created_at:string; updated_at:string };
export type Evidence = { id:string; project_id:string; source_type:"manual"|"url"; title:string; source_url:string|null; publisher:string; published_at:string|null; retrieved_at:string|null; raw_text:string; summary:string; content_hash:string; status:"draft"|"confirmed"; created_at:string; updated_at:string };
export type Assumption = { id:string; project_id:string; statement:string; criticality:number; created_at:string; updated_at:string };
export type EvidenceLink = { id:string; evidence_id:string; assumption_id:string; direction:"support"|"contradict"; strength:number; created_at:string };
export type ValidationTest = { id:string; project_id:string; assumption_id:string; name:string; method:string; estimated_cost:number; estimated_days:number; success_criterion:string; status:"planned"|"running"|"completed"; result:"pending"|"pass"|"fail"|"inconclusive"; result_notes:string; created_at:string; updated_at:string };
export type Gate = { id:string; project_id:string; project_revision:number; result:"CONTINUE"|"SUPPLEMENT"|"STOP"; reasons:string; evidence_gaps:string; snapshot:string; evaluated_at:string; is_stale:boolean };
export type Decision = { id:string; project_id:string; gate_evaluation_id:string; project_revision:number; decision:"CONTINUE"|"SUPPLEMENT"|"STOP"; key_reasons:string; evidence_gaps:string; next_action:string; created_at:string; is_stale:boolean };

export class ApiError extends Error { constructor(public status:number, message:string){ super(message); } }
export async function api<T>(path:string, init?:RequestInit):Promise<T>{
  const response=await fetch(`${runtimeConfig.apiBaseUrl}${path}`,{...init,headers:{Accept:"application/json","Content-Type":"application/json",...(init?.headers??{})},cache:"no-store"});
  if(!response.ok){let message=`请求失败 (${response.status})`;try{const body=await response.json();message=typeof body.detail==="string"?body.detail:body.detail?.message??message;}catch{}throw new ApiError(response.status,message)}
  if(response.status===204)return undefined as T;
  return response.json() as Promise<T>;
}
