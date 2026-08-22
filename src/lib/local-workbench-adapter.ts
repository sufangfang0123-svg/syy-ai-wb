import { api, Assumption, Decision, Evidence, EvidenceLink, EvidenceRelation, Gate, Project, ValidationResult, ValidationTest } from "./real-api";

export type CategoryPack = { id:string; name:string; version:string; status:"active"|"legacy"|"disabled"; category_type:string; description:string; config_json:string; created_at:string; updated_at:string };
export type GovernedEntity = {id:string;project_id:string;status:string;revision:number;version:number;actor:string;data_nature:"real_entry"|"manual_import"|"fixed_demo"|"ai_proposal";is_stale:boolean;stale_reason:string;created_at:string;updated_at:string};
export type Opportunity = GovernedEntity & {title:string;description:string;evidence_ids_json:string;contrary_evidence_json:string;alternatives_json:string;assumption_ids_json:string;category_fit:string;source_proposal_id:string|null;human_reason:string};
export type ProductConcept = GovernedEntity & {opportunity_id:string;name:string;target_user:string;scenario:string;need:string;genes_json:string;material_hypothesis:string;specification_hypothesis:string;price_hypothesis:string;unique_variable:string;evidence_ids_json:string;assumption_ids_json:string;supply_risk:string;compliance_risk:string;source_proposal_id:string|null;selection_reason:string;locked:boolean};
export type ScenarioCandidate = GovernedEntity & {opportunity_id:string;concept_id:string;assumption_id:string|null;evidence_ids_json:string;persona:string;product_gene:string;channel:string;scenario:string;priority:number|null;priority_inputs_json:string;priority_policy_version:string|null;missing_inputs_json:string;rationale:string;contrary_evidence_json:string;owner:string;review_reason:string};
export type ContentAsset = GovernedEntity & {concept_id:string;opportunity_id:string|null;channel:string;target_user:string;scenario:string;objective:string;experiment_hypothesis:string;hook:string;body:string;cta:string;product_genes_json:string;evidence_ids_json:string;claim_refs_json:string;visual_spec:string;variant:string;original_snapshot:string;edited_snapshot:string;source_proposal_id:string|null;compliance_findings_json:string;review_status:"pending"|"approved"|"changes"|"rejected";reviewer:string;review_reason:string};
export type FeedbackRecord = GovernedEntity & {content_asset_id:string;concept_id:string;assumption_id:string|null;channel:string;window_start:string;window_end:string;source:string;impressions:number;clicks:number;interactions:number;saves:number;add_to_cart:number;conversions:number;metric_definition:string;owner:string;notes:string;import_fingerprint:string};
export type AIProposal = GovernedEntity & {task_type:string;input_refs_json:string;input_snapshot_hash:string;origin:"fixed_demo"|"manual_ai_import"|"provider_optional";provider:string|null;model:string|null;prompt_template_version:string;output_schema_version:string;candidates_json:string;reasons_json:string;contrary_evidence_json:string;uncertainty_json:string;missing_inputs_json:string;limitations_json:string;reviewer:string;review_reason:string;accepted_entity_type:string|null;accepted_entity_id:string|null};
export type ChangeProposal = GovernedEntity & {target_entity_type:string;target_entity_id:string;source_proposal_id:string|null;feedback_ids_json:string;proposed_patch_json:string;rationale:string;contrary_evidence_json:string;reviewer:string;review_reason:string};
export type RecommendationPolicy = GovernedEntity & {policy_version:string;dimensions_json:string;feedback_sample_count:number;coverage_json:string;suggestion_json:string;rationale:string;data_insufficient:boolean;reviewer:string;review_reason:string};
export type WorkbenchAudit = {id:string;project_id:string|null;entity_type:string;entity_id:string;action:string;change_summary:string;actor:string;data_nature:string;metadata_json:string;created_at:string};
export type IterationRound = {id:string;project_id:string;round_number:number;base_revision:number;selected_assumption_ids:string;created_at:string};

export type LocalWorkbenchBundle = {
  project:Project;category_pack:CategoryPack;
  evidence:Evidence[];assumptions:Assumption[];evidence_links:EvidenceLink[];evidence_relations:EvidenceRelation[];
  validation_tests:ValidationTest[];validation_results:ValidationResult[];gates:Gate[];decisions:Decision[];rounds:IterationRound[];
  opportunities:Opportunity[];concepts:ProductConcept[];scenarios:ScenarioCandidate[];content_assets:ContentAsset[];
  feedback_records:FeedbackRecord[];ai_proposals:AIProposal[];change_proposals:ChangeProposal[];
  recommendation_policies:RecommendationPolicy[];audit_events:WorkbenchAudit[];
  provider:{status:"disabled";requests:0;message:string};gate_rule_version:"NDG_GATE_V0.3.0";
};

export const localWorkbenchAdapter = {
  listProjects: () => api<Project[]>("/api/v1/projects"),
  listCategoryPacks: () => api<CategoryPack[]>("/api/v1/category-packs"),
  load: (projectId:string) => api<LocalWorkbenchBundle>(`/api/v1/projects/${projectId}/workbench`),
  createProject: (payload:Record<string,unknown>) => api<Project>("/api/v1/projects", {method:"POST",body:JSON.stringify(payload)}),
  mutate: <T>(path:string, method:"POST"|"PATCH", payload?:unknown) => api<T>(path, {method,body:payload === undefined ? undefined : JSON.stringify(payload)}),
  upload: <T>(path:string, body:FormData) => api<T>(path, {method:"POST",body}),
};

export function adapterKind(buildProfile: "public_demo"|"local_integrated") {
  return buildProfile === "local_integrated" ? "local_api" : "public_fixture";
}
