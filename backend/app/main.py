from __future__ import annotations

import json
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import APP_VERSION, SCHEMA_VERSION, engine, get_session, run_migrations
from .models import Assumption, AuditEvent, Decision, Evidence, EvidenceAssumptionLink, GateEvaluation, Project, ValidationTest, utcnow
from .schemas import AssumptionCreate, AssumptionRead, AssumptionUpdate, DecisionRead, EvidenceCreate, EvidenceRead, EvidenceUpdate, GateRead, LinkCreate, LinkRead, ProjectCreate, ProjectRead, ProjectUpdate, TestCreate, TestRead, TestUpdate, UrlEvidenceCreate
from .services import audit, content_hash, decision_next_action, evaluate_gate, fetch_public_url, invalidate_project


@asynccontextmanager
async def lifespan(_app: FastAPI):
    run_migrations()
    yield


app = FastAPI(title="Next-Dollar Gate API", version=APP_VERSION, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"], allow_credentials=False, allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Content-Type", "If-Match"])


def require_project(session: Session, project_id: str) -> Project:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(404, "项目不存在")
    return project


def commit(session: Session) -> None:
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(409, "数据冲突或重复") from exc


@app.get("/api/v1/health")
def health(session: Session = Depends(get_session)):
    session.execute(select(func.count()).select_from(Project)).scalar_one()
    return {"status": "ok", "version": APP_VERSION, "database": "ready", "schema_version": SCHEMA_VERSION}


@app.post("/api/v1/projects", response_model=ProjectRead, status_code=201)
def create_project(payload: ProjectCreate, session: Session = Depends(get_session)):
    project = Project(**payload.model_dump())
    session.add(project)
    session.flush()
    audit(session, project.id, "project", project.id, "created", "创建真实项目")
    commit(session)
    return project


@app.get("/api/v1/projects", response_model=list[ProjectRead])
def list_projects(include_archived: bool = False, session: Session = Depends(get_session)):
    query = select(Project).order_by(Project.updated_at.desc())
    if not include_archived:
        query = query.where(Project.status == "active")
    return session.scalars(query).all()


@app.get("/api/v1/projects/{project_id}", response_model=ProjectRead)
def get_project(project_id: str, session: Session = Depends(get_session)):
    return require_project(session, project_id)


@app.patch("/api/v1/projects/{project_id}", response_model=ProjectRead)
def update_project(project_id: str, payload: ProjectUpdate, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    if payload.revision != project.revision:
        raise HTTPException(409, {"message": "项目已被修改，请刷新后重试", "current_revision": project.revision})
    changes = payload.model_dump(exclude={"revision"}, exclude_none=True)
    for key, value in changes.items():
        setattr(project, key, value)
    invalidate_project(session, project, f"项目字段更新: {', '.join(changes) or '无'}")
    audit(session, project.id, "project", project.id, "updated", json.dumps(list(changes), ensure_ascii=False))
    commit(session)
    return project


@app.post("/api/v1/projects/{project_id}/archive", response_model=ProjectRead)
def archive_project(project_id: str, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    project.status = "archived"
    audit(session, project.id, "project", project.id, "archived", "项目归档")
    commit(session)
    return project


@app.get("/api/v1/projects/{project_id}/evidence", response_model=list[EvidenceRead])
def list_evidence(project_id: str, session: Session = Depends(get_session)):
    require_project(session, project_id)
    return session.scalars(select(Evidence).where(Evidence.project_id == project_id).order_by(Evidence.created_at)).all()


@app.post("/api/v1/projects/{project_id}/evidence/manual", response_model=EvidenceRead, status_code=201)
def create_manual_evidence(project_id: str, payload: EvidenceCreate, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    evidence = Evidence(project_id=project.id, source_type="manual", content_hash=content_hash(payload.raw_text), **payload.model_dump())
    session.add(evidence)
    invalidate_project(session, project, "新增手工Evidence")
    session.flush()
    audit(session, project.id, "evidence", evidence.id, "created", "手工录入，状态=draft")
    commit(session)
    return evidence


@app.post("/api/v1/projects/{project_id}/evidence/url", response_model=EvidenceRead, status_code=201)
async def create_url_evidence(project_id: str, payload: UrlEvidenceCreate, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    try:
        fetched = await fetch_public_url(str(payload.url))
    except (ValueError, httpx.HTTPError) as exc:  # type: ignore[name-defined]
        raise HTTPException(422, str(exc)) from exc
    evidence = Evidence(project_id=project.id, source_type="url", source_url=fetched["final_url"], title=fetched["title"], publisher=fetched["publisher"], retrieved_at=utcnow(), raw_text=fetched["raw_text"], summary=payload.summary, content_hash=content_hash(fetched["raw_text"]))
    session.add(evidence)
    invalidate_project(session, project, "新增URL Evidence")
    session.flush()
    audit(session, project.id, "evidence", evidence.id, "url_imported", evidence.source_url or "")
    commit(session)
    return evidence


@app.get("/api/v1/evidence/{evidence_id}", response_model=EvidenceRead)
def get_evidence(evidence_id: str, session: Session = Depends(get_session)):
    evidence = session.get(Evidence, evidence_id)
    if not evidence:
        raise HTTPException(404, "Evidence不存在")
    return evidence


@app.patch("/api/v1/evidence/{evidence_id}", response_model=EvidenceRead)
def update_evidence(evidence_id: str, payload: EvidenceUpdate, session: Session = Depends(get_session)):
    evidence = session.get(Evidence, evidence_id)
    if not evidence:
        raise HTTPException(404, "Evidence不存在")
    project = require_project(session, evidence.project_id)
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(evidence, key, value)
    if payload.raw_text is not None:
        evidence.content_hash = content_hash(payload.raw_text)
    invalidate_project(session, project, "修改Evidence")
    audit(session, project.id, "evidence", evidence.id, "updated", json.dumps(list(changes), ensure_ascii=False))
    commit(session)
    return evidence


@app.post("/api/v1/evidence/{evidence_id}/confirm", response_model=EvidenceRead)
def confirm_evidence(evidence_id: str, session: Session = Depends(get_session)):
    return set_evidence_status(evidence_id, "confirmed", session)


@app.post("/api/v1/evidence/{evidence_id}/unconfirm", response_model=EvidenceRead)
def unconfirm_evidence(evidence_id: str, session: Session = Depends(get_session)):
    return set_evidence_status(evidence_id, "draft", session)


def set_evidence_status(evidence_id: str, target: str, session: Session):
    evidence = session.get(Evidence, evidence_id)
    if not evidence:
        raise HTTPException(404, "Evidence不存在")
    project = require_project(session, evidence.project_id)
    evidence.status = target
    invalidate_project(session, project, f"Evidence状态改为{target}")
    audit(session, project.id, "evidence", evidence.id, target, f"status={target}")
    commit(session)
    return evidence


@app.get("/api/v1/projects/{project_id}/assumptions", response_model=list[AssumptionRead])
def list_assumptions(project_id: str, session: Session = Depends(get_session)):
    require_project(session, project_id)
    return session.scalars(select(Assumption).where(Assumption.project_id == project_id).order_by(Assumption.criticality.desc(), Assumption.created_at)).all()


@app.post("/api/v1/projects/{project_id}/assumptions", response_model=AssumptionRead, status_code=201)
def create_assumption(project_id: str, payload: AssumptionCreate, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    assumption = Assumption(project_id=project.id, **payload.model_dump())
    session.add(assumption)
    invalidate_project(session, project, "新增Assumption")
    session.flush()
    audit(session, project.id, "assumption", assumption.id, "created", f"criticality={assumption.criticality}")
    commit(session)
    return assumption


@app.patch("/api/v1/assumptions/{assumption_id}", response_model=AssumptionRead)
def update_assumption(assumption_id: str, payload: AssumptionUpdate, session: Session = Depends(get_session)):
    assumption = session.get(Assumption, assumption_id)
    if not assumption:
        raise HTTPException(404, "Assumption不存在")
    project = require_project(session, assumption.project_id)
    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(assumption, key, value)
    invalidate_project(session, project, "修改Assumption")
    audit(session, project.id, "assumption", assumption.id, "updated", "假设已修改")
    commit(session)
    return assumption


@app.delete("/api/v1/assumptions/{assumption_id}", status_code=204)
def delete_assumption(assumption_id: str, session: Session = Depends(get_session)):
    assumption = session.get(Assumption, assumption_id)
    if not assumption:
        raise HTTPException(404, "Assumption不存在")
    project = require_project(session, assumption.project_id)
    audit(session, project.id, "assumption", assumption.id, "deleted", "删除假设")
    session.delete(assumption)
    invalidate_project(session, project, "删除Assumption")
    commit(session)
    return Response(status_code=204)


@app.get("/api/v1/projects/{project_id}/links", response_model=list[LinkRead])
def list_links(project_id: str, session: Session = Depends(get_session)):
    require_project(session, project_id)
    return session.scalars(select(EvidenceAssumptionLink).join(Assumption).where(Assumption.project_id == project_id)).all()


@app.post("/api/v1/assumptions/{assumption_id}/links", response_model=LinkRead, status_code=201)
def create_link(assumption_id: str, payload: LinkCreate, session: Session = Depends(get_session)):
    assumption = session.get(Assumption, assumption_id)
    evidence = session.get(Evidence, payload.evidence_id)
    if not assumption or not evidence:
        raise HTTPException(404, "Assumption或Evidence不存在")
    if assumption.project_id != evidence.project_id:
        raise HTTPException(422, "不能跨项目建立证据关系")
    project = require_project(session, assumption.project_id)
    link = EvidenceAssumptionLink(assumption_id=assumption.id, **payload.model_dump())
    session.add(link)
    invalidate_project(session, project, "新增Evidence关系")
    session.flush()
    audit(session, project.id, "link", link.id, "created", f"{link.direction}:{link.strength}")
    commit(session)
    return link


@app.delete("/api/v1/links/{link_id}", status_code=204)
def delete_link(link_id: str, session: Session = Depends(get_session)):
    link = session.get(EvidenceAssumptionLink, link_id)
    if not link:
        raise HTTPException(404, "关系不存在")
    assumption = session.get(Assumption, link.assumption_id)
    project = require_project(session, assumption.project_id)  # type: ignore[union-attr]
    audit(session, project.id, "link", link.id, "deleted", "解除Evidence关系")
    session.delete(link)
    invalidate_project(session, project, "删除Evidence关系")
    commit(session)
    return Response(status_code=204)


@app.get("/api/v1/projects/{project_id}/tests", response_model=list[TestRead])
def list_tests(project_id: str, session: Session = Depends(get_session)):
    require_project(session, project_id)
    return session.scalars(select(ValidationTest).where(ValidationTest.project_id == project_id).order_by(ValidationTest.created_at)).all()


@app.post("/api/v1/projects/{project_id}/tests", response_model=TestRead, status_code=201)
def create_test(project_id: str, payload: TestCreate, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    assumption = session.get(Assumption, payload.assumption_id)
    if not assumption or assumption.project_id != project.id:
        raise HTTPException(422, "验证必须关联当前项目的Assumption")
    test = ValidationTest(project_id=project.id, **payload.model_dump())
    session.add(test)
    invalidate_project(session, project, "新增ValidationTest")
    session.flush()
    audit(session, project.id, "validation_test", test.id, "created", test.name)
    commit(session)
    return test


@app.patch("/api/v1/tests/{test_id}", response_model=TestRead)
def update_test(test_id: str, payload: TestUpdate, session: Session = Depends(get_session)):
    test = session.get(ValidationTest, test_id)
    if not test:
        raise HTTPException(404, "ValidationTest不存在")
    project = require_project(session, test.project_id)
    changes = payload.model_dump(exclude_none=True)
    if changes.get("result") in {"pass", "fail", "inconclusive"}:
        changes["status"] = "completed"
    for key, value in changes.items():
        setattr(test, key, value)
    invalidate_project(session, project, "修改ValidationTest或结果")
    audit(session, project.id, "validation_test", test.id, "updated", json.dumps(changes, ensure_ascii=False))
    commit(session)
    return test


@app.post("/api/v1/projects/{project_id}/gate", response_model=GateRead, status_code=201)
def run_gate(project_id: str, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    gate = evaluate_gate(session, project)
    commit(session)
    return gate


@app.get("/api/v1/projects/{project_id}/gate/current", response_model=GateRead)
def current_gate(project_id: str, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    gate = session.scalar(select(GateEvaluation).where(GateEvaluation.project_id == project.id, GateEvaluation.project_revision == project.revision, GateEvaluation.is_stale.is_(False)).order_by(GateEvaluation.evaluated_at.desc()))
    if not gate:
        raise HTTPException(404, "当前没有有效Gate，需要重新评估")
    return gate


@app.get("/api/v1/projects/{project_id}/gates", response_model=list[GateRead])
def gate_history(project_id: str, session: Session = Depends(get_session)):
    require_project(session, project_id)
    return session.scalars(select(GateEvaluation).where(GateEvaluation.project_id == project_id).order_by(GateEvaluation.evaluated_at.desc())).all()


@app.post("/api/v1/projects/{project_id}/decision", response_model=DecisionRead, status_code=201)
def generate_decision(project_id: str, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    gate = session.scalar(select(GateEvaluation).where(GateEvaluation.project_id == project.id, GateEvaluation.project_revision == project.revision, GateEvaluation.is_stale.is_(False)).order_by(GateEvaluation.evaluated_at.desc()))
    if not gate:
        raise HTTPException(409, "必须先生成当前revision的有效Gate")
    decision = Decision(project_id=project.id, gate_evaluation_id=gate.id, project_revision=project.revision, decision=gate.result, key_reasons=gate.reasons, evidence_gaps=gate.evidence_gaps, next_action=decision_next_action(session, project, gate))
    session.add(decision)
    session.flush()
    audit(session, project.id, "decision", decision.id, "generated", f"decision={decision.decision}")
    commit(session)
    return decision


@app.get("/api/v1/projects/{project_id}/decision/current", response_model=DecisionRead)
def current_decision(project_id: str, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    decision = session.scalar(select(Decision).where(Decision.project_id == project.id, Decision.project_revision == project.revision, Decision.is_stale.is_(False)).order_by(Decision.created_at.desc()))
    if not decision:
        raise HTTPException(404, "当前没有有效Decision")
    return decision


@app.get("/api/v1/projects/{project_id}/decisions", response_model=list[DecisionRead])
def decision_history(project_id: str, session: Session = Depends(get_session)):
    require_project(session, project_id)
    return session.scalars(select(Decision).where(Decision.project_id == project_id).order_by(Decision.created_at.desc())).all()


@app.get("/api/v1/projects/{project_id}/trace")
def decision_trace(project_id: str, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    decision = session.scalar(select(Decision).where(Decision.project_id == project.id).order_by(Decision.created_at.desc()))
    if not decision:
        raise HTTPException(404, "尚无Decision")
    gate = session.get(GateEvaluation, decision.gate_evaluation_id)
    return {"project": ProjectRead.model_validate(project), "decision": DecisionRead.model_validate(decision), "gate": GateRead.model_validate(gate), "snapshot": json.loads(gate.snapshot)}


@app.get("/api/v1/projects/{project_id}/export")
def export_project(project_id: str, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    return {
        "export_version": "1.0",
        "exported_at": utcnow().isoformat(),
        "project": ProjectRead.model_validate(project).model_dump(mode="json"),
        "evidence": [EvidenceRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(Evidence).where(Evidence.project_id == project.id)).all()],
        "assumptions": [AssumptionRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(Assumption).where(Assumption.project_id == project.id)).all()],
        "links": [LinkRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(EvidenceAssumptionLink).join(Assumption).where(Assumption.project_id == project.id)).all()],
        "tests": [TestRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(ValidationTest).where(ValidationTest.project_id == project.id)).all()],
        "gates": [GateRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(GateEvaluation).where(GateEvaluation.project_id == project.id)).all()],
        "decisions": [DecisionRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(Decision).where(Decision.project_id == project.id)).all()],
        "audit_events": [{"id": item.id, "entity_type": item.entity_type, "entity_id": item.entity_id, "action": item.action, "change_summary": item.change_summary, "created_at": item.created_at.isoformat()} for item in session.scalars(select(AuditEvent).where(AuditEvent.project_id == project.id).order_by(AuditEvent.created_at)).all()],
    }

