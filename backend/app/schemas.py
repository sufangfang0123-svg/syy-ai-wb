from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=5000)
    product_category: str = Field(default="", max_length=120)
    target_user: str = Field(default="", max_length=2000)
    decision_question: str = Field(min_length=5, max_length=2000)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    product_category: str | None = Field(default=None, max_length=120)
    target_user: str | None = Field(default=None, max_length=2000)
    decision_question: str | None = Field(default=None, min_length=5, max_length=2000)
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
    created_at: datetime
    updated_at: datetime


class EvidenceCreate(BaseModel):
    title: str = Field(min_length=2, max_length=300)
    publisher: str = Field(default="", max_length=200)
    published_at: datetime | None = None
    raw_text: str = Field(min_length=1, max_length=1_000_000)
    summary: str = Field(default="", max_length=10000)


class EvidenceUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=300)
    publisher: str | None = Field(default=None, max_length=200)
    published_at: datetime | None = None
    raw_text: str | None = Field(default=None, min_length=1, max_length=1_000_000)
    summary: str | None = Field(default=None, max_length=10000)


class UrlEvidenceCreate(BaseModel):
    url: HttpUrl
    summary: str = Field(default="", max_length=10000)


class EvidenceRead(ORMModel):
    id: str
    project_id: str
    source_type: Literal["manual", "url"]
    title: str
    source_url: str | None
    publisher: str
    published_at: datetime | None
    retrieved_at: datetime | None
    raw_text: str
    summary: str
    content_hash: str
    status: Literal["draft", "confirmed"]
    created_at: datetime
    updated_at: datetime


class AssumptionCreate(BaseModel):
    statement: str = Field(min_length=5, max_length=5000)
    criticality: int = Field(ge=1, le=5)


class AssumptionUpdate(BaseModel):
    statement: str | None = Field(default=None, min_length=5, max_length=5000)
    criticality: int | None = Field(default=None, ge=1, le=5)


class AssumptionRead(ORMModel):
    id: str
    project_id: str
    statement: str
    criticality: int
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


class TestUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    method: str | None = Field(default=None, min_length=2, max_length=5000)
    estimated_cost: float | None = Field(default=None, ge=0, le=1_000_000_000)
    estimated_days: int | None = Field(default=None, ge=0, le=3650)
    success_criterion: str | None = Field(default=None, min_length=2, max_length=5000)
    status: Literal["planned", "running", "completed"] | None = None
    result: Literal["pending", "pass", "fail", "inconclusive"] | None = None
    result_notes: str | None = Field(default=None, max_length=10000)

    @field_validator("result")
    @classmethod
    def result_is_known(cls, value):
        return value


class TestRead(ORMModel):
    id: str
    project_id: str
    assumption_id: str
    name: str
    method: str
    estimated_cost: float
    estimated_days: int
    success_criterion: str
    status: Literal["planned", "running", "completed"]
    result: Literal["pending", "pass", "fail", "inconclusive"]
    result_notes: str
    created_at: datetime
    updated_at: datetime


class GateRead(ORMModel):
    id: str
    project_id: str
    project_revision: int
    result: Literal["CONTINUE", "SUPPLEMENT", "STOP"]
    reasons: str
    evidence_gaps: str
    snapshot: str
    evaluated_at: datetime
    is_stale: bool


class DecisionRead(ORMModel):
    id: str
    project_id: str
    gate_evaluation_id: str
    project_revision: int
    decision: Literal["CONTINUE", "SUPPLEMENT", "STOP"]
    key_reasons: str
    evidence_gaps: str
    next_action: str
    created_at: datetime
    is_stale: bool

