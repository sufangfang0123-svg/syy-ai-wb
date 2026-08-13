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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    evidence: Mapped[list["Evidence"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    assumptions: Mapped[list["Assumption"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    tests: Mapped[list["ValidationTest"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    gates: Mapped[list["GateEvaluation"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    decisions: Mapped[list["Decision"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    __table_args__ = (CheckConstraint("status IN ('active','archived')", name="ck_project_status"),)


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
    content_hash: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(16), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    project: Mapped[Project] = relationship(back_populates="evidence")
    links: Mapped[list["EvidenceAssumptionLink"]] = relationship(back_populates="evidence", cascade="all, delete-orphan")
    __table_args__ = (
        CheckConstraint("source_type IN ('manual','url')", name="ck_evidence_source_type"),
        CheckConstraint("status IN ('draft','confirmed')", name="ck_evidence_status"),
        UniqueConstraint("project_id", "content_hash", name="uq_project_content_hash"),
    )


class Assumption(Base):
    __tablename__ = "assumptions"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("asm"))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    statement: Mapped[str] = mapped_column(Text)
    criticality: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    project: Mapped[Project] = relationship(back_populates="assumptions")
    links: Mapped[list["EvidenceAssumptionLink"]] = relationship(back_populates="assumption", cascade="all, delete-orphan")
    tests: Mapped[list["ValidationTest"]] = relationship(back_populates="assumption", cascade="all, delete-orphan")
    __table_args__ = (CheckConstraint("criticality BETWEEN 1 AND 5", name="ck_assumption_criticality"),)


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
    status: Mapped[str] = mapped_column(String(16), default="planned")
    result: Mapped[str] = mapped_column(String(16), default="pending")
    result_notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    project: Mapped[Project] = relationship(back_populates="tests")
    assumption: Mapped[Assumption] = relationship(back_populates="tests")
    __table_args__ = (
        CheckConstraint("status IN ('planned','running','completed')", name="ck_test_status"),
        CheckConstraint("result IN ('pending','pass','fail','inconclusive')", name="ck_test_result"),
        CheckConstraint("estimated_cost >= 0 AND estimated_days >= 0", name="ck_test_estimates"),
    )


class GateEvaluation(Base):
    __tablename__ = "gate_evaluations"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("gate"))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    project_revision: Mapped[int] = mapped_column(Integer)
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
    decision: Mapped[str] = mapped_column(String(16))
    key_reasons: Mapped[str] = mapped_column(Text)
    evidence_gaps: Mapped[str] = mapped_column(Text)
    next_action: Mapped[str] = mapped_column(Text)
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

