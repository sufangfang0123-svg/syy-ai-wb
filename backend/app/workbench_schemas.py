from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


DataNature = Literal["real_entry", "manual_import", "fixed_demo", "ai_proposal"]
ProposalTask = Literal[
    "evidence_signal", "signal_cluster", "opportunity", "product_concept",
    "scenario_narrowing", "content_brief", "feedback_theme", "change_proposal",
]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CategoryPackRead(ORMModel):
    id: str
    name: str
    version: str
    status: Literal["active", "legacy", "disabled"]
    category_type: str
    description: str
    config_json: str
    created_at: datetime
    updated_at: datetime


class CategoryPackSelect(BaseModel):
    category_pack_id: str = Field(min_length=3, max_length=80)
    actor: str = Field(min_length=2, max_length=160)
    revision: int = Field(ge=1)


class OpportunityCreate(BaseModel):
    title: str = Field(min_length=2, max_length=220)
    description: str = Field(min_length=2, max_length=10_000)
    evidence_ids: list[str] = Field(default_factory=list, max_length=200)
    contrary_evidence: list[str] = Field(default_factory=list, max_length=200)
    alternatives: list[str] = Field(default_factory=list, max_length=50)
    assumption_ids: list[str] = Field(default_factory=list, max_length=200)
    category_fit: str = Field(default="", max_length=5000)
    source_proposal_id: str | None = None
    human_reason: str = Field(default="", max_length=5000)
    status: Literal["candidate", "confirmed", "rejected"] = "candidate"
    actor: str = Field(min_length=2, max_length=160)
    data_nature: DataNature = "real_entry"


class OpportunityUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=220)
    description: str | None = Field(default=None, min_length=2, max_length=10_000)
    evidence_ids: list[str] | None = Field(default=None, max_length=200)
    contrary_evidence: list[str] | None = Field(default=None, max_length=200)
    alternatives: list[str] | None = Field(default=None, max_length=50)
    assumption_ids: list[str] | None = Field(default=None, max_length=200)
    category_fit: str | None = Field(default=None, max_length=5000)
    human_reason: str | None = Field(default=None, max_length=5000)
    status: Literal["candidate", "confirmed", "rejected"] | None = None
    actor: str = Field(min_length=2, max_length=160)
    revision: int = Field(ge=1)


class OpportunityRead(ORMModel):
    id: str
    project_id: str
    title: str
    description: str
    evidence_ids_json: str
    contrary_evidence_json: str
    alternatives_json: str
    assumption_ids_json: str
    category_fit: str
    source_proposal_id: str | None
    human_reason: str
    status: str
    revision: int
    version: int
    actor: str
    data_nature: str
    is_stale: bool
    stale_reason: str
    created_at: datetime
    updated_at: datetime


class ProductConceptCreate(BaseModel):
    opportunity_id: str
    name: str = Field(min_length=2, max_length=240)
    target_user: str = Field(default="", max_length=5000)
    scenario: str = Field(default="", max_length=5000)
    need: str = Field(default="", max_length=5000)
    genes: list[str] = Field(default_factory=list, max_length=80)
    material_hypothesis: str = Field(default="", max_length=5000)
    specification_hypothesis: str = Field(default="", max_length=5000)
    price_hypothesis: str = Field(default="", max_length=5000)
    unique_variable: str = Field(default="", max_length=5000)
    evidence_ids: list[str] = Field(default_factory=list, max_length=200)
    assumption_ids: list[str] = Field(default_factory=list, max_length=200)
    supply_risk: str = Field(default="", max_length=5000)
    compliance_risk: str = Field(default="", max_length=5000)
    source_proposal_id: str | None = None
    selection_reason: str = Field(default="", max_length=5000)
    status: Literal["candidate", "selected", "rejected"] = "candidate"
    locked: bool = False
    actor: str = Field(min_length=2, max_length=160)
    data_nature: DataNature = "real_entry"


class ProductConceptUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=240)
    target_user: str | None = Field(default=None, max_length=5000)
    scenario: str | None = Field(default=None, max_length=5000)
    need: str | None = Field(default=None, max_length=5000)
    genes: list[str] | None = Field(default=None, max_length=80)
    material_hypothesis: str | None = Field(default=None, max_length=5000)
    specification_hypothesis: str | None = Field(default=None, max_length=5000)
    price_hypothesis: str | None = Field(default=None, max_length=5000)
    unique_variable: str | None = Field(default=None, max_length=5000)
    evidence_ids: list[str] | None = Field(default=None, max_length=200)
    assumption_ids: list[str] | None = Field(default=None, max_length=200)
    supply_risk: str | None = Field(default=None, max_length=5000)
    compliance_risk: str | None = Field(default=None, max_length=5000)
    selection_reason: str | None = Field(default=None, max_length=5000)
    status: Literal["candidate", "selected", "rejected"] | None = None
    locked: bool | None = None
    actor: str = Field(min_length=2, max_length=160)
    revision: int = Field(ge=1)


class ProductConceptRead(ORMModel):
    id: str
    project_id: str
    opportunity_id: str
    name: str
    target_user: str
    scenario: str
    need: str
    genes_json: str
    material_hypothesis: str
    specification_hypothesis: str
    price_hypothesis: str
    unique_variable: str
    evidence_ids_json: str
    assumption_ids_json: str
    supply_risk: str
    compliance_risk: str
    source_proposal_id: str | None
    selection_reason: str
    status: str
    locked: bool
    revision: int
    version: int
    actor: str
    data_nature: str
    is_stale: bool
    stale_reason: str
    created_at: datetime
    updated_at: datetime


class ScenarioGenerate(BaseModel):
    opportunity_id: str
    concept_id: str
    assumption_id: str | None = None
    evidence_ids: list[str] = Field(default_factory=list, max_length=200)
    priority_inputs: dict[str, float] = Field(default_factory=dict)
    actor: str = Field(min_length=2, max_length=160)

    @model_validator(mode="after")
    def validate_scores(self):
        for key, value in self.priority_inputs.items():
            if key not in {"evidence_fit", "error_cost", "uncertainty_gap", "execution", "category_fit", "channel_fit", "compliance_safety", "contrary_evidence_safety"}:
                raise ValueError(f"未知优先级输入: {key}")
            if value < 0 or value > 100:
                raise ValueError(f"{key} 必须在0到100之间")
        return self


class ScenarioReview(BaseModel):
    status: Literal["candidate_space", "shortlisted", "must_validate", "validation", "rejected"]
    owner: str = Field(min_length=2, max_length=160)
    review_reason: str = Field(min_length=2, max_length=5000)
    actor: str = Field(min_length=2, max_length=160)
    revision: int = Field(ge=1)


class ScenarioRead(ORMModel):
    id: str
    project_id: str
    opportunity_id: str
    concept_id: str
    assumption_id: str | None
    evidence_ids_json: str
    persona: str
    product_gene: str
    channel: str
    scenario: str
    priority: float | None
    priority_inputs_json: str
    priority_policy_version: str | None
    missing_inputs_json: str
    rationale: str
    contrary_evidence_json: str
    owner: str
    review_reason: str
    status: str
    revision: int
    version: int
    actor: str
    data_nature: str
    is_stale: bool
    stale_reason: str
    created_at: datetime
    updated_at: datetime


class ContentAssetCreate(BaseModel):
    concept_id: str
    opportunity_id: str | None = None
    channel: Literal["小红书", "抖音", "电商", "视频号", "私域"]
    target_user: str = Field(min_length=2, max_length=5000)
    scenario: str = Field(min_length=2, max_length=5000)
    objective: str = Field(min_length=2, max_length=5000)
    experiment_hypothesis: str = Field(min_length=2, max_length=5000)
    hook: str = Field(default="", max_length=5000)
    body: str = Field(min_length=2, max_length=20_000)
    cta: str = Field(default="", max_length=5000)
    product_genes: list[str] = Field(default_factory=list, max_length=80)
    evidence_ids: list[str] = Field(default_factory=list, max_length=200)
    claim_refs: list[str] = Field(default_factory=list, max_length=200)
    visual_spec: str = Field(default="", max_length=5000)
    variant: str = Field(default="A", max_length=24)
    source_proposal_id: str | None = None
    actor: str = Field(min_length=2, max_length=160)
    data_nature: DataNature = "real_entry"


class ContentAssetUpdate(BaseModel):
    hook: str | None = Field(default=None, max_length=5000)
    body: str | None = Field(default=None, min_length=2, max_length=20_000)
    cta: str | None = Field(default=None, max_length=5000)
    target_user: str | None = Field(default=None, max_length=5000)
    scenario: str | None = Field(default=None, max_length=5000)
    objective: str | None = Field(default=None, max_length=5000)
    experiment_hypothesis: str | None = Field(default=None, max_length=5000)
    product_genes: list[str] | None = Field(default=None, max_length=80)
    evidence_ids: list[str] | None = Field(default=None, max_length=200)
    claim_refs: list[str] | None = Field(default=None, max_length=200)
    visual_spec: str | None = Field(default=None, max_length=5000)
    review_status: Literal["pending", "approved", "changes", "rejected"] | None = None
    reviewer: str | None = Field(default=None, max_length=160)
    review_reason: str | None = Field(default=None, max_length=5000)
    actor: str = Field(min_length=2, max_length=160)
    revision: int = Field(ge=1)


class ContentAssetRead(ORMModel):
    id: str
    project_id: str
    concept_id: str
    opportunity_id: str | None
    channel: str
    target_user: str
    scenario: str
    objective: str
    experiment_hypothesis: str
    hook: str
    body: str
    cta: str
    product_genes_json: str
    evidence_ids_json: str
    claim_refs_json: str
    visual_spec: str
    variant: str
    original_snapshot: str
    edited_snapshot: str
    source_proposal_id: str | None
    compliance_findings_json: str
    review_status: str
    reviewer: str
    review_reason: str
    revision: int
    version: int
    actor: str
    data_nature: str
    is_stale: bool
    stale_reason: str
    created_at: datetime
    updated_at: datetime


class AIProposalImport(BaseModel):
    proposal_id: str | None = None
    task_type: ProposalTask
    input_entity_references: list[str] = Field(min_length=1, max_length=200)
    input_snapshot_hash: str = Field(min_length=64, max_length=64, pattern=r"^[a-f0-9]{64}$")
    origin: Literal["fixed_demo", "manual_ai_import", "provider_optional"] = "manual_ai_import"
    provider: str | None = Field(default=None, max_length=80)
    model: str | None = Field(default=None, max_length=120)
    prompt_template_version: str = Field(min_length=1, max_length=60)
    output_schema_version: Literal["ai_proposal_v1"] = "ai_proposal_v1"
    candidates: list[dict[str, Any]] = Field(min_length=1, max_length=20)
    reasons: list[str] = Field(default_factory=list, max_length=100)
    contrary_evidence: list[str] = Field(default_factory=list, max_length=100)
    uncertainty: list[str] = Field(default_factory=list, max_length=100)
    missing_inputs: list[str] = Field(default_factory=list, max_length=100)
    limitations: list[str] = Field(default_factory=list, max_length=100)
    actor: str = Field(min_length=2, max_length=160)

    @model_validator(mode="after")
    def manual_import_only(self):
        if self.origin != "manual_ai_import":
            raise ValueError("本地导入接口仅接受 manual_ai_import；不会伪装为实时 Provider")
        if self.provider or self.model:
            raise ValueError("manual_ai_import 不得声称 Provider 或模型身份")
        return self


class AIProposalReview(BaseModel):
    decision: Literal["accepted", "rejected"]
    reviewer: str = Field(min_length=2, max_length=160)
    review_reason: str = Field(min_length=2, max_length=5000)
    candidate_index: int = Field(default=0, ge=0, le=19)
    revision: int = Field(ge=1)


class AIProposalRead(ORMModel):
    id: str
    project_id: str
    task_type: str
    input_refs_json: str
    input_snapshot_hash: str
    origin: str
    provider: str | None
    model: str | None
    prompt_template_version: str
    output_schema_version: str
    candidates_json: str
    reasons_json: str
    contrary_evidence_json: str
    uncertainty_json: str
    missing_inputs_json: str
    limitations_json: str
    status: str
    reviewer: str
    review_reason: str
    accepted_entity_type: str | None
    accepted_entity_id: str | None
    revision: int
    version: int
    actor: str
    data_nature: str
    is_stale: bool
    stale_reason: str
    created_at: datetime
    updated_at: datetime


class ChangeProposalCreate(BaseModel):
    target_entity_type: Literal["product_concept", "content_asset"]
    target_entity_id: str
    source_proposal_id: str | None = None
    feedback_ids: list[str] = Field(default_factory=list, max_length=200)
    proposed_patch: dict[str, Any]
    rationale: str = Field(min_length=2, max_length=10_000)
    contrary_evidence: list[str] = Field(default_factory=list, max_length=100)
    actor: str = Field(min_length=2, max_length=160)
    data_nature: DataNature = "real_entry"


class ChangeProposalReview(BaseModel):
    decision: Literal["accepted", "rejected"]
    reviewer: str = Field(min_length=2, max_length=160)
    review_reason: str = Field(min_length=2, max_length=5000)
    revision: int = Field(ge=1)


class ChangeProposalRead(ORMModel):
    id: str
    project_id: str
    target_entity_type: str
    target_entity_id: str
    source_proposal_id: str | None
    feedback_ids_json: str
    proposed_patch_json: str
    rationale: str
    contrary_evidence_json: str
    status: str
    reviewer: str
    review_reason: str
    revision: int
    version: int
    actor: str
    data_nature: str
    is_stale: bool
    stale_reason: str
    created_at: datetime
    updated_at: datetime


class RecommendationReview(BaseModel):
    decision: Literal["accepted", "rejected"]
    reviewer: str = Field(min_length=2, max_length=160)
    review_reason: str = Field(min_length=2, max_length=5000)
    revision: int = Field(ge=1)


class RecommendationPolicyRead(ORMModel):
    id: str
    project_id: str
    policy_version: str
    dimensions_json: str
    feedback_sample_count: int
    coverage_json: str
    suggestion_json: str
    rationale: str
    data_insufficient: bool
    status: str
    reviewer: str
    review_reason: str
    revision: int
    version: int
    actor: str
    data_nature: str
    is_stale: bool
    stale_reason: str
    created_at: datetime
    updated_at: datetime
