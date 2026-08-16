from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

Dimension = Literal["NEED", "COMMERCIAL", "PRODUCT", "SUPPLY", "COMPLIANCE"]
GateResult = Literal["CONTINUE", "SUPPLEMENT", "STOP"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=5000)
    product_category: str = Field(default="", max_length=120)
    target_user: str = Field(default="", max_length=2000)
    decision_question: str = Field(min_length=5, max_length=2000)
    planned_investment: float | None = Field(default=None, gt=0, le=1_000_000_000)
    currency: str = Field(default="CNY", min_length=3, max_length=8)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    product_category: str | None = Field(default=None, max_length=120)
    target_user: str | None = Field(default=None, max_length=2000)
    decision_question: str | None = Field(default=None, min_length=5, max_length=2000)
    planned_investment: float | None = Field(default=None, gt=0, le=1_000_000_000)
    currency: str | None = Field(default=None, min_length=3, max_length=8)
    revision: int = Field(ge=1)


class ProjectRead(ORMModel):
    id: str
    name: str
    description: str
    product_category: str
    target_user: str
    decision_question: str
    status: Literal["active", "archived"]
    revision: int
    planned_investment: float | None
    currency: str
    current_round: int
    created_at: datetime
    updated_at: datetime


class EvidenceCreate(BaseModel):
    title: str = Field(min_length=2, max_length=300)
    publisher: str = Field(default="", max_length=200)
    published_at: datetime | None = None
    raw_text: str = Field(min_length=1, max_length=1_000_000)
    summary: str = Field(default="", max_length=10000)
    applicable_scope: str = Field(default="", max_length=10000)
    limitations: str = Field(default="", max_length=10000)


class PasteEvidenceCreate(EvidenceCreate):
    pass


class EvidenceUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=300)
    publisher: str | None = Field(default=None, max_length=200)
    published_at: datetime | None = None
    raw_text: str | None = Field(default=None, min_length=1, max_length=1_000_000)
    summary: str | None = Field(default=None, max_length=10000)
    applicable_scope: str | None = Field(default=None, max_length=10000)
    limitations: str | None = Field(default=None, max_length=10000)


class UrlEvidenceCreate(BaseModel):
    url: HttpUrl
    summary: str = Field(default="", max_length=10000)
    applicable_scope: str = Field(default="", max_length=10000)
    limitations: str = Field(default="", max_length=10000)


class EvidenceRead(ORMModel):
    id: str
    project_id: str
    source_type: Literal["manual", "url"]
    origin_kind: Literal["manual", "url", "paste", "file"]
    title: str
    source_url: str | None
    publisher: str
    published_at: datetime | None
    retrieved_at: datetime | None
    raw_text: str
    summary: str
    applicable_scope: str
    limitations: str
    original_filename: str | None
    mime_type: str | None
    size_bytes: int | None
    file_sha256: str | None
    imported_at: datetime
    snapshot_ref: str
    content_hash: str
    status: Literal["draft", "confirmed"]
    created_at: datetime
    updated_at: datetime


class AISourceTextCreate(BaseModel):
    source_name: str = Field(min_length=2, max_length=300)
    text: str = Field(min_length=1, max_length=1_000_000)


class AISourceUrlCreate(BaseModel):
    url: HttpUrl


class AISourceFromEvidenceCreate(BaseModel):
    evidence_id: str = Field(min_length=3, max_length=40)


class AISourceRead(ORMModel):
    id: str
    project_id: str
    source_kind: Literal["text", "file", "url", "evidence"]
    source_name: str
    source_url: str | None
    mime_type: str
    sha256: str
    extraction_status: Literal["READY", "NEEDS_MANUAL_VERIFICATION"]
    snapshot_ref: str
    created_at: datetime


class AIEvidenceRunCreate(BaseModel):
    source_document_id: str = Field(min_length=3, max_length=40)


class AIEvidenceCandidateRead(ORMModel):
    id: str
    run_id: str
    ordinal: int
    claim: str
    verbatim_quote: str
    source_locator: str
    matched_segment_id: str | None
    scope: str
    limitations: str
    suggested_grade: Literal["A", "B", "C", "D", "UNKNOWN"]
    confidence_indicator: Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"]
    uncertainty_reasons: str
    citation_verification_status: Literal["VERIFIED", "NEEDS_MANUAL_VERIFICATION", "INVALID"]
    review_status: Literal["PENDING_REVIEW", "ACCEPTED", "EDITED_AND_ACCEPTED", "REJECTED"]
    reviewer_note: str
    source_manually_verified: bool
    reviewed_at: datetime | None
    final_evidence_id: str | None
    created_at: datetime


class AIEvidenceRunRead(ORMModel):
    id: str
    project_id: str
    source_document_id: str
    provider: str
    model: str
    prompt_version: str
    output_schema_version: str
    status: Literal["PENDING", "RUNNING", "SUCCEEDED", "PARTIAL", "ABSTAINED", "FAILED", "TIMED_OUT", "INTERRUPTED"]
    started_at: datetime | None
    completed_at: datetime | None
    latency_ms: int | None
    input_tokens: int | None
    output_tokens: int | None
    document_sufficiency: Literal["SUFFICIENT", "PARTIAL", "INSUFFICIENT"] | None
    abstain_reason: str
    sanitized_error_code: str | None
    sanitized_error_message: str | None
    created_at: datetime
    candidates: list[AIEvidenceCandidateRead] = Field(default_factory=list)


class AIEvidenceReviewCreate(BaseModel):
    action: Literal["ACCEPT", "EDIT_AND_ACCEPT", "REJECT"]
    reviewer_note: str = Field(default="", max_length=5_000)
    manual_source_verified: bool = False
    claim: str | None = Field(default=None, min_length=1, max_length=2_000)
    verbatim_quote: str | None = Field(default=None, min_length=1, max_length=4_000)
    scope: str | None = Field(default=None, min_length=1, max_length=2_000)
    limitations: str | None = Field(default=None, min_length=1, max_length=2_000)


class AICandidateContextRead(BaseModel):
    candidate_id: str
    source_document_id: str
    segment_id: str | None
    locator: dict
    context: str
    citation_verification_status: str
    warning: str


class EvidenceRelationCreate(BaseModel):
    source_evidence_id: str
    target_evidence_id: str
    relation_type: Literal["supports", "conflicts", "duplicate"]
    notes: str = Field(default="", max_length=5000)


class EvidenceRelationRead(ORMModel):
    id: str
    project_id: str
    source_evidence_id: str
    target_evidence_id: str
    relation_type: Literal["supports", "conflicts", "duplicate"]
    notes: str
    created_at: datetime


class AssumptionCreate(BaseModel):
    statement: str = Field(min_length=5, max_length=5000)
    criticality: int = Field(ge=1, le=5)
    dimension: Dimension = "NEED"
    potential_loss: float | None = Field(default=None, ge=0, le=1_000_000_000)
    avoidable_loss: float | None = Field(default=None, ge=0, le=1_000_000_000)


class AssumptionUpdate(BaseModel):
    statement: str | None = Field(default=None, min_length=5, max_length=5000)
    criticality: int | None = Field(default=None, ge=1, le=5)
    dimension: Dimension | None = None
    potential_loss: float | None = Field(default=None, ge=0, le=1_000_000_000)
    avoidable_loss: float | None = Field(default=None, ge=0, le=1_000_000_000)


class AssumptionRead(ORMModel):
    id: str
    project_id: str
    statement: str
    criticality: int
    dimension: Dimension
    potential_loss: float | None
    avoidable_loss: float | None
    created_at: datetime
    updated_at: datetime


class LinkCreate(BaseModel):
    evidence_id: str
    direction: Literal["support", "contradict"]
    strength: int = Field(ge=1, le=5)


class LinkRead(ORMModel):
    id: str
    evidence_id: str
    assumption_id: str
    direction: Literal["support", "contradict"]
    strength: int
    created_at: datetime


class TestCreate(BaseModel):
    assumption_id: str
    name: str = Field(min_length=2, max_length=200)
    method: str = Field(min_length=2, max_length=5000)
    estimated_cost: float = Field(ge=0, le=1_000_000_000)
    estimated_days: int = Field(ge=0, le=3650)
    success_criterion: str = Field(min_length=2, max_length=5000)
    metric_name: str = Field(default="目标指标", min_length=1, max_length=160)
    metric_unit: str = Field(default="count", min_length=1, max_length=40)
    direction: Literal["at_least", "at_most"] = "at_least"
    baseline_value: float | None = None
    threshold_value: float = 1
    stop_threshold: float | None = None


class TestUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    method: str | None = Field(default=None, min_length=2, max_length=5000)
    estimated_cost: float | None = Field(default=None, ge=0, le=1_000_000_000)
    estimated_days: int | None = Field(default=None, ge=0, le=3650)
    success_criterion: str | None = Field(default=None, min_length=2, max_length=5000)
    status: Literal["planned", "running"] | None = None
    metric_name: str | None = Field(default=None, min_length=1, max_length=160)
    metric_unit: str | None = Field(default=None, min_length=1, max_length=40)
    direction: Literal["at_least", "at_most"] | None = None
    baseline_value: float | None = None
    threshold_value: float | None = None
    stop_threshold: float | None = None


class TestRead(ORMModel):
    id: str
    project_id: str
    assumption_id: str
    name: str
    method: str
    estimated_cost: float
    estimated_days: int
    success_criterion: str
    round_number: int
    metric_name: str
    metric_unit: str
    direction: Literal["at_least", "at_most"]
    baseline_value: float | None
    threshold_value: float
    stop_threshold: float | None
    status: Literal["planned", "running", "completed"]
    result: Literal["pending", "pass", "fail", "inconclusive"]
    result_notes: str
    created_at: datetime
    updated_at: datetime


class ValidationResultCreate(BaseModel):
    actual_value: float
    sample_size: int | None = Field(default=None, gt=0)
    executed_at: datetime
    source: str = Field(min_length=2, max_length=300)
    summary: str = Field(min_length=2, max_length=10000)
    deviation_notes: str = Field(default="", max_length=10000)


class ValidationResultRead(ORMModel):
    id: str
    project_id: str
    validation_test_id: str
    round_number: int
    actual_value: float
    sample_size: int | None
    executed_at: datetime
    source: str
    summary: str
    deviation_notes: str
    derived_outcome: Literal["pass", "supplement", "stop"]
    calculation_snapshot: str
    created_at: datetime


class GateRead(ORMModel):
    id: str
    project_id: str
    project_revision: int
    round_number: int
    rule_version: str
    result: GateResult
    reasons: str
    evidence_gaps: str
    snapshot: str
    evaluated_at: datetime
    is_stale: bool


class DecisionCreate(BaseModel):
    gate_evaluation_id: str
    decision: GateResult
    rationale: str = Field(min_length=2, max_length=10000)
    decided_by: str = Field(min_length=2, max_length=160)
    next_action: str = Field(default="", max_length=10000)


class DecisionRead(ORMModel):
    id: str
    project_id: str
    gate_evaluation_id: str
    project_revision: int
    round_number: int
    decision: GateResult
    key_reasons: str
    evidence_gaps: str
    next_action: str
    rationale: str
    decided_by: str
    created_at: datetime
    is_stale: bool


class NextRoundCreate(BaseModel):
    selected_assumption_ids: list[str] = Field(min_length=1, max_length=100)


class IterationRoundRead(ORMModel):
    id: str
    project_id: str
    round_number: int
    base_revision: int
    selected_assumption_ids: str
    created_at: datetime
