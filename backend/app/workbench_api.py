from __future__ import annotations

import csv
import io
import json
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import get_session
from .models import Assumption, AuditEvent, Decision, Evidence, EvidenceAssumptionLink, EvidenceRelation, GateEvaluation, IterationRound, Project, ValidationResult, ValidationTest, utcnow
from .services import audit, invalidate_project
from .workbench_models import AIProposal, CategoryPack, ChangeProposal, ContentAsset, FeedbackRecord, Opportunity, ProductConcept, RecommendationPolicy, ScenarioCandidate
from .workbench_schemas import AIProposalImport, AIProposalRead, AIProposalReview, CategoryPackRead, CategoryPackSelect, ChangeProposalCreate, ChangeProposalRead, ChangeProposalReview, ContentAssetCreate, ContentAssetRead, ContentAssetUpdate, OpportunityCreate, OpportunityRead, OpportunityUpdate, ProductConceptCreate, ProductConceptRead, ProductConceptUpdate, RecommendationPolicyRead, RecommendationReview, ScenarioGenerate, ScenarioRead, ScenarioReview
from .workbench_service import SCENARIO_REQUIRED_INPUTS, check_content_claims, compact_json, input_snapshot_hash, parse_feedback_csv, parse_json, recommendation_from_feedback, require_revision, stale_concept_dependents, stale_opportunity_funnel, stale_project_scenario_funnel, validate_input_references, validate_project_refs


router = APIRouter(prefix="/api/v1", tags=["product-workbench"])


def require_project(session: Session, project_id: str) -> Project:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(404, "项目不存在")
    return project


def require_owned(session: Session, model: Any, entity_id: str, project_id: str):
    entity = session.get(model, entity_id)
    if entity is None or entity.project_id != project_id:
        raise HTTPException(404, "记录不存在或不属于当前项目")
    return entity


def require_active_owned(session: Session, model: Any, entity_id: str, project_id: str):
    entity = require_owned(session, model, entity_id, project_id)
    if getattr(entity, "is_stale", False):
        raise HTTPException(409, "上游记录已stale，必须重新确认后才能创建下游对象")
    if getattr(entity, "data_nature", "real_entry") in {"fixed_demo", "ai_proposal"}:
        raise HTTPException(422, "fixed_demo或未验收AI对象不能作为真实前向流程的上游")
    if model is ProductConcept:
        source_scenario = session.get(ScenarioCandidate, entity.source_scenario_id) if entity.source_scenario_id else None
        if (
            source_scenario is None
            or source_scenario.project_id != project_id
            or source_scenario.opportunity_id != entity.opportunity_id
            or source_scenario.concept_id != entity.id
            or source_scenario.is_stale
            or source_scenario.status not in {"shortlisted", "must_validate", "validation"}
            or not (source_scenario.shortlisted_by or "").strip()
            or not (source_scenario.shortlist_reason or "").strip()
            or not parse_json(source_scenario.shortlist_evidence_ids_json, [])
            or source_scenario.shortlisted_at is None
        ):
            raise HTTPException(409, "ProductConcept缺少有效的人工shortlist Scenario追溯")
    return entity


def require_allowed_feedback(session: Session, feedback_id: str, project_id: str) -> FeedbackRecord:
    feedback = require_owned(session, FeedbackRecord, feedback_id, project_id)
    if feedback.is_stale:
        raise HTTPException(409, "反馈记录已stale，不能驱动ChangeProposal")
    if feedback.data_nature not in {"real_entry", "manual_import"}:
        raise HTTPException(422, "ChangeProposal只能引用real_entry或manual_import反馈")
    return feedback


def stale_content_derived_records(
    session: Session,
    project: Project,
    content_id: str,
    reason: str,
    exclude_change_id: str | None = None,
) -> dict[str, list[str]]:
    """Invalidate records derived from an older material version of one content asset."""
    now = utcnow()
    feedback = session.scalars(select(FeedbackRecord).where(
        FeedbackRecord.project_id == project.id,
        FeedbackRecord.content_asset_id == content_id,
        FeedbackRecord.is_stale.is_(False),
    )).all()
    policies = session.scalars(select(RecommendationPolicy).where(
        RecommendationPolicy.project_id == project.id,
        RecommendationPolicy.is_stale.is_(False),
    )).all()
    change_query = select(ChangeProposal).where(
        ChangeProposal.project_id == project.id,
        ChangeProposal.target_entity_type == "content_asset",
        ChangeProposal.target_entity_id == content_id,
        ChangeProposal.status == "proposed",
        ChangeProposal.is_stale.is_(False),
    )
    if exclude_change_id:
        change_query = change_query.where(ChangeProposal.id != exclude_change_id)
    changes = session.scalars(change_query).all()
    for record in feedback:
        record.is_stale = True; record.stale_reason = reason; record.updated_at = now
    for policy in policies:
        policy.is_stale = True; policy.stale_reason = reason; policy.updated_at = now
    for change in changes:
        change.is_stale = True; change.stale_reason = reason; change.updated_at = now
    return {
        "stale_feedback_ids": [record.id for record in feedback],
        "stale_recommendation_policy_ids": [policy.id for policy in policies],
        "stale_change_proposal_ids": [change.id for change in changes],
    }


def require_candidate_refs_declared(
    task_type: str,
    candidates: list[dict[str, Any]],
    declared_refs: list[str],
    proposal_contrary_evidence: list[str] | None = None,
) -> None:
    """Keep every governed candidate reference inside the audited input snapshot."""
    governed_refs = set(proposal_contrary_evidence or [])
    scalar_fields = {"opportunity_id", "source_scenario_id", "target_entity_id"}
    list_fields = {"evidence_ids", "contrary_evidence", "assumption_ids", "feedback_ids"}
    for candidate in candidates:
        if not isinstance(candidate, dict):
            continue
        for field in scalar_fields:
            value = candidate.get(field)
            if isinstance(value, str) and value:
                governed_refs.add(value)
        for field in list_fields:
            values = candidate.get(field, [])
            if isinstance(values, list):
                governed_refs.update(value for value in values if isinstance(value, str) and value)
    missing = sorted(governed_refs - set(declared_refs))
    if missing:
        raise HTTPException(422, {
            "message": f"{task_type}候选引用必须全部包含在input_entity_references中，才能纳入输入快照",
            "undeclared_candidate_refs": missing,
        })


def validate_source_proposal(
    session: Session,
    proposal_id: str | None,
    project_id: str,
    data_nature: str,
    expected_entity_type: str,
) -> AIProposal | None:
    if not proposal_id:
        if data_nature == "manual_import":
            raise HTTPException(422, "manual_import正式对象必须携带同项目且已确认来源的source_proposal_id")
        return None
    proposal = require_owned(session, AIProposal, proposal_id, project_id)
    if proposal.is_stale:
        raise HTTPException(409, "source_proposal_id已stale，不能创建正式对象")
    if proposal.origin == "fixed_demo" or proposal.data_nature == "fixed_demo":
        raise HTTPException(422, "fixed_demo只能留在公开演示夹具，不能成为正式对象来源")
    if proposal.data_nature == "ai_proposal":
        raise HTTPException(422, "当前Provider关闭；禁止把未验收AI来源指认为正式对象来源")
    if proposal.status != "accepted":
        raise HTTPException(409, "source_proposal_id尚未完成人工接受，不能直接创建正式对象")
    if proposal.data_nature != data_nature:
        raise HTTPException(422, "source_proposal_id的数据性质与目标对象不一致")
    if data_nature == "manual_import" and (proposal.source_confirmed_at is None or not (proposal.source_description or "").strip()):
        raise HTTPException(422, "manual_import的source_proposal_id缺少持久化来源确认")
    expected_task = {
        "opportunity": "opportunity",
        "product_concept": "product_concept",
        "content_asset": "content_brief",
        "change_proposal": "change_proposal",
    }[expected_entity_type]
    if proposal.task_type != expected_task or proposal.accepted_entity_type != expected_entity_type:
        raise HTTPException(422, "source_proposal_id的task_type或accepted_entity_type与目标实体类型不匹配")
    if not proposal.accepted_entity_id:
        raise HTTPException(409, "source_proposal_id缺少已生成正式对象，不能复用")
    raise HTTPException(409, "已接受的AIProposal已经生成对应正式对象；direct create不得重复复用")


def require_shortlisted_scenario(
    session: Session,
    scenario_id: str,
    project_id: str,
    opportunity_id: str,
) -> ScenarioCandidate:
    scenario = require_active_owned(session, ScenarioCandidate, scenario_id, project_id)
    if scenario.opportunity_id != opportunity_id:
        raise HTTPException(422, "source_scenario_id与opportunity_id不属于同一条机会链")
    if scenario.status not in {"shortlisted", "validation"}:
        raise HTTPException(409, "只有经人工shortlist的ScenarioCandidate才能创建Concept")
    if not (
        (scenario.shortlisted_by or "").strip()
        and (scenario.shortlist_reason or "").strip()
        and parse_json(scenario.shortlist_evidence_ids_json, [])
        and scenario.shortlisted_at is not None
    ):
        raise HTTPException(409, "ScenarioCandidate缺少人工shortlist追溯，必须重新shortlist")
    if scenario.concept_id or session.scalar(select(ProductConcept.id).where(
        ProductConcept.project_id == project_id,
        ProductConcept.source_scenario_id == scenario.id,
        ProductConcept.is_stale.is_(False),
    )):
        raise HTTPException(409, "该人工shortlist ScenarioCandidate已经创建Concept")
    return scenario


def commit(session: Session) -> None:
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(409, "数据冲突或重复") from exc


def json_fields(payload: dict[str, Any], names: tuple[str, ...]) -> dict[str, Any]:
    mapped = dict(payload)
    for name in names:
        if name in mapped:
            mapped[f"{name}_json"] = compact_json(mapped.pop(name))
    return mapped


@router.get("/category-packs", response_model=list[CategoryPackRead])
def list_category_packs(session: Session = Depends(get_session)):
    return session.scalars(select(CategoryPack).order_by(CategoryPack.status, CategoryPack.name)).all()


@router.patch("/projects/{project_id}/category-pack")
def select_category_pack(project_id: str, payload: CategoryPackSelect, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    if project.revision != payload.revision:
        raise HTTPException(409, {"message": "项目已被修改，请刷新后重试", "current_revision": project.revision})
    pack = session.get(CategoryPack, payload.category_pack_id)
    if not pack or pack.status == "disabled":
        raise HTTPException(422, "品类包不存在或已停用")
    old = project.category_pack_id
    project.category_pack_id = pack.id
    if old != pack.id:
        stale_project_scenario_funnel(session, project, f"品类包由 {old} 切换为 {pack.id}；旧情景漏斗需重新生成", payload.actor)
    else:
        invalidate_project(session, project, f"品类包 {pack.id} 经人工重新确认")
    audit(session, project.id, "project", project.id, "category_pack_selected", f"{old} -> {pack.id}", actor=payload.actor, metadata={"old": old, "new": pack.id})
    commit(session)
    return {"project_id": project.id, "category_pack_id": pack.id, "revision": project.revision}


@router.get("/projects/{project_id}/workbench")
def workbench_bundle(project_id: str, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    pack = session.get(CategoryPack, project.category_pack_id)
    def rows(model):
        order_column = getattr(model, "created_at", getattr(model, "updated_at", getattr(model, "evaluated_at", model.id)))
        return session.scalars(select(model).where(model.project_id == project.id).order_by(order_column)).all()
    return {
        "project": project,
        "category_pack": pack,
        "evidence": rows(Evidence),
        "assumptions": rows(Assumption),
        "evidence_links": session.scalars(select(EvidenceAssumptionLink).join(Assumption).where(Assumption.project_id == project.id).order_by(EvidenceAssumptionLink.created_at)).all(),
        "evidence_relations": rows(EvidenceRelation),
        "validation_tests": rows(ValidationTest),
        "validation_results": rows(ValidationResult),
        "gates": rows(GateEvaluation),
        "decisions": rows(Decision),
        "rounds": rows(IterationRound),
        "opportunities": rows(Opportunity),
        "concepts": rows(ProductConcept),
        "scenarios": rows(ScenarioCandidate),
        "content_assets": rows(ContentAsset),
        "feedback_records": rows(FeedbackRecord),
        "ai_proposals": rows(AIProposal),
        "change_proposals": rows(ChangeProposal),
        "recommendation_policies": rows(RecommendationPolicy),
        "audit_events": session.scalars(select(AuditEvent).where(AuditEvent.project_id == project.id).order_by(AuditEvent.created_at.desc())).all(),
        "provider": {"status": "disabled", "requests": 0, "message": "本轮未配置或调用Provider；仅支持人工导入结构化AI建议包。"},
        "gate_rule_version": "NDG_GATE_V0.3.0",
    }


@router.post("/projects/{project_id}/opportunities", response_model=OpportunityRead, status_code=201)
def create_opportunity(project_id: str, payload: OpportunityCreate, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    validate_project_refs(session, project.id, payload.evidence_ids + payload.contrary_evidence, payload.assumption_ids)
    validate_source_proposal(session, payload.source_proposal_id, project.id, payload.data_nature, "opportunity")
    entity = Opportunity(project_id=project.id, **json_fields(payload.model_dump(), ("evidence_ids", "contrary_evidence", "alternatives", "assumption_ids")))
    session.add(entity); session.flush()
    invalidate_project(session, project, "新增并人工记录Opportunity")
    audit(session, project.id, "opportunity", entity.id, "created", entity.title, actor=payload.actor, data_nature=payload.data_nature)
    commit(session)
    return entity


@router.patch("/opportunities/{opportunity_id}", response_model=OpportunityRead)
def update_opportunity(opportunity_id: str, payload: OpportunityUpdate, session: Session = Depends(get_session)):
    entity = session.get(Opportunity, opportunity_id)
    if not entity: raise HTTPException(404, "Opportunity不存在")
    project = require_project(session, entity.project_id); require_revision(entity, payload.revision)
    changes = payload.model_dump(exclude={"revision", "actor"}, exclude_none=True)
    validate_project_refs(session, project.id, (changes.get("evidence_ids") or []) + (changes.get("contrary_evidence") or []), changes.get("assumption_ids") or [])
    changes = json_fields(changes, ("evidence_ids", "contrary_evidence", "alternatives", "assumption_ids"))
    material = any(key != "human_reason" for key in changes)
    for key, value in changes.items(): setattr(entity, key, value)
    entity.revision += 1; entity.version += 1; entity.updated_at = utcnow()
    if material:
        stale_opportunity_funnel(session, project, entity.id, "Opportunity发生实质变化；旧Scenario、Concept及下游对象需重新确认", payload.actor)
    else:
        invalidate_project(session, project, "Opportunity人工理由经更新")
    audit(session, project.id, "opportunity", entity.id, "updated", ",".join(sorted(changes)), actor=payload.actor)
    commit(session); return entity


@router.post("/projects/{project_id}/concepts", response_model=ProductConceptRead, status_code=201)
def create_concept(project_id: str, payload: ProductConceptCreate, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    require_active_owned(session, Opportunity, payload.opportunity_id, project.id)
    source_scenario = require_shortlisted_scenario(
        session, payload.source_scenario_id, project.id, payload.opportunity_id
    )
    validate_project_refs(session, project.id, payload.evidence_ids, payload.assumption_ids)
    validate_source_proposal(session, payload.source_proposal_id, project.id, payload.data_nature, "product_concept")
    entity = ProductConcept(project_id=project.id, **json_fields(payload.model_dump(), ("genes", "evidence_ids", "assumption_ids")))
    session.add(entity); session.flush(); source_scenario.concept_id = entity.id
    invalidate_project(session, project, "新增人工确认的产品概念候选")
    audit(session, project.id, "product_concept", entity.id, "created", entity.name, actor=payload.actor, data_nature=payload.data_nature, metadata={"source_scenario_id": source_scenario.id})
    commit(session); return entity


@router.patch("/concepts/{concept_id}", response_model=ProductConceptRead)
def update_concept(concept_id: str, payload: ProductConceptUpdate, session: Session = Depends(get_session)):
    entity = session.get(ProductConcept, concept_id)
    if not entity: raise HTTPException(404, "ProductConcept不存在")
    project = require_project(session, entity.project_id)
    entity = require_active_owned(session, ProductConcept, concept_id, project.id)
    require_revision(entity, payload.revision)
    changes = payload.model_dump(exclude={"revision", "actor"}, exclude_none=True)
    validate_project_refs(session, project.id, changes.get("evidence_ids") or [], changes.get("assumption_ids") or [])
    changes = json_fields(changes, ("genes", "evidence_ids", "assumption_ids"))
    material = any(key not in {"locked", "status", "selection_reason"} for key in changes)
    if changes.get("status") == "selected":
        for other in session.scalars(select(ProductConcept).where(ProductConcept.project_id == project.id, ProductConcept.id != entity.id, ProductConcept.status == "selected")).all():
            other.status = "candidate"; other.revision += 1; other.version += 1
    for key, value in changes.items(): setattr(entity, key, value)
    entity.revision += 1; entity.version += 1; entity.updated_at = utcnow()
    if material:
        stale_concept_dependents(session, project, entity.id, "产品概念发生实质修改，下游内容和未完成建议需复核", payload.actor)
    else:
        invalidate_project(session, project, "产品概念状态经人工更新")
    audit(session, project.id, "product_concept", entity.id, "updated", ",".join(sorted(changes)), actor=payload.actor)
    commit(session); return entity


@router.post("/projects/{project_id}/scenarios/generate", response_model=list[ScenarioRead], status_code=201)
def generate_scenarios(project_id: str, payload: ScenarioGenerate, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    opportunity = require_active_owned(session, Opportunity, payload.opportunity_id, project.id)
    if opportunity.status != "confirmed":
        raise HTTPException(409, "Opportunity必须先经人工确认，才能生成Scenario候选宇宙")
    if payload.assumption_id: require_owned(session, Assumption, payload.assumption_id, project.id)
    validate_project_refs(session, project.id, payload.evidence_ids, [payload.assumption_id] if payload.assumption_id else [])
    existing = session.scalar(select(ScenarioCandidate).where(ScenarioCandidate.project_id == project.id, ScenarioCandidate.opportunity_id == payload.opportunity_id, ScenarioCandidate.is_stale.is_(False)))
    if existing: raise HTTPException(409, "当前Opportunity已有有效候选宇宙；请先完成人工shortlist或使旧宇宙stale后再生成")
    pack = session.get(CategoryPack, project.category_pack_id)
    config = parse_json(pack.config_json if pack else "{}", {})
    personas = list(config.get("personas", []))[:4]
    genes = list(config.get("gene_fields", []))[:5]
    channels = list(config.get("channel_templates", []))[:5]
    if len(personas) < 4 or len(genes) < 5 or len(channels) < 5:
        raise HTTPException(422, "当前Category Pack不能形成4×5×5候选空间")
    missing = list(SCENARIO_REQUIRED_INPUTS)
    rationale = "当前候选宇宙没有情景级priority输入，因此保持未评分；不得用数组、创建或数据库顺序冒充优先级。"
    entities: list[ScenarioCandidate] = []
    for p_index, persona in enumerate(personas, 1):
        for g_index, gene in enumerate(genes, 1):
            for c_index, channel in enumerate(channels, 1):
                entity = ScenarioCandidate(project_id=project.id, opportunity_id=payload.opportunity_id, concept_id=None, assumption_id=payload.assumption_id, evidence_ids_json=compact_json(payload.evidence_ids), persona=persona, product_gene=gene, channel=channel, scenario=f"{persona} × {gene} × {channel}", priority=None, priority_inputs_json="{}", priority_policy_version=None, missing_inputs_json=compact_json(missing), rationale=rationale, owner=payload.actor, actor=payload.actor, data_nature="manual_hypothesis")
                session.add(entity); entities.append(entity)
    session.flush()
    audit(session, project.id, "scenario_candidate", payload.opportunity_id, "candidate_universe_created", "4×5×5=100；全部候选未评分，尚未形成人工shortlist", actor=payload.actor, data_nature="manual_hypothesis", metadata={"opportunity_id": payload.opportunity_id, "scored": False, "missing_inputs": missing, "ordering": "none", "legacy_concept_id_ignored": payload.concept_id})
    commit(session); return entities


@router.patch("/scenarios/{scenario_id}", response_model=ScenarioRead)
def review_scenario(scenario_id: str, payload: ScenarioReview, session: Session = Depends(get_session)):
    entity = session.get(ScenarioCandidate, scenario_id)
    if not entity: raise HTTPException(404, "ScenarioCandidate不存在")
    require_revision(entity, payload.revision)
    if entity.is_stale:
        raise HTTPException(409, "ScenarioCandidate已stale，不能进入当前shortlist或验证")
    allowed_transitions = {
        "candidate_space": {"shortlisted", "rejected"},
        "shortlisted": {"must_validate", "validation", "rejected"},
        "must_validate": {"validation", "rejected"},
        "validation": set(),
        "rejected": set(),
    }
    if payload.status not in allowed_transitions.get(entity.status, set()):
        raise HTTPException(409, f"ScenarioCandidate不允许从{entity.status}变为{payload.status}")
    if entity.concept_id and payload.status == "rejected":
        raise HTTPException(409, "已关联Concept的ScenarioCandidate不能直接淘汰；请先通过上游实质变更使整条链路stale")
    now = utcnow()
    audit_metadata: dict[str, Any] = {"from_status": entity.status, "to_status": payload.status}
    if payload.status == "shortlisted":
        if entity.status != "candidate_space":
            raise HTTPException(409, "只有未评分候选宇宙中的候选可由人工纳入shortlist")
        evidence_ids = payload.evidence_ids or []
        if not evidence_ids:
            raise HTTPException(422, "人工纳入shortlist必须引用至少一条当前项目Evidence")
        validate_project_refs(session, entity.project_id, evidence_ids, [])
        if any(require_owned(session, Evidence, evidence_id, entity.project_id).status != "confirmed" for evidence_id in evidence_ids):
            raise HTTPException(422, "人工纳入shortlist只能引用已确认Evidence")
        entity.evidence_ids_json = compact_json(evidence_ids)
        entity.shortlist_evidence_ids_json = compact_json(evidence_ids)
        entity.shortlisted_by = payload.actor
        entity.shortlist_reason = payload.review_reason
        entity.shortlisted_at = now
        audit_metadata.update({"evidence_ids": evidence_ids, "shortlisted_at": now.isoformat()})
    elif payload.status in {"must_validate", "validation"}:
        if entity.status not in {"shortlisted", "must_validate"}:
            raise HTTPException(409, "候选必须先经人工shortlist，才能进入验证")
        if not entity.concept_id:
            raise HTTPException(409, "人工shortlist后必须先创建Concept，才能进入验证")
        concept = require_active_owned(session, ProductConcept, entity.concept_id, entity.project_id)
        if concept.source_scenario_id != entity.id:
            raise HTTPException(409, "Concept与人工shortlist Scenario追溯不一致，不能进入验证")
        if concept.status != "selected" or not concept.locked or not (concept.selection_reason or "").strip():
            raise HTTPException(409, "Concept必须经人工selected、locked并记录选择理由，才能进入验证")
    elif payload.evidence_ids is not None:
        raise HTTPException(422, "evidence_ids只在人工纳入shortlist时更新")
    entity.status = payload.status; entity.owner = payload.owner; entity.review_reason = payload.review_reason; entity.actor = payload.actor; entity.revision += 1; entity.version += 1; entity.updated_at = now
    action = "shortlisted" if payload.status == "shortlisted" else "reviewed"
    audit(session, entity.project_id, "scenario_candidate", entity.id, action, f"{payload.status}: {payload.review_reason}", actor=payload.actor, data_nature="manual_hypothesis", metadata=audit_metadata)
    commit(session); return entity


@router.post("/projects/{project_id}/content-assets", response_model=ContentAssetRead, status_code=201)
def create_content_asset(project_id: str, payload: ContentAssetCreate, session: Session = Depends(get_session)):
    project = require_project(session, project_id); concept = require_active_owned(session, ProductConcept, payload.concept_id, project.id)
    if payload.opportunity_id:
        require_active_owned(session, Opportunity, payload.opportunity_id, project.id)
        if concept.opportunity_id != payload.opportunity_id:
            raise HTTPException(422, "ContentAsset的concept_id与opportunity_id不属于同一条机会链")
    validate_project_refs(session, project.id, payload.evidence_ids + payload.claim_refs, [])
    validate_source_proposal(session, payload.source_proposal_id, project.id, payload.data_nature, "content_asset")
    pack = session.get(CategoryPack, project.category_pack_id); config = parse_json(pack.config_json if pack else "{}", {})
    findings = check_content_claims(payload.body, config.get("approved_claims", []), config.get("prohibited_terms", []), payload.evidence_ids)
    values = json_fields(payload.model_dump(), ("product_genes", "evidence_ids", "claim_refs"))
    original = compact_json({key: values.get(key) for key in ("hook", "body", "cta")})
    entity = ContentAsset(project_id=project.id, compliance_findings_json=compact_json(findings), original_snapshot=original, edited_snapshot=original, **values)
    session.add(entity); session.flush()
    audit(session, project.id, "content_asset", entity.id, "created", f"{entity.channel} {entity.variant}", actor=payload.actor, data_nature=payload.data_nature, metadata={"claim_findings": len(findings), "concept_id": concept.id})
    commit(session); return entity


@router.patch("/content-assets/{content_id}", response_model=ContentAssetRead)
def update_content_asset(content_id: str, payload: ContentAssetUpdate, session: Session = Depends(get_session)):
    entity = session.get(ContentAsset, content_id)
    if not entity: raise HTTPException(404, "ContentAsset不存在")
    project = require_project(session, entity.project_id); require_revision(entity, payload.revision)
    changes = payload.model_dump(exclude={"revision", "actor"}, exclude_none=True)
    validate_project_refs(session, project.id, (changes.get("evidence_ids") or []) + (changes.get("claim_refs") or []), [])
    changes = json_fields(changes, ("product_genes", "evidence_ids", "claim_refs"))
    requested_fields = set(changes)
    governance_fields = {"reviewer", "review_reason"}
    review_status_change = changes.get("review_status")
    governance_without_approval = bool(governance_fields & requested_fields) and review_status_change != "approved"
    if governance_without_approval:
        # 审核身份与理由只能随一次明确的 approved 操作写入；单独修改不会保留 approved 状态。
        changes.pop("reviewer", None)
        changes.pop("review_reason", None)
    for key, value in changes.items(): setattr(entity, key, value)
    pack = session.get(CategoryPack, project.category_pack_id); config = parse_json(pack.config_json if pack else "{}", {})
    evidence_ids = parse_json(entity.evidence_ids_json, [])
    findings = check_content_claims(entity.body, config.get("approved_claims", []), config.get("prohibited_terms", []), evidence_ids)
    entity.compliance_findings_json = compact_json(findings)
    review_metadata: dict[str, Any] = {}
    material_fields = {"hook", "body", "cta", "target_user", "scenario", "objective", "experiment_hypothesis", "product_genes_json", "evidence_ids_json", "claim_refs_json", "visual_spec"}
    review_reset_reasons: list[str] = []
    reset_status_to_pending = False
    if material_fields & set(changes) and "review_status" not in changes:
        review_reset_reasons.append("material_content_changed")
        reset_status_to_pending = True
    if governance_without_approval:
        review_reset_reasons.append("review_governance_changed_without_approval")
        if review_status_change is None:
            reset_status_to_pending = True
    if review_status_change in {"pending", "changes", "rejected"}:
        review_reset_reasons.append(f"review_status_changed_to_{review_status_change}")
    if review_reset_reasons:
        if reset_status_to_pending:
            entity.review_status = "pending"
        entity.reviewer = ""
        entity.review_reason = ""
        entity.reviewed_at = None
        entity.review_findings_snapshot_json = "[]"
        review_metadata["review_reset"] = review_reset_reasons
    if changes.get("review_status") == "approved":
        if findings and (not (payload.reviewer or "").strip() or not (payload.review_reason or "").strip()):
            raise HTTPException(422, "存在声明检查findings时，人工强制通过必须填写审核人和非空理由")
        entity.reviewed_at = utcnow()
        entity.review_findings_snapshot_json = compact_json(findings)
        review_metadata = {
            "reviewer": entity.reviewer,
            "reviewed_at": entity.reviewed_at.isoformat(),
            "review_reason": entity.review_reason,
            "findings_snapshot": findings,
        }
    material_changes = material_fields & set(changes)
    if material_changes:
        stale_reason = f"ContentAsset {entity.id} 实质字段直接修改，旧反馈与推荐失效"
        review_metadata.update(stale_content_derived_records(session, project, entity.id, stale_reason))
        review_metadata["derived_records_stale_reason"] = stale_reason
    entity.edited_snapshot = compact_json({"hook": entity.hook, "body": entity.body, "cta": entity.cta})
    entity.revision += 1; entity.version += 1; entity.updated_at = utcnow()
    action = "approved_with_findings_override" if changes.get("review_status") == "approved" and findings else "updated"
    audit_actor = payload.reviewer if changes.get("review_status") == "approved" and payload.reviewer else payload.actor
    audit(session, project.id, "content_asset", entity.id, action, ",".join(sorted(requested_fields)), actor=audit_actor, metadata=review_metadata)
    commit(session); return entity


@router.get("/projects/{project_id}/content-assets/export")
def export_content_assets(project_id: str, format: str = Query("json", pattern="^(json|csv|markdown)$"), session: Session = Depends(get_session)):
    require_project(session, project_id)
    items = session.scalars(select(ContentAsset).where(ContentAsset.project_id == project_id).order_by(ContentAsset.channel, ContentAsset.variant)).all()
    rows = [{"id": x.id, "channel": x.channel, "variant": x.variant, "target_user": x.target_user, "scenario": x.scenario, "objective": x.objective, "experiment_hypothesis": x.experiment_hypothesis, "hook": x.hook, "body": x.body, "cta": x.cta, "review_status": x.review_status, "evidence_ids": parse_json(x.evidence_ids_json, []), "compliance_findings": parse_json(x.compliance_findings_json, []), "stale": x.is_stale} for x in items]
    if format == "json": return rows
    if format == "csv":
        output = io.StringIO(); writer = csv.DictWriter(output, fieldnames=["id","channel","variant","target_user","scenario","objective","experiment_hypothesis","hook","body","cta","review_status","stale"]); writer.writeheader(); writer.writerows([{key: row[key] for key in writer.fieldnames} for row in rows]); return Response(output.getvalue(), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": "attachment; filename=content-assets.csv"})
    markdown = "\n\n".join(f"## {row['channel']} · {row['variant']} · {row['id']}\n\n**目标人群**：{row['target_user']}\n\n**场景**：{row['scenario']}\n\n**Hook**：{row['hook']}\n\n{row['body']}\n\n**CTA**：{row['cta']}\n\n审核：{row['review_status']}；stale={row['stale']}" for row in rows)
    return Response(markdown, media_type="text/markdown; charset=utf-8", headers={"Content-Disposition": "attachment; filename=content-assets.md"})


@router.get("/ai-proposals/schema")
def ai_proposal_schema():
    return {"schema": AIProposalImport.model_json_schema(), "example": {"task_type": "opportunity", "input_entity_references": ["prj_x", "ev_x"], "input_snapshot_hash": "由 /projects/{id}/ai-proposals/snapshot 生成的64位哈希", "origin": "manual_ai_import", "submission_kind": "external_ai_output", "source_confirmed": True, "source_description": "用户自行取得并粘贴的外部候选；来源由用户自述", "provider": None, "model": None, "prompt_template_version": "manual_template_v1", "output_schema_version": "ai_proposal_v1", "candidates": [{"title": "待人工确认的机会", "description": "仅为候选", "evidence_ids": ["ev_x"], "contrary_evidence": [], "alternatives": [], "assumption_ids": [], "category_fit": "待确认"}], "reasons": ["候选解释"], "contrary_evidence": [], "uncertainty": ["尚未真人验证"], "missing_inputs": [], "limitations": ["导入包不是实时系统AI"], "actor": "负责人（人工自述）"}}


@router.get("/projects/{project_id}/ai-proposals/snapshot")
def proposal_snapshot(project_id: str, refs: list[str] = Query(...), session: Session = Depends(get_session)):
    require_project(session, project_id)
    return {"project_id": project_id, "refs": sorted(set(refs)), "input_snapshot_hash": input_snapshot_hash(session, project_id, refs)}


@router.post("/projects/{project_id}/ai-proposals/import", response_model=AIProposalRead, status_code=201)
def import_ai_proposal(project_id: str, payload: AIProposalImport, session: Session = Depends(get_session)):
    require_project(session, project_id)
    require_candidate_refs_declared(
        payload.task_type, payload.candidates, payload.input_entity_references, payload.contrary_evidence
    )
    validate_input_references(session, project_id, payload.input_entity_references)
    expected = input_snapshot_hash(session, project_id, payload.input_entity_references)
    if payload.input_snapshot_hash != expected:
        raise HTTPException(409, {"message": "输入快照已变化，请重新导出引用哈希后再导入", "expected_snapshot_hash": expected})
    data_nature = "manual_import" if payload.submission_kind == "external_ai_output" else "manual_hypothesis"
    values = payload.model_dump(exclude={"proposal_id", "submission_kind", "source_confirmed"})
    values = json_fields(values, ("input_entity_references", "candidates", "reasons", "contrary_evidence", "uncertainty", "missing_inputs", "limitations"))
    identity = {"id": payload.proposal_id} if payload.proposal_id else {}
    confirmed_at = utcnow()
    entity = AIProposal(**identity, project_id=project_id, input_refs_json=values.pop("input_entity_references_json"), data_nature=data_nature, source_confirmed_at=confirmed_at, **values)
    session.add(entity); session.flush()
    audit(session, project_id, "ai_proposal", entity.id, "imported", f"task={entity.task_type}; submission_kind={payload.submission_kind}", actor=payload.actor, data_nature=data_nature, metadata={"provider_requests": 0, "input_snapshot_hash": expected, "source_confirmed": True, "source_confirmed_at": confirmed_at.isoformat(), "source_description": payload.source_description, "submission_kind": payload.submission_kind})
    commit(session); return entity


@router.patch("/ai-proposals/{proposal_id}/review", response_model=AIProposalRead)
def review_ai_proposal(proposal_id: str, payload: AIProposalReview, session: Session = Depends(get_session)):
    proposal = session.get(AIProposal, proposal_id)
    if not proposal: raise HTTPException(404, "AIProposal不存在")
    require_revision(proposal, payload.revision)
    if proposal.status != "proposed" or proposal.is_stale: raise HTTPException(409, "AIProposal已处理或输入已stale")
    if payload.decision == "accepted" and (proposal.origin == "fixed_demo" or proposal.data_nature == "fixed_demo"):
        raise HTTPException(422, "fixed_demo候选禁止转为正式Opportunity、Concept或ChangeProposal")
    if payload.decision == "accepted" and (proposal.origin == "provider_optional" or proposal.data_nature == "ai_proposal"):
        raise HTTPException(422, "当前Provider已禁用且请求数为0；未验收Provider候选禁止转为正式对象")
    if payload.decision == "accepted" and proposal.origin == "manual_ai_import" and (
        proposal.source_confirmed_at is None or not (proposal.source_description or "").strip()
    ):
        raise HTTPException(422, "旧版人工导入候选缺少持久化来源确认，必须按新模板重新导入后才能接受")
    candidates = parse_json(proposal.candidates_json, [])
    if payload.candidate_index >= len(candidates): raise HTTPException(422, "候选序号超出范围")
    if payload.decision == "accepted":
        references = parse_json(proposal.input_refs_json, [])
        require_candidate_refs_declared(
            proposal.task_type,
            [candidates[payload.candidate_index]],
            references,
            parse_json(proposal.contrary_evidence_json, []),
        )
        try:
            current_snapshot = input_snapshot_hash(session, proposal.project_id, references)
        except HTTPException as exc:
            proposal.is_stale = True
            proposal.stale_reason = "导入后输入引用已失效，必须重新生成快照并导入"
            proposal.revision += 1; proposal.version += 1; proposal.updated_at = utcnow()
            audit(session, proposal.project_id, "ai_proposal", proposal.id, "input_stale", proposal.stale_reason, actor=payload.reviewer, data_nature=proposal.data_nature)
            commit(session)
            raise HTTPException(409, proposal.stale_reason) from exc
        if current_snapshot != proposal.input_snapshot_hash:
            proposal.is_stale = True
            proposal.stale_reason = "导入后输入快照已变化，必须重新导入候选"
            proposal.revision += 1; proposal.version += 1; proposal.updated_at = utcnow()
            audit(session, proposal.project_id, "ai_proposal", proposal.id, "input_stale", proposal.stale_reason, actor=payload.reviewer, data_nature=proposal.data_nature, metadata={"stored_snapshot": proposal.input_snapshot_hash, "current_snapshot": current_snapshot})
            commit(session)
            raise HTTPException(409, proposal.stale_reason)
    proposal.reviewer = payload.reviewer; proposal.review_reason = payload.review_reason; proposal.revision += 1; proposal.version += 1; proposal.updated_at = utcnow()
    if payload.decision == "rejected":
        proposal.status = "rejected"
        audit(session, proposal.project_id, "ai_proposal", proposal.id, "rejected", payload.review_reason, actor=payload.reviewer, data_nature=proposal.data_nature)
        commit(session); return proposal
    candidate = candidates[payload.candidate_index]; project = require_project(session, proposal.project_id)
    actor = payload.reviewer
    accepted_source_scenario: ScenarioCandidate | None = None
    if proposal.task_type == "opportunity":
        evidence_ids = candidate.get("evidence_ids", []); assumption_ids = candidate.get("assumption_ids", []); contrary = candidate.get("contrary_evidence", [])
        validate_project_refs(session, project.id, evidence_ids + contrary, assumption_ids)
        accepted = Opportunity(project_id=project.id, title=candidate.get("title", "待命名机会"), description=candidate.get("description", "待人工补充"), evidence_ids_json=compact_json(evidence_ids), contrary_evidence_json=compact_json(contrary), alternatives_json=compact_json(candidate.get("alternatives", [])), assumption_ids_json=compact_json(assumption_ids), category_fit=candidate.get("category_fit", ""), source_proposal_id=proposal.id, human_reason=payload.review_reason, status="confirmed", actor=actor, data_nature=proposal.data_nature)
        entity_type = "opportunity"
    elif proposal.task_type == "product_concept":
        opportunity_id = candidate.get("opportunity_id"); require_active_owned(session, Opportunity, opportunity_id, project.id)
        source_scenario_id = candidate.get("source_scenario_id", "")
        accepted_source_scenario = require_shortlisted_scenario(
            session, source_scenario_id, project.id, opportunity_id
        )
        evidence_ids = candidate.get("evidence_ids", []); assumption_ids = candidate.get("assumption_ids", []); validate_project_refs(session, project.id, evidence_ids, assumption_ids)
        accepted = ProductConcept(project_id=project.id, opportunity_id=opportunity_id, source_scenario_id=source_scenario_id, name=candidate.get("name", "待命名概念"), target_user=candidate.get("target_user", ""), scenario=candidate.get("scenario", ""), need=candidate.get("need", ""), genes_json=compact_json(candidate.get("genes", [])), material_hypothesis=candidate.get("material_hypothesis", ""), specification_hypothesis=candidate.get("specification_hypothesis", ""), price_hypothesis=candidate.get("price_hypothesis", ""), unique_variable=candidate.get("unique_variable", ""), evidence_ids_json=compact_json(evidence_ids), assumption_ids_json=compact_json(assumption_ids), supply_risk=candidate.get("supply_risk", ""), compliance_risk=candidate.get("compliance_risk", ""), source_proposal_id=proposal.id, selection_reason=payload.review_reason, status="candidate", actor=actor, data_nature=proposal.data_nature)
        entity_type = "product_concept"
    elif proposal.task_type == "change_proposal":
        target_entity_type = candidate.get("target_entity_type", "")
        if target_entity_type not in {"product_concept", "content_asset"}:
            raise HTTPException(422, "ChangeProposal目标类型无效")
        target_model = ProductConcept if target_entity_type == "product_concept" else ContentAsset
        target_entity_id = candidate.get("target_entity_id", "")
        require_active_owned(session, target_model, target_entity_id, project.id)
        feedback_ids = candidate.get("feedback_ids", [])
        for feedback_id in feedback_ids: require_allowed_feedback(session, feedback_id, project.id)
        contrary = candidate.get("contrary_evidence", [])
        validate_project_refs(session, project.id, contrary, [])
        accepted = ChangeProposal(project_id=project.id, target_entity_type=target_entity_type, target_entity_id=target_entity_id, source_proposal_id=proposal.id, feedback_ids_json=compact_json(feedback_ids), proposed_patch_json=compact_json(candidate.get("proposed_patch", {})), rationale=candidate.get("rationale", payload.review_reason), contrary_evidence_json=compact_json(contrary), actor=actor, data_nature=proposal.data_nature)
        entity_type = "change_proposal"
    else:
        raise HTTPException(422, "该任务类型的候选只能保留为建议；当前版本不支持直接生成正式对象")
    session.add(accepted); session.flush()
    if accepted_source_scenario is not None:
        accepted_source_scenario.concept_id = accepted.id
    proposal.status = "accepted"; proposal.accepted_entity_type = entity_type; proposal.accepted_entity_id = accepted.id
    invalidate_project(session, project, f"人工接受AIProposal并生成{entity_type}")
    audit(session, project.id, "ai_proposal", proposal.id, "accepted", payload.review_reason, actor=actor, data_nature=proposal.data_nature, metadata={"accepted_entity_type": entity_type, "accepted_entity_id": accepted.id, "candidate_index": payload.candidate_index, "provider_requests": 0})
    commit(session); return proposal


@router.post("/projects/{project_id}/feedback/import", status_code=201)
async def import_feedback(project_id: str, file: UploadFile = File(...), session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    if not file.filename or not file.filename.lower().endswith(".csv"): raise HTTPException(422, "仅支持.csv反馈文件")
    rows = parse_feedback_csv(await file.read())
    batch_nature = rows[0]["data_nature"]
    created: list[FeedbackRecord] = []
    for row in rows:
        content = require_active_owned(session, ContentAsset, row["content_asset_id"], project.id)
        if row.get("assumption_id"):
            require_owned(session, Assumption, row["assumption_id"], project.id)
        if content.channel != row["channel"]: raise HTTPException(422, {"message": "渠道与ContentAsset不一致", "line": row["line"]})
        if session.scalar(select(FeedbackRecord).where(FeedbackRecord.project_id == project.id, FeedbackRecord.import_fingerprint == row["import_fingerprint"])):
            raise HTTPException(409, {"message": "反馈记录已导入", "line": row["line"]})
        entity = FeedbackRecord(project_id=project.id, content_asset_id=content.id, concept_id=content.concept_id, assumption_id=row.get("assumption_id") or None, channel=row["channel"], window_start=row["window_start"], window_end=row["window_end"], source=row["source"], impressions=row["impressions"], clicks=row["clicks"], interactions=row["interactions"], saves=row["saves"], add_to_cart=row["add_to_cart"], conversions=row["conversions"], metric_definition=row["metric_definition"], owner=row["owner"], notes=row.get("notes", ""), import_fingerprint=row["import_fingerprint"], actor=row["owner"], data_nature=batch_nature)
        session.add(entity); created.append(entity)
    session.flush(); audit(session, project.id, "feedback_record", project.id, "csv_imported", f"{len(created)} rows; data_nature={batch_nature}", actor=rows[0]["owner"], data_nature=batch_nature)
    commit(session); return {"created": len(created), "ids": [item.id for item in created], "data_nature": batch_nature}


@router.post("/projects/{project_id}/change-proposals", response_model=ChangeProposalRead, status_code=201)
def create_change_proposal(project_id: str, payload: ChangeProposalCreate, session: Session = Depends(get_session)):
    require_project(session, project_id)
    model = ProductConcept if payload.target_entity_type == "product_concept" else ContentAsset
    require_active_owned(session, model, payload.target_entity_id, project_id)
    for feedback_id in payload.feedback_ids: require_allowed_feedback(session, feedback_id, project_id)
    validate_project_refs(session, project_id, payload.contrary_evidence, [])
    validate_source_proposal(session, payload.source_proposal_id, project_id, payload.data_nature, "change_proposal")
    entity = ChangeProposal(project_id=project_id, target_entity_type=payload.target_entity_type, target_entity_id=payload.target_entity_id, source_proposal_id=payload.source_proposal_id, feedback_ids_json=compact_json(payload.feedback_ids), proposed_patch_json=compact_json(payload.proposed_patch), rationale=payload.rationale, contrary_evidence_json=compact_json(payload.contrary_evidence), actor=payload.actor, data_nature=payload.data_nature)
    session.add(entity); session.flush(); audit(session, project_id, "change_proposal", entity.id, "created", payload.rationale, actor=payload.actor, data_nature=payload.data_nature); commit(session); return entity


@router.patch("/change-proposals/{change_id}/review", response_model=ChangeProposalRead)
def review_change_proposal(change_id: str, payload: ChangeProposalReview, session: Session = Depends(get_session)):
    entity = session.get(ChangeProposal, change_id)
    if not entity: raise HTTPException(404, "ChangeProposal不存在")
    require_revision(entity, payload.revision)
    if entity.status != "proposed" or entity.is_stale: raise HTTPException(409, "ChangeProposal已处理或stale")
    entity.reviewer = payload.reviewer; entity.review_reason = payload.review_reason; entity.revision += 1; entity.version += 1; entity.updated_at = utcnow()
    if payload.decision == "rejected":
        entity.status = "rejected"; audit(session, entity.project_id, "change_proposal", entity.id, "rejected", payload.review_reason, actor=payload.reviewer); commit(session); return entity
    if entity.data_nature in {"fixed_demo", "ai_proposal"}:
        raise HTTPException(422, "fixed_demo或未验收AI ChangeProposal禁止接受")
    for feedback_id in parse_json(entity.feedback_ids_json, []):
        require_allowed_feedback(session, feedback_id, entity.project_id)
    patch = parse_json(entity.proposed_patch_json, {}); project = require_project(session, entity.project_id)
    if entity.target_entity_type == "product_concept":
        target = require_active_owned(session, ProductConcept, entity.target_entity_id, project.id)
        allowed = {"name", "target_user", "scenario", "need", "material_hypothesis", "specification_hypothesis", "price_hypothesis", "unique_variable", "supply_risk", "compliance_risk"}
        if not patch or not set(patch).issubset(allowed): raise HTTPException(422, "概念变更字段为空或超出允许范围")
        for key, value in patch.items(): setattr(target, key, str(value))
        target.revision += 1; target.version += 1; target.updated_at = utcnow(); stale_concept_dependents(session, project, target.id, f"人工接受ChangeProposal {entity.id}", payload.reviewer)
    else:
        target = require_active_owned(session, ContentAsset, entity.target_entity_id, project.id)
        allowed = {"hook", "body", "cta", "objective", "experiment_hypothesis"}
        if not patch or not set(patch).issubset(allowed): raise HTTPException(422, "内容变更字段为空或超出允许范围")
        for key, value in patch.items(): setattr(target, key, str(value))
        pack = session.get(CategoryPack, project.category_pack_id)
        config = parse_json(pack.config_json if pack else "{}", {})
        findings = check_content_claims(
            target.body,
            config.get("approved_claims", []),
            config.get("prohibited_terms", []),
            parse_json(target.evidence_ids_json, []),
        )
        target.compliance_findings_json = compact_json(findings)
        target.review_status = "pending"
        target.reviewer = ""
        target.review_reason = ""
        target.reviewed_at = None
        target.review_findings_snapshot_json = "[]"
        target.edited_snapshot = compact_json({"hook": target.hook, "body": target.body, "cta": target.cta})
        target.revision += 1; target.version += 1; target.updated_at = utcnow()
        stale_reason = f"ContentAsset由ChangeProposal {entity.id} 实质变更，旧反馈与推荐失效"
        content_change_metadata = {
            "change_proposal_id": entity.id,
            "fields": sorted(patch),
            "review_reset": True,
            "new_findings": findings,
            **stale_content_derived_records(session, project, target.id, stale_reason, exclude_change_id=entity.id),
        }
        audit(
            session,
            project.id,
            "content_asset",
            target.id,
            "change_proposal_applied",
            f"内容实质变更；审核重置为pending；findings={len(findings)}",
            actor=payload.reviewer,
            data_nature=target.data_nature,
            metadata=content_change_metadata,
        )
    entity.status = "accepted"
    accepted_metadata: dict[str, Any] = {"target": entity.target_entity_id, "fields": sorted(patch)}
    if entity.target_entity_type == "content_asset":
        accepted_metadata.update(content_change_metadata)
    audit(session, entity.project_id, "change_proposal", entity.id, "accepted", payload.review_reason, actor=payload.reviewer, metadata=accepted_metadata)
    commit(session); return entity


@router.post("/projects/{project_id}/recommendation-policies", response_model=RecommendationPolicyRead, status_code=201)
def create_recommendation_policy(project_id: str, actor: str = Query(..., min_length=2, max_length=160), session: Session = Depends(get_session)):
    project = require_project(session, project_id); entity = recommendation_from_feedback(session, project, actor); commit(session); return entity


@router.patch("/recommendation-policies/{policy_id}/review", response_model=RecommendationPolicyRead)
def review_recommendation_policy(policy_id: str, payload: RecommendationReview, session: Session = Depends(get_session)):
    entity = session.get(RecommendationPolicy, policy_id)
    if not entity: raise HTTPException(404, "RecommendationPolicy不存在")
    require_revision(entity, payload.revision)
    if entity.status != "proposed" or entity.is_stale: raise HTTPException(409, "策略已处理或stale")
    entity.status = payload.decision; entity.reviewer = payload.reviewer; entity.review_reason = payload.review_reason; entity.revision += 1; entity.version += 1; entity.updated_at = utcnow()
    audit(session, entity.project_id, "recommendation_policy", entity.id, payload.decision, payload.review_reason, actor=payload.reviewer)
    commit(session); return entity
