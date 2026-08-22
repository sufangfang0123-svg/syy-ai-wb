from __future__ import annotations

import json
from contextlib import asynccontextmanager

import httpx
from fastapi import Depends, FastAPI, File, Form, HTTPException, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import APP_VERSION, SCHEMA_VERSION, engine, get_session, run_migrations
from .materials import extract_upload, store_snapshot
from .models import Assumption, AuditEvent, Decision, Evidence, EvidenceAssumptionLink, EvidenceRelation, GateEvaluation, IterationRound, Project, ValidationResult, ValidationTest, utcnow
from .schemas import AssumptionCreate, AssumptionRead, AssumptionUpdate, DecisionCreate, DecisionRead, EvidenceCreate, EvidenceRead, EvidenceRelationCreate, EvidenceRelationRead, EvidenceUpdate, GateRead, IterationRoundRead, LinkCreate, LinkRead, NextRoundCreate, PasteEvidenceCreate, ProjectCreate, ProjectRead, ProjectUpdate, TestCreate, TestRead, TestUpdate, UrlEvidenceCreate, ValidationResultCreate, ValidationResultRead
from .services import audit, content_hash, decision_next_action, derive_validation_outcome, economics_snapshot, evaluate_gate, fetch_public_url, invalidate_project
from .workbench_api import router as workbench_router
from .workbench_models import AIProposal, CategoryPack, ChangeProposal, ContentAsset, FeedbackRecord, Opportunity, ProductConcept, RecommendationPolicy, ScenarioCandidate
from .workbench_schemas import AIProposalRead, CategoryPackRead, ChangeProposalRead, ContentAssetRead, OpportunityRead, ProductConceptRead, RecommendationPolicyRead, ScenarioRead


@asynccontextmanager
async def lifespan(_app: FastAPI):
    run_migrations()
    yield


app = FastAPI(title="Next-Dollar Gate API", version=APP_VERSION, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"], allow_credentials=False, allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Content-Type", "If-Match", "Idempotency-Key"])


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
    session.add(IterationRound(project_id=project.id, round_number=1, base_revision=project.revision, selected_assumption_ids="[]"))
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
    digest = content_hash(payload.raw_text)
    if session.scalar(select(Evidence.id).where(Evidence.project_id == project.id, Evidence.content_hash == digest)):
        raise HTTPException(409, "同一项目已存在内容相同的Evidence")
    evidence = Evidence(project_id=project.id, source_type="manual", origin_kind="manual", content_hash=digest, **payload.model_dump())
    session.add(evidence)
    invalidate_project(session, project, "新增手工Evidence")
    session.flush()
    audit(session, project.id, "evidence", evidence.id, "created", "手工录入，状态=draft")
    commit(session)
    return evidence


@app.post("/api/v1/projects/{project_id}/evidence/paste", response_model=EvidenceRead, status_code=201)
def create_paste_evidence(project_id: str, payload: PasteEvidenceCreate, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    digest = content_hash(payload.raw_text)
    if session.scalar(select(Evidence.id).where(Evidence.project_id == project.id, Evidence.content_hash == digest)):
        raise HTTPException(409, "同一项目已存在内容相同的Evidence")
    evidence = Evidence(project_id=project.id, source_type="manual", origin_kind="paste", content_hash=digest, snapshot_ref="database:raw_text", **payload.model_dump())
    session.add(evidence)
    invalidate_project(session, project, "新增粘贴文本Evidence")
    session.flush()
    audit(session, project.id, "evidence", evidence.id, "paste_imported", f"sha256={digest}")
    commit(session)
    return evidence


@app.post("/api/v1/projects/{project_id}/evidence/file", response_model=EvidenceRead, status_code=201)
async def create_file_evidence(project_id: str, title: str = Form(...), publisher: str = Form(""), summary: str = Form(""), applicable_scope: str = Form(""), limitations: str = Form(""), file: UploadFile = File(...), session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    try:
        data = await file.read(5 * 1024 * 1024 + 1)
        extracted = extract_upload(file.filename or "", file.content_type, data)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    digest = content_hash(str(extracted["raw_text"]))
    duplicate = session.scalar(select(Evidence.id).where(Evidence.project_id == project.id, (Evidence.content_hash == digest) | (Evidence.file_sha256 == extracted["sha256"])))
    if duplicate:
        raise HTTPException(409, {"message": "同一项目已存在重复文件或内容", "evidence_id": duplicate})
    snapshot = store_snapshot(project.id, str(extracted["sha256"]), str(extracted["suffix"]), data)
    evidence = Evidence(project_id=project.id, source_type="manual", origin_kind="file", title=title, publisher=publisher, summary=summary, applicable_scope=applicable_scope, limitations=limitations, raw_text=extracted["raw_text"], content_hash=digest, original_filename=file.filename, mime_type=extracted["mime_type"], size_bytes=extracted["size_bytes"], file_sha256=extracted["sha256"], snapshot_ref=snapshot)
    session.add(evidence)
    invalidate_project(session, project, "新增文件Evidence")
    session.flush()
    audit(session, project.id, "evidence", evidence.id, "file_imported", f"sha256={evidence.file_sha256}; snapshot={snapshot}")
    commit(session)
    return evidence


@app.post("/api/v1/projects/{project_id}/evidence/url", response_model=EvidenceRead, status_code=201)
async def create_url_evidence(project_id: str, payload: UrlEvidenceCreate, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    try:
        fetched = await fetch_public_url(str(payload.url))
    except (ValueError, httpx.HTTPError) as exc:  # type: ignore[name-defined]
        raise HTTPException(422, str(exc)) from exc
    digest = content_hash(fetched["raw_text"])
    if session.scalar(select(Evidence.id).where(Evidence.project_id == project.id, Evidence.content_hash == digest)):
        raise HTTPException(409, "同一项目已存在内容相同的Evidence")
    evidence = Evidence(project_id=project.id, source_type="url", origin_kind="url", source_url=fetched["final_url"], title=fetched["title"], publisher=fetched["publisher"], retrieved_at=utcnow(), raw_text=fetched["raw_text"], summary=payload.summary, applicable_scope=payload.applicable_scope, limitations=payload.limitations, content_hash=digest)
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


@app.get("/api/v1/projects/{project_id}/evidence-relations", response_model=list[EvidenceRelationRead])
def list_evidence_relations(project_id: str, session: Session = Depends(get_session)):
    require_project(session, project_id)
    return session.scalars(select(EvidenceRelation).where(EvidenceRelation.project_id == project_id).order_by(EvidenceRelation.created_at)).all()


@app.post("/api/v1/projects/{project_id}/evidence-relations", response_model=EvidenceRelationRead, status_code=201)
def create_evidence_relation(project_id: str, payload: EvidenceRelationCreate, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    source = session.get(Evidence, payload.source_evidence_id)
    target = session.get(Evidence, payload.target_evidence_id)
    if not source or not target or source.project_id != project.id or target.project_id != project.id:
        raise HTTPException(422, "关系两端必须是当前项目的Evidence")
    if source.id == target.id:
        raise HTTPException(422, "Evidence不能与自身建立关系")
    relation = EvidenceRelation(project_id=project.id, **payload.model_dump())
    session.add(relation)
    invalidate_project(session, project, "新增EvidenceRelation")
    session.flush()
    audit(session, project.id, "evidence_relation", relation.id, "created", payload.relation_type)
    commit(session)
    return relation


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
    if evidence.status != "confirmed":
        raise HTTPException(422, "只有已确认Evidence可以关联Assumption")
    if session.scalar(select(EvidenceAssumptionLink.id).where(EvidenceAssumptionLink.evidence_id == evidence.id, EvidenceAssumptionLink.assumption_id == assumption.id, EvidenceAssumptionLink.direction == payload.direction)):
        raise HTTPException(409, "相同Evidence、Assumption和方向的关系已存在")
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
    if payload.direction == "at_least" and payload.stop_threshold is not None and payload.stop_threshold >= payload.threshold_value:
        raise HTTPException(422, "at_least的停止阈值必须小于通过阈值")
    if payload.direction == "at_most" and payload.stop_threshold is not None and payload.stop_threshold <= payload.threshold_value:
        raise HTTPException(422, "at_most的停止阈值必须大于通过阈值")
    test = ValidationTest(project_id=project.id, round_number=project.current_round, **payload.model_dump())
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
    for key, value in changes.items():
        setattr(test, key, value)
    invalidate_project(session, project, "修改ValidationTest或结果")
    audit(session, project.id, "validation_test", test.id, "updated", json.dumps(changes, ensure_ascii=False))
    commit(session)
    return test


@app.post("/api/v1/tests/{test_id}/result", response_model=ValidationResultRead, status_code=201)
def create_validation_result(test_id: str, payload: ValidationResultCreate, session: Session = Depends(get_session)):
    test = session.get(ValidationTest, test_id)
    if not test:
        raise HTTPException(404, "ValidationTest不存在")
    if test.validation_result:
        raise HTTPException(409, "该验证已有结果；修改阈值或重新验证请进入下一轮")
    project = require_project(session, test.project_id)
    outcome, snapshot = derive_validation_outcome(test, payload.actual_value)
    result = ValidationResult(project_id=project.id, validation_test_id=test.id, round_number=test.round_number, derived_outcome=outcome, calculation_snapshot=json.dumps(snapshot, ensure_ascii=False), **payload.model_dump())
    test.status = "completed"
    test.result = "pass" if outcome == "pass" else ("fail" if outcome == "stop" else "inconclusive")
    test.result_notes = payload.summary
    session.add(result)
    invalidate_project(session, project, "回填ValidationResult并按阈值派生结论")
    session.flush()
    audit(session, project.id, "validation_result", result.id, "derived", json.dumps(snapshot, ensure_ascii=False))
    commit(session)
    return result


@app.get("/api/v1/projects/{project_id}/results", response_model=list[ValidationResultRead])
def list_validation_results(project_id: str, session: Session = Depends(get_session)):
    require_project(session, project_id)
    return session.scalars(select(ValidationResult).where(ValidationResult.project_id == project_id).order_by(ValidationResult.created_at)).all()


@app.get("/api/v1/projects/{project_id}/economics")
def get_economics(project_id: str, session: Session = Depends(get_session)):
    return economics_snapshot(session, require_project(session, project_id))


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
def create_decision(project_id: str, payload: DecisionCreate, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    gate = session.get(GateEvaluation, payload.gate_evaluation_id)
    if not gate or gate.project_id != project.id or gate.project_revision != project.revision or gate.is_stale:
        raise HTTPException(409, "必须基于当前revision的有效Gate进行人工决策")
    ranks = {"STOP": 0, "SUPPLEMENT": 1, "CONTINUE": 2}
    if ranks[payload.decision] > ranks[gate.result]:
        raise HTTPException(422, "人工决策不得比规则Gate更激进")
    next_action = payload.next_action or decision_next_action(session, project, gate)
    decision = Decision(project_id=project.id, gate_evaluation_id=gate.id, project_revision=project.revision, round_number=project.current_round, decision=payload.decision, key_reasons=gate.reasons, evidence_gaps=gate.evidence_gaps, next_action=next_action, rationale=payload.rationale, decided_by=payload.decided_by)
    session.add(decision)
    session.flush()
    audit(session, project.id, "decision", decision.id, "human_confirmed", f"decision={decision.decision}; decided_by={decision.decided_by}")
    commit(session)
    return decision


@app.post("/api/v1/projects/{project_id}/rounds/next", response_model=IterationRoundRead, status_code=201)
def create_next_round(project_id: str, payload: NextRoundCreate, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    assumptions = session.scalars(select(Assumption).where(Assumption.project_id == project.id, Assumption.id.in_(payload.selected_assumption_ids))).all()
    if len(assumptions) != len(set(payload.selected_assumption_ids)):
        raise HTTPException(422, "存在不属于当前项目的Assumption")
    project.current_round += 1
    invalidate_project(session, project, "创建下一轮验证")
    iteration = IterationRound(project_id=project.id, round_number=project.current_round, base_revision=project.revision, selected_assumption_ids=json.dumps(payload.selected_assumption_ids))
    session.add(iteration)
    session.flush()
    audit(session, project.id, "iteration_round", iteration.id, "created", iteration.selected_assumption_ids)
    commit(session)
    return iteration


@app.get("/api/v1/projects/{project_id}/rounds", response_model=list[IterationRoundRead])
def list_rounds(project_id: str, session: Session = Depends(get_session)):
    require_project(session, project_id)
    return session.scalars(select(IterationRound).where(IterationRound.project_id == project_id).order_by(IterationRound.round_number)).all()


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
        "export_version": "2.0",
        "exported_at": utcnow().isoformat(),
        "project": ProjectRead.model_validate(project).model_dump(mode="json"),
        "evidence": [EvidenceRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(Evidence).where(Evidence.project_id == project.id)).all()],
        "assumptions": [AssumptionRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(Assumption).where(Assumption.project_id == project.id)).all()],
        "links": [LinkRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(EvidenceAssumptionLink).join(Assumption).where(Assumption.project_id == project.id)).all()],
        "evidence_relations": [EvidenceRelationRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(EvidenceRelation).where(EvidenceRelation.project_id == project.id)).all()],
        "tests": [TestRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(ValidationTest).where(ValidationTest.project_id == project.id)).all()],
        "validation_results": [ValidationResultRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(ValidationResult).where(ValidationResult.project_id == project.id)).all()],
        "rounds": [IterationRoundRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(IterationRound).where(IterationRound.project_id == project.id)).all()],
        "economics": economics_snapshot(session, project),
        "gates": [GateRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(GateEvaluation).where(GateEvaluation.project_id == project.id)).all()],
        "decisions": [DecisionRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(Decision).where(Decision.project_id == project.id)).all()],
        "category_pack": CategoryPackRead.model_validate(session.get(CategoryPack, project.category_pack_id)).model_dump(mode="json"),
        "opportunities": [OpportunityRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(Opportunity).where(Opportunity.project_id == project.id)).all()],
        "product_concepts": [ProductConceptRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(ProductConcept).where(ProductConcept.project_id == project.id)).all()],
        "scenario_candidates": [ScenarioRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(ScenarioCandidate).where(ScenarioCandidate.project_id == project.id)).all()],
        "content_assets": [ContentAssetRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(ContentAsset).where(ContentAsset.project_id == project.id)).all()],
        "feedback_records": [{column.name: getattr(item, column.name).isoformat() if hasattr(getattr(item, column.name), "isoformat") else getattr(item, column.name) for column in FeedbackRecord.__table__.columns} for item in session.scalars(select(FeedbackRecord).where(FeedbackRecord.project_id == project.id)).all()],
        "ai_proposals": [AIProposalRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(AIProposal).where(AIProposal.project_id == project.id)).all()],
        "change_proposals": [ChangeProposalRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(ChangeProposal).where(ChangeProposal.project_id == project.id)).all()],
        "recommendation_policies": [RecommendationPolicyRead.model_validate(item).model_dump(mode="json") for item in session.scalars(select(RecommendationPolicy).where(RecommendationPolicy.project_id == project.id)).all()],
        "audit_events": [{"id": item.id, "entity_type": item.entity_type, "entity_id": item.entity_id, "action": item.action, "change_summary": item.change_summary, "actor": item.actor, "data_nature": item.data_nature, "metadata_json": item.metadata_json, "created_at": item.created_at.isoformat()} for item in session.scalars(select(AuditEvent).where(AuditEvent.project_id == project.id).order_by(AuditEvent.created_at)).all()],
    }


app.include_router(workbench_router)
