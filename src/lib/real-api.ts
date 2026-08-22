import { runtimeConfig } from "../config/runtime";

export type Dimension="NEED"|"COMMERCIAL"|"PRODUCT"|"SUPPLY"|"COMPLIANCE";
export type GateResult="CONTINUE"|"SUPPLEMENT"|"STOP";
export type Project={id:string;name:string;description:string;product_category:string;target_user:string;decision_question:string;status:"active"|"archived";revision:number;planned_investment:number|null;currency:string;current_round:number;category_pack_id:string;created_at:string;updated_at:string};
export type Evidence={id:string;project_id:string;source_type:"manual"|"url";origin_kind:"manual"|"url"|"paste"|"file";title:string;source_url:string|null;publisher:string;published_at:string|null;retrieved_at:string|null;raw_text:string;summary:string;applicable_scope:string;limitations:string;original_filename:string|null;mime_type:string|null;size_bytes:number|null;file_sha256:string|null;imported_at:string;snapshot_ref:string;content_hash:string;status:"draft"|"confirmed";created_at:string;updated_at:string};
export type Assumption={id:string;project_id:string;statement:string;criticality:number;dimension:Dimension;potential_loss:number|null;avoidable_loss:number|null;created_at:string;updated_at:string};
export type EvidenceLink={id:string;evidence_id:string;assumption_id:string;direction:"support"|"contradict";strength:number;created_at:string};
export type EvidenceRelation={id:string;project_id:string;source_evidence_id:string;target_evidence_id:string;relation_type:"supports"|"conflicts"|"duplicate";notes:string;created_at:string};
export type ValidationTest={id:string;project_id:string;assumption_id:string;name:string;method:string;estimated_cost:number;estimated_days:number;success_criterion:string;round_number:number;metric_name:string;metric_unit:string;direction:"at_least"|"at_most";baseline_value:number|null;threshold_value:number;stop_threshold:number|null;status:"planned"|"running"|"completed";result:"pending"|"pass"|"fail"|"inconclusive";result_notes:string;created_at:string;updated_at:string};
export type ValidationResult={id:string;project_id:string;validation_test_id:string;round_number:number;actual_value:number;sample_size:number|null;executed_at:string;source:string;summary:string;deviation_notes:string;derived_outcome:"pass"|"supplement"|"stop";calculation_snapshot:string;created_at:string};
export type Gate={id:string;project_id:string;project_revision:number;round_number:number;rule_version:string;result:GateResult;reasons:string;evidence_gaps:string;snapshot:string;evaluated_at:string;is_stale:boolean};
export type Decision={id:string;project_id:string;gate_evaluation_id:string;project_revision:number;round_number:number;decision:GateResult;key_reasons:string;evidence_gaps:string;next_action:string;rationale:string;decided_by:string;created_at:string;is_stale:boolean};
export type Economics={currency:string;planned_investment:number|null;validation_cost:number;potential_loss:number|null;avoidable_loss:number|null;validation_to_planned_investment_ratio:number|null;validation_to_avoidable_loss_ratio:number|null;break_even_probability:number|null;formulas:Record<string,string>;missing_fields:string[]};

export class ApiError extends Error{constructor(public status:number,message:string){super(message)}}
export async function api<T>(path:string,init?:RequestInit):Promise<T>{
  const form=init?.body instanceof FormData;
  const response=await fetch(`${runtimeConfig.apiBaseUrl}${path}`,{...init,headers:{Accept:"application/json",...(form?{}:{"Content-Type":"application/json"}),...(init?.headers??{})},cache:"no-store"});
  if(!response.ok){let message=`请求失败 (${response.status})`;try{const body=await response.json();message=typeof body.detail==="string"?body.detail:body.detail?.message??message;}catch{}throw new ApiError(response.status,message)}
  if(response.status===204)return undefined as T;
  return response.json() as Promise<T>;
}
