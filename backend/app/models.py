from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:16]}"


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("prj"))
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    product_category: Mapped[str] = mapped_column(String(120), default="")
    target_user: Mapped[str] = mapped_column(Text, default="")
    decision_question: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="active")
    revision: Mapped[int] = mapped_column(Integer, default=1)
    planned_investment: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(8), default="CNY")
    current_round: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    evidence: Mapped[list["Evidence"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    assumptions: Mapped[list["Assumption"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    tests: Mapped[list["ValidationTest"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    gates: Mapped[list["GateEvaluation"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    decisions: Mapped[list["Decision"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    rounds: Mapped[list["IterationRound"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    __table_args__ = (
        CheckConstraint("status IN ('active','archived')", name="ck_project_status"),
        CheckConstraint("planned_investment IS NULL OR planned_investment > 0", name="ck_project_investment"),
        CheckConstraint("current_round >= 1", name="ck_project_round"),
    )


class Evidence(Base):
    __tablename__ = "evidence"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("ev"))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    source_type: Mapped[str] = mapped_column(String(16))
    title: Mapped[str] = mapped_column(String(300))
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    publisher: Mapped[str] = mapped_column(String(200), default="")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    retrieved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    raw_text: Mapped[str] = mapped_column(Text)
    summary: Mapped[str] = mapped_column(Text, default="")
    applicable_scope: Mapped[str] = mapped_column(Text, default="")
    limitations: Mapped[str] = mapped_column(Text, default="")
    origin_kind: Mapped[str] = mapped_column(String(16), default="manual")
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_sha256: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    imported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    snapshot_ref: Mapped[str] = mapped_column(Text, default="database:raw_text")
    content_hash: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(16), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    project: Mapped[Project] = relationship(back_populates="evidence")
    links: Mapped[list["EvidenceAssumptionLink"]] = relationship(back_populates="evidence", cascade="all, delete-orphan")
    __table_args__ = (
        CheckConstraint("source_type IN ('manual','url')", name="ck_evidence_source_type"),
        CheckConstraint("status IN ('draft','confirmed')", name="ck_evidence_status"),
        CheckConstraint("origin_kind IN ('manual','url','paste','file')", name="ck_evidence_origin_kind"),
        CheckConstraint("size_bytes IS NULL OR size_bytes >= 0", name="ck_evidence_size"),
        UniqueConstraint("project_id", "content_hash", name="uq_project_content_hash"),
    )


class Assumption(Base):
    __tablename__ = "assumptions"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("asm"))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    statement: Mapped[str] = mapped_column(Text)
    criticality: Mapped[int] = mapped_column(Integer)
    dimension: Mapped[str] = mapped_column(String(16), default="NEED")
    potential_loss: Mapped[float | None] = mapped_column(Float, nullable=True)
    avoidable_loss: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    project: Mapped[Project] = relationship(back_populates="assumptions")
    links: Mapped[list["EvidenceAssumptionLink"]] = relationship(back_populates="assumption", cascade="all, delete-orphan")
    tests: Mapped[list["ValidationTest"]] = relationship(back_populates="assumption", cascade="all, delete-orphan")
    __table_args__ = (
        CheckConstraint("criticality BETWEEN 1 AND 5", name="ck_assumption_criticality"),
        CheckConstraint("dimension IN ('NEED','COMMERCIAL','PRODUCT','SUPPLY','COMPLIANCE')", name="ck_assumption_dimension"),
        CheckConstraint("potential_loss IS NULL OR potential_loss >= 0", name="ck_assumption_potential_loss"),
        CheckConstraint("avoidable_loss IS NULL OR avoidable_loss >= 0", name="ck_assumption_avoidable_loss"),
    )


class EvidenceAssumptionLink(Base):
    __tablename__ = "evidence_assumption_links"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("lnk"))
    evidence_id: Mapped[str] = mapped_column(ForeignKey("evidence.id", ondelete="CASCADE"), index=True)
    assumption_id: Mapped[str] = mapped_column(ForeignKey("assumptions.id", ondelete="CASCADE"), index=True)
    direction: Mapped[str] = mapped_column(String(16))
    strength: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    evidence: Mapped[Evidence] = relationship(back_populates="links")
    assumption: Mapped[Assumption] = relationship(back_populates="links")
    __table_args__ = (
        CheckConstraint("direction IN ('support','contradict')", name="ck_link_direction"),
        CheckConstraint("strength BETWEEN 1 AND 5", name="ck_link_strength"),
        UniqueConstraint("evidence_id", "assumption_id", "direction", name="uq_evidence_assumption_direction"),
    )


class ValidationTest(Base):
    __tablename__ = "validation_tests"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("tst"))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    assumption_id: Mapped[str] = mapped_column(ForeignKey("assumptions.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    method: Mapped[str] = mapped_column(Text)
    estimated_cost: Mapped[float] = mapped_column(Float)
    estimated_days: Mapped[int] = mapped_column(Integer)
    success_criterion: Mapped[str] = mapped_column(Text)
    round_number: Mapped[int] = mapped_column(Integer, default=1)
    metric_name: Mapped[str] = mapped_column(String(160), default="目标指标")
    metric_unit: Mapped[str] = mapped_column(String(40), default="count")
    direction: Mapped[str] = mapped_column(String(16), default="at_least")
    baseline_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    threshold_value: Mapped[float] = mapped_column(Float, default=1)
    stop_threshold: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="planned")
    result: Mapped[str] = mapped_column(String(16), default="pending")
    result_notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    project: Mapped[Project] = relationship(back_populates="tests")
    assumption: Mapped[Assumption] = relationship(back_populates="tests")
    validation_result: Mapped["ValidationResult | None"] = relationship(back_populates="validation_test", cascade="all, delete-orphan", uselist=False)
    __table_args__ = (
        CheckConstraint("status IN ('planned','running','completed')", name="ck_test_status"),
        CheckConstraint("result IN ('pending','pass','fail','inconclusive')", name="ck_test_result"),
        CheckConstraint("estimated_cost >= 0 AND estimated_days >= 0", name="ck_test_estimates"),
        CheckConstraint("round_number >= 1", name="ck_test_round"),
        CheckConstraint("direction IN ('at_least','at_most')", name="ck_test_direction"),
    )


class GateEvaluation(Base):
    __tablename__ = "gate_evaluations"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("gate"))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    project_revision: Mapped[int] = mapped_column(Integer)
    round_number: Mapped[int] = mapped_column(Integer, default=1)
    rule_version: Mapped[str] = mapped_column(String(40), default="NDG_GATE_V0.3.0")
    result: Mapped[str] = mapped_column(String(16))
    reasons: Mapped[str] = mapped_column(Text)
    evidence_gaps: Mapped[str] = mapped_column(Text)
    snapshot: Mapped[str] = mapped_column(Text)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    is_stale: Mapped[bool] = mapped_column(Boolean, default=False)
    project: Mapped[Project] = relationship(back_populates="gates")
    decisions: Mapped[list["Decision"]] = relationship(back_populates="gate", cascade="all, delete-orphan")
    __table_args__ = (CheckConstraint("result IN ('CONTINUE','SUPPLEMENT','STOP')", name="ck_gate_result"),)


class Decision(Base):
    __tablename__ = "decisions"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("dec"))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    gate_evaluation_id: Mapped[str] = mapped_column(ForeignKey("gate_evaluations.id", ondelete="CASCADE"), index=True)
    project_revision: Mapped[int] = mapped_column(Integer)
    round_number: Mapped[int] = mapped_column(Integer, default=1)
    decision: Mapped[str] = mapped_column(String(16))
    key_reasons: Mapped[str] = mapped_column(Text)
    evidence_gaps: Mapped[str] = mapped_column(Text)
    next_action: Mapped[str] = mapped_column(Text)
    rationale: Mapped[str] = mapped_column(Text, default="")
    decided_by: Mapped[str] = mapped_column(String(160), default="self-declared")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    is_stale: Mapped[bool] = mapped_column(Boolean, default=False)
    project: Mapped[Project] = relationship(back_populates="decisions")
    gate: Mapped[GateEvaluation] = relationship(back_populates="decisions")


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("audit"))
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=True)
    entity_type: Mapped[str] = mapped_column(String(40))
    entity_id: Mapped[str] = mapped_column(String(40))
    action: Mapped[str] = mapped_column(String(40))
    change_summary: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class EvidenceRelation(Base):
    __tablename__ = "evidence_relations"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("evr"))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    source_evidence_id: Mapped[str] = mapped_column(ForeignKey("evidence.id", ondelete="CASCADE"), index=True)
    target_evidence_id: Mapped[str] = mapped_column(ForeignKey("evidence.id", ondelete="CASCADE"), index=True)
    relation_type: Mapped[str] = mapped_column(String(16))
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (
        CheckConstraint("relation_type IN ('supports','conflicts','duplicate')", name="ck_evidence_relation_type"),
        CheckConstraint("source_evidence_id <> target_evidence_id", name="ck_evidence_relation_distinct"),
        UniqueConstraint("source_evidence_id", "target_evidence_id", "relation_type", name="uq_evidence_relation"),
    )


class ValidationResult(Base):
    __tablename__ = "validation_results"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("res"))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    validation_test_id: Mapped[str] = mapped_column(ForeignKey("validation_tests.id", ondelete="CASCADE"), unique=True, index=True)
    round_number: Mapped[int] = mapped_column(Integer)
    actual_value: Mapped[float] = mapped_column(Float)
    sample_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    executed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    source: Mapped[str] = mapped_column(String(300))
    summary: Mapped[str] = mapped_column(Text)
    deviation_notes: Mapped[str] = mapped_column(Text, default="")
    derived_outcome: Mapped[str] = mapped_column(String(16))
    calculation_snapshot: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    validation_test: Mapped[ValidationTest] = relationship(back_populates="validation_result")
    __table_args__ = (
        CheckConstraint("sample_size IS NULL OR sample_size > 0", name="ck_result_sample_size"),
        CheckConstraint("derived_outcome IN ('pass','supplement','stop')", name="ck_result_outcome"),
        CheckConstraint("round_number >= 1", name="ck_result_round"),
    )


class IterationRound(Base):
    __tablename__ = "iteration_rounds"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("rnd"))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    round_number: Mapped[int] = mapped_column(Integer)
    base_revision: Mapped[int] = mapped_column(Integer)
    selected_assumption_ids: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    project: Mapped[Project] = relationship(back_populates="rounds")
    __table_args__ = (
        CheckConstraint("round_number >= 1", name="ck_iteration_round"),
        UniqueConstraint("project_id", "round_number", name="uq_project_round"),
    )

