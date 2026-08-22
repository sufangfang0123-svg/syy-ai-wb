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
from .workbench_service import PRIORITY_FORMULA, PRIORITY_POLICY_VERSION, calculate_priority, check_content_claims, compact_json, input_snapshot_hash, parse_feedback_csv, parse_json, recommendation_from_feedback, require_revision, stale_concept_dependents, validate_input_references, validate_project_refs


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
    invalidate_project(session, project, f"品类包由 {old} 切换为 {pack.id}")
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
    for key, value in changes.items(): setattr(entity, key, value)
    entity.revision += 1; entity.version += 1; entity.updated_at = utcnow()
    invalidate_project(session, project, "Opportunity经人工复核发生变化")
    audit(session, project.id, "opportunity", entity.id, "updated", ",".join(sorted(changes)), actor=payload.actor)
    commit(session); return entity


@router.post("/projects/{project_id}/concepts", response_model=ProductConceptRead, status_code=201)
def create_concept(project_id: str, payload: ProductConceptCreate, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    require_owned(session, Opportunity, payload.opportunity_id, project.id)
    validate_project_refs(session, project.id, payload.evidence_ids, payload.assumption_ids)
    entity = ProductConcept(project_id=project.id, **json_fields(payload.model_dump(), ("genes", "evidence_ids", "assumption_ids")))
    session.add(entity); session.flush()
    invalidate_project(session, project, "新增人工确认的产品概念候选")
    audit(session, project.id, "product_concept", entity.id, "created", entity.name, actor=payload.actor, data_nature=payload.data_nature)
    commit(session); return entity


@router.patch("/concepts/{concept_id}", response_model=ProductConceptRead)
def update_concept(concept_id: str, payload: ProductConceptUpdate, session: Session = Depends(get_session)):
    entity = session.get(ProductConcept, concept_id)
    if not entity: raise HTTPException(404, "ProductConcept不存在")
    project = require_project(session, entity.project_id); require_revision(entity, payload.revision)
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
        stale_concept_dependents(session, project, entity.id, "产品概念发生实质修改，下游情景、内容和未完成建议需复核", payload.actor)
    else:
        invalidate_project(session, project, "产品概念状态经人工更新")
    audit(session, project.id, "product_concept", entity.id, "updated", ",".join(sorted(changes)), actor=payload.actor)
    commit(session); return entity


@router.post("/projects/{project_id}/scenarios/generate", response_model=list[ScenarioRead], status_code=201)
def generate_scenarios(project_id: str, payload: ScenarioGenerate, session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    concept = require_owned(session, ProductConcept, payload.concept_id, project.id)
    require_owned(session, Opportunity, payload.opportunity_id, project.id)
    if payload.assumption_id: require_owned(session, Assumption, payload.assumption_id, project.id)
    validate_project_refs(session, project.id, payload.evidence_ids, [payload.assumption_id] if payload.assumption_id else [])
    existing = session.scalar(select(ScenarioCandidate).where(ScenarioCandidate.project_id == project.id, ScenarioCandidate.concept_id == concept.id, ScenarioCandidate.is_stale.is_(False)))
    if existing: raise HTTPException(409, "当前概念已有有效候选空间；请复核或在概念实质修改后重新生成")
    pack = session.get(CategoryPack, project.category_pack_id)
    config = parse_json(pack.config_json if pack else "{}", {})
    personas = list(config.get("personas", []))[:4]
    genes = list(config.get("gene_fields", []))[:5]
    channels = list(config.get("channel_templates", []))[:5]
    if len(personas) < 4 or len(genes) < 5 or len(channels) < 5:
        raise HTTPException(422, "当前Category Pack不能形成4×5×5候选空间")
    score, missing, rationale = calculate_priority(payload.priority_inputs)
    entities: list[ScenarioCandidate] = []
    for p_index, persona in enumerate(personas, 1):
        for g_index, gene in enumerate(genes, 1):
            for c_index, channel in enumerate(channels, 1):
                entity = ScenarioCandidate(project_id=project.id, opportunity_id=payload.opportunity_id, concept_id=concept.id, assumption_id=payload.assumption_id, evidence_ids_json=compact_json(payload.evidence_ids), persona=persona, product_gene=gene, channel=channel, scenario=f"{persona} × {gene} × {channel}", priority=score, priority_inputs_json=compact_json(payload.priority_inputs), priority_policy_version=PRIORITY_POLICY_VERSION if score is not None else None, missing_inputs_json=compact_json(missing), rationale=rationale, owner=payload.actor, actor=payload.actor, data_nature="real_entry")
                session.add(entity); entities.append(entity)
    session.flush()
    audit(session, project.id, "scenario_candidate", concept.id, "candidate_space_created", f"4×5×5=100；priority={'none' if score is None else score}", actor=payload.actor, metadata={"formula": PRIORITY_FORMULA, "missing_inputs": missing})
    commit(session); return entities


@router.patch("/scenarios/{scenario_id}", response_model=ScenarioRead)
def review_scenario(scenario_id: str, payload: ScenarioReview, session: Session = Depends(get_session)):
    entity = session.get(ScenarioCandidate, scenario_id)
    if not entity: raise HTTPException(404, "ScenarioCandidate不存在")
    require_revision(entity, payload.revision)
    entity.status = payload.status; entity.owner = payload.owner; entity.review_reason = payload.review_reason; entity.actor = payload.actor; entity.revision += 1; entity.version += 1; entity.updated_at = utcnow()
    audit(session, entity.project_id, "scenario_candidate", entity.id, "reviewed", f"{payload.status}: {payload.review_reason}", actor=payload.actor)
    commit(session); return entity


@router.post("/projects/{project_id}/content-assets", response_model=ContentAssetRead, status_code=201)
def create_content_asset(project_id: str, payload: ContentAssetCreate, session: Session = Depends(get_session)):
    project = require_project(session, project_id); concept = require_owned(session, ProductConcept, payload.concept_id, project.id)
    if payload.opportunity_id: require_owned(session, Opportunity, payload.opportunity_id, project.id)
    validate_project_refs(session, project.id, payload.evidence_ids, [])
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
    validate_project_refs(session, project.id, changes.get("evidence_ids") or [], [])
    changes = json_fields(changes, ("product_genes", "evidence_ids", "claim_refs"))
    for key, value in changes.items(): setattr(entity, key, value)
    pack = session.get(CategoryPack, project.category_pack_id); config = parse_json(pack.config_json if pack else "{}", {})
    evidence_ids = parse_json(entity.evidence_ids_json, [])
    entity.compliance_findings_json = compact_json(check_content_claims(entity.body, config.get("approved_claims", []), config.get("prohibited_terms", []), evidence_ids))
    entity.edited_snapshot = compact_json({"hook": entity.hook, "body": entity.body, "cta": entity.cta})
    entity.revision += 1; entity.version += 1; entity.updated_at = utcnow()
    audit(session, project.id, "content_asset", entity.id, "updated", ",".join(sorted(changes)), actor=payload.actor)
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
    return {"schema": AIProposalImport.model_json_schema(), "example": {"task_type": "opportunity", "input_entity_references": ["prj_x", "ev_x"], "input_snapshot_hash": "由 /projects/{id}/ai-proposals/snapshot 生成的64位哈希", "origin": "manual_ai_import", "provider": None, "model": None, "prompt_template_version": "manual_template_v1", "output_schema_version": "ai_proposal_v1", "candidates": [{"title": "待人工确认的机会", "description": "仅为候选", "evidence_ids": ["ev_x"], "contrary_evidence": [], "alternatives": [], "assumption_ids": [], "category_fit": "待确认"}], "reasons": ["候选解释"], "contrary_evidence": [], "uncertainty": ["尚未真人验证"], "missing_inputs": [], "limitations": ["导入包不是实时系统AI"], "actor": "负责人（人工自述）"}}


@router.get("/projects/{project_id}/ai-proposals/snapshot")
def proposal_snapshot(project_id: str, refs: list[str] = Query(...), session: Session = Depends(get_session)):
    require_project(session, project_id)
    return {"project_id": project_id, "refs": sorted(set(refs)), "input_snapshot_hash": input_snapshot_hash(session, project_id, refs)}


@router.post("/projects/{project_id}/ai-proposals/import", response_model=AIProposalRead, status_code=201)
def import_ai_proposal(project_id: str, payload: AIProposalImport, session: Session = Depends(get_session)):
    require_project(session, project_id); validate_input_references(session, project_id, payload.input_entity_references)
    expected = input_snapshot_hash(session, project_id, payload.input_entity_references)
    if payload.input_snapshot_hash != expected:
        raise HTTPException(409, {"message": "输入快照已变化，请重新导出引用哈希后再导入", "expected_snapshot_hash": expected})
    values = payload.model_dump(exclude={"proposal_id"})
    values = json_fields(values, ("input_entity_references", "candidates", "reasons", "contrary_evidence", "uncertainty", "missing_inputs", "limitations"))
    identity = {"id": payload.proposal_id} if payload.proposal_id else {}
    entity = AIProposal(**identity, project_id=project_id, input_refs_json=values.pop("input_entity_references_json"), **values)
    session.add(entity); session.flush()
    audit(session, project_id, "ai_proposal", entity.id, "imported", f"task={entity.task_type}; origin=manual_ai_import", actor=payload.actor, data_nature="ai_proposal", metadata={"provider_requests": 0, "input_snapshot_hash": expected})
    commit(session); return entity


@router.patch("/ai-proposals/{proposal_id}/review", response_model=AIProposalRead)
def review_ai_proposal(proposal_id: str, payload: AIProposalReview, session: Session = Depends(get_session)):
    proposal = session.get(AIProposal, proposal_id)
    if not proposal: raise HTTPException(404, "AIProposal不存在")
    require_revision(proposal, payload.revision)
    if proposal.status != "proposed" or proposal.is_stale: raise HTTPException(409, "AIProposal已处理或输入已stale")
    candidates = parse_json(proposal.candidates_json, [])
    if payload.candidate_index >= len(candidates): raise HTTPException(422, "候选序号超出范围")
    proposal.reviewer = payload.reviewer; proposal.review_reason = payload.review_reason; proposal.revision += 1; proposal.version += 1; proposal.updated_at = utcnow()
    if payload.decision == "rejected":
        proposal.status = "rejected"
        audit(session, proposal.project_id, "ai_proposal", proposal.id, "rejected", payload.review_reason, actor=payload.reviewer, data_nature="ai_proposal")
        commit(session); return proposal
    candidate = candidates[payload.candidate_index]; project = require_project(session, proposal.project_id)
    actor = payload.reviewer
    if proposal.task_type == "opportunity":
        evidence_ids = candidate.get("evidence_ids", []); assumption_ids = candidate.get("assumption_ids", []); contrary = candidate.get("contrary_evidence", [])
        validate_project_refs(session, project.id, evidence_ids + contrary, assumption_ids)
        accepted = Opportunity(project_id=project.id, title=candidate.get("title", "待命名机会"), description=candidate.get("description", "待人工补充"), evidence_ids_json=compact_json(evidence_ids), contrary_evidence_json=compact_json(contrary), alternatives_json=compact_json(candidate.get("alternatives", [])), assumption_ids_json=compact_json(assumption_ids), category_fit=candidate.get("category_fit", ""), source_proposal_id=proposal.id, human_reason=payload.review_reason, status="confirmed", actor=actor, data_nature="ai_proposal")
        entity_type = "opportunity"
    elif proposal.task_type == "product_concept":
        opportunity_id = candidate.get("opportunity_id"); require_owned(session, Opportunity, opportunity_id, project.id)
        evidence_ids = candidate.get("evidence_ids", []); assumption_ids = candidate.get("assumption_ids", []); validate_project_refs(session, project.id, evidence_ids, assumption_ids)
        accepted = ProductConcept(project_id=project.id, opportunity_id=opportunity_id, name=candidate.get("name", "待命名概念"), target_user=candidate.get("target_user", ""), scenario=candidate.get("scenario", ""), need=candidate.get("need", ""), genes_json=compact_json(candidate.get("genes", [])), material_hypothesis=candidate.get("material_hypothesis", ""), specification_hypothesis=candidate.get("specification_hypothesis", ""), price_hypothesis=candidate.get("price_hypothesis", ""), unique_variable=candidate.get("unique_variable", ""), evidence_ids_json=compact_json(evidence_ids), assumption_ids_json=compact_json(assumption_ids), supply_risk=candidate.get("supply_risk", ""), compliance_risk=candidate.get("compliance_risk", ""), source_proposal_id=proposal.id, selection_reason=payload.review_reason, status="candidate", actor=actor, data_nature="ai_proposal")
        entity_type = "product_concept"
    elif proposal.task_type == "change_proposal":
        accepted = ChangeProposal(project_id=project.id, target_entity_type=candidate.get("target_entity_type", "product_concept"), target_entity_id=candidate.get("target_entity_id", ""), source_proposal_id=proposal.id, feedback_ids_json=compact_json(candidate.get("feedback_ids", [])), proposed_patch_json=compact_json(candidate.get("proposed_patch", {})), rationale=candidate.get("rationale", payload.review_reason), contrary_evidence_json=compact_json(candidate.get("contrary_evidence", [])), actor=actor, data_nature="ai_proposal")
        entity_type = "change_proposal"
    else:
        raise HTTPException(422, "该任务类型的候选只能保留为建议；当前版本不支持直接生成正式对象")
    session.add(accepted); session.flush()
    proposal.status = "accepted"; proposal.accepted_entity_type = entity_type; proposal.accepted_entity_id = accepted.id
    invalidate_project(session, project, f"人工接受AIProposal并生成{entity_type}")
    audit(session, project.id, "ai_proposal", proposal.id, "accepted", payload.review_reason, actor=actor, data_nature="ai_proposal", metadata={"accepted_entity_type": entity_type, "accepted_entity_id": accepted.id, "candidate_index": payload.candidate_index})
    commit(session); return proposal


@router.post("/projects/{project_id}/feedback/import", status_code=201)
async def import_feedback(project_id: str, file: UploadFile = File(...), session: Session = Depends(get_session)):
    project = require_project(session, project_id)
    if not file.filename or not file.filename.lower().endswith(".csv"): raise HTTPException(422, "仅支持.csv反馈文件")
    rows = parse_feedback_csv(await file.read())
    batch_nature = rows[0]["data_nature"]
    existing_natures = set(session.scalars(select(FeedbackRecord.data_nature).where(FeedbackRecord.project_id == project.id)).all())
    if existing_natures and ({batch_nature} | existing_natures) & {"fixed_demo"} and ({batch_nature} | existing_natures) - {"fixed_demo"}:
        raise HTTPException(422, "禁止把固定模拟反馈与真实/人工导入反馈混合汇总")
    created: list[FeedbackRecord] = []
    for row in rows:
        content = require_owned(session, ContentAsset, row["content_asset_id"], project.id)
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
    require_owned(session, model, payload.target_entity_id, project_id)
    for feedback_id in payload.feedback_ids: require_owned(session, FeedbackRecord, feedback_id, project_id)
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
    patch = parse_json(entity.proposed_patch_json, {}); project = require_project(session, entity.project_id)
    if entity.target_entity_type == "product_concept":
        target = require_owned(session, ProductConcept, entity.target_entity_id, project.id)
        allowed = {"name", "target_user", "scenario", "need", "material_hypothesis", "specification_hypothesis", "price_hypothesis", "unique_variable", "supply_risk", "compliance_risk"}
        if not patch or not set(patch).issubset(allowed): raise HTTPException(422, "概念变更字段为空或超出允许范围")
        for key, value in patch.items(): setattr(target, key, str(value))
        target.revision += 1; target.version += 1; target.updated_at = utcnow(); stale_concept_dependents(session, project, target.id, f"人工接受ChangeProposal {entity.id}", payload.reviewer)
    else:
        target = require_owned(session, ContentAsset, entity.target_entity_id, project.id)
        allowed = {"hook", "body", "cta", "objective", "experiment_hypothesis"}
        if not patch or not set(patch).issubset(allowed): raise HTTPException(422, "内容变更字段为空或超出允许范围")
        for key, value in patch.items(): setattr(target, key, str(value))
        target.revision += 1; target.version += 1; target.updated_at = utcnow()
    entity.status = "accepted"; audit(session, entity.project_id, "change_proposal", entity.id, "accepted", payload.review_reason, actor=payload.reviewer, metadata={"target": entity.target_entity_id, "fields": sorted(patch)})
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
