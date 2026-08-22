from __future__ import annotations

import csv
import hashlib
import io
import json
from datetime import datetime
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from .models import Assumption, Evidence, Project, utcnow
from .services import audit, invalidate_project
from .workbench_models import AIProposal, ChangeProposal, ContentAsset, FeedbackRecord, Opportunity, ProductConcept, RecommendationPolicy, ScenarioCandidate


PRIORITY_INPUTS = (
    "evidence_fit", "error_cost", "uncertainty_gap", "execution",
    "category_fit", "channel_fit", "compliance_safety", "contrary_evidence_safety",
)
PRIORITY_POLICY_VERSION = "WOVEN_SCENARIO_PRIORITY_V1"
PRIORITY_FORMULA = "0.18*Evidence适配 + 0.16*错误代价 + 0.16*不确定性缺口 + 0.14*验证可执行性 + 0.12*品类适配 + 0.10*渠道适配 + 0.08*声明安全 + 0.06*反证安全"
PRIORITY_WEIGHTS = (0.18, 0.16, 0.16, 0.14, 0.12, 0.10, 0.08, 0.06)


def compact_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def parse_json(value: str, default: Any) -> Any:
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return default


def require_revision(entity: Any, revision: int) -> None:
    if entity.revision != revision:
        raise HTTPException(409, {"message": "记录已被修改，请刷新后重试", "current_revision": entity.revision})


def validate_project_refs(session: Session, project_id: str, evidence_ids: list[str], assumption_ids: list[str]) -> None:
    if evidence_ids:
        found = set(session.scalars(select(Evidence.id).where(Evidence.project_id == project_id, Evidence.id.in_(evidence_ids))).all())
        missing = sorted(set(evidence_ids) - found)
        if missing:
            raise HTTPException(422, {"message": "Evidence引用不存在或不属于当前项目", "missing": missing})
    if assumption_ids:
        found = set(session.scalars(select(Assumption.id).where(Assumption.project_id == project_id, Assumption.id.in_(assumption_ids))).all())
        missing = sorted(set(assumption_ids) - found)
        if missing:
            raise HTTPException(422, {"message": "Assumption引用不存在或不属于当前项目", "missing": missing})


def validate_input_references(session: Session, project_id: str, references: list[str]) -> None:
    missing: list[str] = []
    blocked: list[str] = []
    governed_models = (Opportunity, ProductConcept, ScenarioCandidate, ContentAsset, FeedbackRecord)
    for reference in sorted(set(references)):
        if reference == project_id:
            continue
        evidence = session.get(Evidence, reference)
        if evidence is not None and evidence.project_id == project_id:
            if evidence.status != "confirmed":
                blocked.append(reference)
            continue
        assumption = session.get(Assumption, reference)
        if assumption is not None and assumption.project_id == project_id:
            continue
        matched = False
        for model in governed_models:
            entity = session.get(model, reference)
            if entity is None or entity.project_id != project_id:
                continue
            matched = True
            if entity.is_stale or entity.data_nature in {"fixed_demo", "ai_proposal"}:
                blocked.append(reference)
            break
        if not matched:
            missing.append(reference)
    if missing:
        raise HTTPException(422, {"message": "AI建议包包含未知或跨项目引用", "missing": missing})
    if blocked:
        raise HTTPException(422, {"message": "AI建议包只能引用已确认、未失效且非fixed_demo/ai_proposal的输入", "blocked": blocked})


def input_snapshot_hash(session: Session, project_id: str, references: list[str]) -> str:
    validate_input_references(session, project_id, references)
    records: list[dict[str, Any]] = []
    model_names = (
        (Evidence, "evidence"), (Assumption, "assumption"), (Opportunity, "opportunity"),
        (ProductConcept, "product_concept"), (ScenarioCandidate, "scenario"),
        (ContentAsset, "content_asset"), (FeedbackRecord, "feedback"),
    )
    for ref in sorted(set(references)):
        if ref == project_id:
            project = session.get(Project, project_id)
            records.append({"id": ref, "type": "project", "revision": project.revision if project else None, "updated_at": str(project.updated_at) if project else None})
            continue
        for model, label in model_names:
            entity = session.get(model, ref)
            if entity is not None and entity.project_id == project_id:
                records.append({"id": ref, "type": label, "revision": getattr(entity, "revision", None), "version": getattr(entity, "version", None), "updated_at": str(getattr(entity, "updated_at", "")), "content_hash": getattr(entity, "content_hash", None)})
                break
    return hashlib.sha256(compact_json(records).encode("utf-8")).hexdigest()


def _reference_ids(value: str) -> set[str]:
    parsed = parse_json(value, [])
    if not isinstance(parsed, list):
        return set()
    return {item for item in parsed if isinstance(item, str)}


def stale_evidence_dependents(
    session: Session,
    project: Project,
    evidence_id: str,
    *,
    trigger: str,
    actor: str = "self-declared",
) -> dict[str, Any]:
    """Invalidate the exact project-local dependency closure for an Evidence change.

    References are decoded as JSON arrays. Substring/LIKE matching is deliberately
    avoided so an Evidence ID cannot invalidate a similarly named, unrelated ID.
    This function owns the single project revision increment for the transition.
    """
    opportunities = {
        entity.id: entity
        for entity in session.scalars(select(Opportunity).where(Opportunity.project_id == project.id)).all()
    }
    scenarios = {
        entity.id: entity
        for entity in session.scalars(select(ScenarioCandidate).where(ScenarioCandidate.project_id == project.id)).all()
    }
    concepts = {
        entity.id: entity
        for entity in session.scalars(select(ProductConcept).where(ProductConcept.project_id == project.id)).all()
    }
    contents = {
        entity.id: entity
        for entity in session.scalars(select(ContentAsset).where(ContentAsset.project_id == project.id)).all()
    }
    feedback = {
        entity.id: entity
        for entity in session.scalars(select(FeedbackRecord).where(FeedbackRecord.project_id == project.id)).all()
    }
    proposals = {
        entity.id: entity
        for entity in session.scalars(select(AIProposal).where(AIProposal.project_id == project.id)).all()
    }
    changes = {
        entity.id: entity
        for entity in session.scalars(select(ChangeProposal).where(ChangeProposal.project_id == project.id)).all()
    }
    policies = {
        entity.id: entity
        for entity in session.scalars(select(RecommendationPolicy).where(RecommendationPolicy.project_id == project.id)).all()
    }

    affected_ai = {
        entity.id for entity in proposals.values()
        if evidence_id in _reference_ids(entity.input_refs_json)
    }
    affected_opportunities = {
        entity.id for entity in opportunities.values()
        if evidence_id in (_reference_ids(entity.evidence_ids_json) | _reference_ids(entity.contrary_evidence_json))
    }
    affected_scenarios = {
        entity.id for entity in scenarios.values()
        if evidence_id in (
            _reference_ids(entity.evidence_ids_json)
            | _reference_ids(entity.contrary_evidence_json)
            | _reference_ids(entity.shortlist_evidence_ids_json)
        )
    }
    affected_concepts = {
        entity.id for entity in concepts.values()
        if evidence_id in _reference_ids(entity.evidence_ids_json)
    }
    affected_contents = {
        entity.id for entity in contents.values()
        if evidence_id in (_reference_ids(entity.evidence_ids_json) | _reference_ids(entity.claim_refs_json))
    }
    affected_feedback: set[str] = set()
    affected_changes = {
        entity.id for entity in changes.values()
        if evidence_id in _reference_ids(entity.contrary_evidence_json)
    }

    # Resolve both explicit references and structural descendants to a fixed point.
    # This also covers accepted AI proposals whose formal entity has already been
    # created, without deleting their review history.
    while True:
        before = (
            len(affected_ai), len(affected_opportunities), len(affected_scenarios),
            len(affected_concepts), len(affected_contents), len(affected_feedback),
            len(affected_changes),
        )

        impacted_refs = {
            evidence_id,
            *affected_opportunities,
            *affected_scenarios,
            *affected_concepts,
            *affected_contents,
            *affected_feedback,
            *affected_changes,
        }
        affected_ai.update(
            entity.id for entity in proposals.values()
            if _reference_ids(entity.input_refs_json) & impacted_refs
        )

        for proposal_id in tuple(affected_ai):
            proposal = proposals.get(proposal_id)
            if proposal is None:
                continue
            if proposal.accepted_entity_type == "opportunity" and proposal.accepted_entity_id in opportunities:
                affected_opportunities.add(proposal.accepted_entity_id)
            elif proposal.accepted_entity_type == "product_concept" and proposal.accepted_entity_id in concepts:
                affected_concepts.add(proposal.accepted_entity_id)
            elif proposal.accepted_entity_type == "content_asset" and proposal.accepted_entity_id in contents:
                affected_contents.add(proposal.accepted_entity_id)
            elif proposal.accepted_entity_type == "change_proposal" and proposal.accepted_entity_id in changes:
                affected_changes.add(proposal.accepted_entity_id)

            affected_opportunities.update(
                entity.id for entity in opportunities.values() if entity.source_proposal_id == proposal_id
            )
            affected_concepts.update(
                entity.id for entity in concepts.values() if entity.source_proposal_id == proposal_id
            )
            affected_contents.update(
                entity.id for entity in contents.values() if entity.source_proposal_id == proposal_id
            )
            affected_changes.update(
                entity.id for entity in changes.values() if entity.source_proposal_id == proposal_id
            )

        affected_scenarios.update(
            entity.id for entity in scenarios.values()
            if entity.opportunity_id in affected_opportunities
        )
        affected_concepts.update(
            entity.id for entity in concepts.values()
            if entity.opportunity_id in affected_opportunities or entity.source_scenario_id in affected_scenarios
        )
        affected_scenarios.update(
            entity.id for entity in scenarios.values()
            if entity.concept_id in affected_concepts
        )
        affected_contents.update(
            entity.id for entity in contents.values()
            if entity.opportunity_id in affected_opportunities or entity.concept_id in affected_concepts
        )
        affected_feedback.update(
            entity.id for entity in feedback.values()
            if entity.concept_id in affected_concepts or entity.content_asset_id in affected_contents
        )
        affected_changes.update(
            entity.id for entity in changes.values()
            if entity.target_entity_id in (affected_concepts | affected_contents)
            or bool(_reference_ids(entity.feedback_ids_json) & affected_feedback)
        )
        for change_id in tuple(affected_changes):
            change = changes.get(change_id)
            if change is None or change.status != "accepted":
                continue
            if change.target_entity_type == "product_concept" and change.target_entity_id in concepts:
                affected_concepts.add(change.target_entity_id)
            elif change.target_entity_type == "content_asset" and change.target_entity_id in contents:
                affected_contents.add(change.target_entity_id)

        after = (
            len(affected_ai), len(affected_opportunities), len(affected_scenarios),
            len(affected_concepts), len(affected_contents), len(affected_feedback),
            len(affected_changes),
        )
        if after == before:
            break

    reason = (
        f"Evidence {evidence_id} 已取消确认（trigger={trigger}）；"
        "引用该Evidence的下游对象必须重新人工确认或重新创建。"
    )

    def mark_stale(entities: dict[str, Any], ids: set[str]) -> list[str]:
        changed: list[str] = []
        for entity_id in sorted(ids):
            entity = entities.get(entity_id)
            if entity is None or entity.is_stale:
                continue
            entity.is_stale = True
            entity.stale_reason = reason
            entity.updated_at = utcnow()
            changed.append(entity_id)
        return changed

    metadata: dict[str, Any] = {
        "evidence_id": evidence_id,
        "trigger": trigger,
        "stale_ai_proposal_ids": mark_stale(proposals, affected_ai),
        "stale_opportunity_ids": mark_stale(opportunities, affected_opportunities),
        "stale_scenario_ids": mark_stale(scenarios, affected_scenarios),
        "stale_concept_ids": mark_stale(concepts, affected_concepts),
        "stale_content_ids": mark_stale(contents, affected_contents),
        "stale_feedback_ids": mark_stale(feedback, affected_feedback),
        "stale_change_proposal_ids": mark_stale(changes, affected_changes),
        "stale_recommendation_policy_ids": [],
    }
    if affected_feedback:
        metadata["stale_recommendation_policy_ids"] = mark_stale(policies, set(policies))

    invalidate_project(session, project, reason)
    audit(
        session,
        project.id,
        "evidence",
        evidence_id,
        "dependents_stale",
        reason,
        actor=actor,
        metadata=metadata,
    )
    return metadata


def stale_concept_dependents(session: Session, project: Project, concept_id: str, reason: str, actor: str) -> None:
    content_ids = list(session.scalars(select(ContentAsset.id).where(
        ContentAsset.project_id == project.id,
        ContentAsset.concept_id == concept_id,
        ContentAsset.is_stale.is_(False),
    )).all())
    feedback_ids = list(session.scalars(select(FeedbackRecord.id).where(
        FeedbackRecord.project_id == project.id,
        FeedbackRecord.is_stale.is_(False),
        (FeedbackRecord.concept_id == concept_id) | (FeedbackRecord.content_asset_id.in_(content_ids)),
    )).all())
    if content_ids:
        session.execute(update(ContentAsset).where(ContentAsset.id.in_(content_ids)).values(
            is_stale=True, stale_reason=reason, updated_at=utcnow()
        ))
    if feedback_ids:
        session.execute(update(FeedbackRecord).where(FeedbackRecord.id.in_(feedback_ids)).values(
            is_stale=True, stale_reason=reason, updated_at=utcnow()
        ))
    affected_targets = [concept_id, *content_ids]
    session.execute(update(ChangeProposal).where(
        ChangeProposal.project_id == project.id,
        ChangeProposal.target_entity_id.in_(affected_targets),
        ChangeProposal.status == "proposed",
        ChangeProposal.is_stale.is_(False),
    ).values(is_stale=True, stale_reason=reason, updated_at=utcnow()))
    session.execute(update(AIProposal).where(AIProposal.project_id == project.id, AIProposal.status == "proposed", AIProposal.is_stale.is_(False)).values(is_stale=True, stale_reason=reason, updated_at=utcnow()))
    session.execute(update(RecommendationPolicy).where(
        RecommendationPolicy.project_id == project.id,
        RecommendationPolicy.is_stale.is_(False),
    ).values(is_stale=True, stale_reason=reason, updated_at=utcnow()))
    invalidate_project(session, project, reason)
    audit(session, project.id, "product_concept", concept_id, "dependents_stale", reason, actor=actor, metadata={"concept_id": concept_id})


def stale_opportunity_funnel(session: Session, project: Project, opportunity_id: str, reason: str, actor: str) -> None:
    concept_ids = list(session.scalars(select(ProductConcept.id).where(
        ProductConcept.project_id == project.id,
        ProductConcept.opportunity_id == opportunity_id,
        ProductConcept.is_stale.is_(False),
    )).all())
    content_ids = list(session.scalars(select(ContentAsset.id).where(
        ContentAsset.project_id == project.id,
        ContentAsset.is_stale.is_(False),
        (ContentAsset.opportunity_id == opportunity_id) | (ContentAsset.concept_id.in_(concept_ids)),
    )).all())
    feedback_ids = list(session.scalars(select(FeedbackRecord.id).where(
        FeedbackRecord.project_id == project.id,
        FeedbackRecord.is_stale.is_(False),
        (FeedbackRecord.content_asset_id.in_(content_ids)) | (FeedbackRecord.concept_id.in_(concept_ids)),
    )).all())
    session.execute(update(ScenarioCandidate).where(
        ScenarioCandidate.project_id == project.id,
        ScenarioCandidate.opportunity_id == opportunity_id,
        ScenarioCandidate.is_stale.is_(False),
    ).values(is_stale=True, stale_reason=reason, updated_at=utcnow()))
    if concept_ids:
        session.execute(update(ProductConcept).where(ProductConcept.id.in_(concept_ids)).values(
            is_stale=True, stale_reason=reason, updated_at=utcnow()
        ))
    if content_ids:
        session.execute(update(ContentAsset).where(ContentAsset.id.in_(content_ids)).values(
            is_stale=True, stale_reason=reason, updated_at=utcnow()
        ))
    if feedback_ids:
        session.execute(update(FeedbackRecord).where(FeedbackRecord.id.in_(feedback_ids)).values(
            is_stale=True, stale_reason=reason, updated_at=utcnow()
        ))
    session.execute(update(RecommendationPolicy).where(
        RecommendationPolicy.project_id == project.id,
        RecommendationPolicy.is_stale.is_(False),
    ).values(is_stale=True, stale_reason=reason, updated_at=utcnow()))
    affected_targets = [*concept_ids, *content_ids]
    if affected_targets:
        session.execute(update(ChangeProposal).where(
            ChangeProposal.project_id == project.id,
            ChangeProposal.target_entity_id.in_(affected_targets),
            ChangeProposal.status == "proposed",
            ChangeProposal.is_stale.is_(False),
        ).values(is_stale=True, stale_reason=reason, updated_at=utcnow()))
    session.execute(update(AIProposal).where(
        AIProposal.project_id == project.id,
        AIProposal.status == "proposed",
        AIProposal.is_stale.is_(False),
    ).values(is_stale=True, stale_reason=reason, updated_at=utcnow()))
    invalidate_project(session, project, reason)
    audit(session, project.id, "opportunity", opportunity_id, "funnel_stale", reason, actor=actor, metadata={"opportunity_id": opportunity_id})


def stale_project_scenario_funnel(session: Session, project: Project, reason: str, actor: str) -> None:
    for model in (ScenarioCandidate, ProductConcept, ContentAsset, FeedbackRecord, RecommendationPolicy):
        session.execute(update(model).where(model.project_id == project.id, model.is_stale.is_(False)).values(
            is_stale=True, stale_reason=reason, updated_at=utcnow()
        ))
    session.execute(update(ChangeProposal).where(
        ChangeProposal.project_id == project.id,
        ChangeProposal.status == "proposed",
        ChangeProposal.is_stale.is_(False),
    ).values(is_stale=True, stale_reason=reason, updated_at=utcnow()))
    session.execute(update(AIProposal).where(
        AIProposal.project_id == project.id,
        AIProposal.status == "proposed",
        AIProposal.is_stale.is_(False),
    ).values(is_stale=True, stale_reason=reason, updated_at=utcnow()))
    invalidate_project(session, project, reason)
    audit(session, project.id, "project", project.id, "scenario_funnel_stale", reason, actor=actor)


def calculate_priority(inputs: dict[str, float]) -> tuple[float | None, list[str], str]:
    missing = [key for key in PRIORITY_INPUTS if key not in inputs]
    if missing:
        return None, missing, "必要输入缺失，不生成总分；请由负责人补数或直接人工复核。"
    score = round(sum(inputs[key] * weight for key, weight in zip(PRIORITY_INPUTS, PRIORITY_WEIGHTS)), 2)
    return score, [], f"待验证优先级={score}；公式：{PRIORITY_FORMULA}。这不是成功率、销量、CTR/CVR或ROI预测。"


def check_content_claims(body: str, approved_claims: list[str], prohibited_terms: list[str], evidence_ids: list[str]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    for term in prohibited_terms:
        if term and term in body:
            findings.append({"type": "prohibited_term", "term": term, "message": f"命中品类包禁用词：{term}；必须人工修改。"})
    absolute_terms = ("一定", "永久", "完全", "最", "第一", "零风险", "100%")
    for term in absolute_terms:
        if term in body:
            findings.append({"type": "absolute_claim", "term": term, "message": f"检测到绝对化表达：{term}。"})
    material_terms = ("全棉", "透气", "不起球", "不缩水", "色牢度")
    if any(term in body for term in material_terms) and not evidence_ids:
        findings.append({"type": "missing_evidence", "term": "material_or_effect", "message": "材质或效果表达没有关联Evidence。"})
    if approved_claims and not any(claim.split("（", 1)[0] in body for claim in approved_claims):
        findings.append({"type": "approved_claim_not_used", "term": "", "message": "当前文案未使用品类包已批准声明；这只是提示，不自动判定失败。"})
    return findings


def feedback_fingerprint(row: dict[str, str]) -> str:
    canonical = compact_json({key: row.get(key, "").strip() for key in sorted(row)})
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def parse_feedback_csv(raw: bytes) -> list[dict[str, Any]]:
    if len(raw) > 2_000_000:
        raise HTTPException(413, "反馈CSV超过2MB限制")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(422, "反馈CSV必须为UTF-8编码") from exc
    reader = csv.DictReader(io.StringIO(text))
    required = {
        "channel", "content_asset_id", "window_start", "window_end", "source",
        "impressions", "clicks", "interactions", "saves", "add_to_cart", "conversions",
        "metric_definition", "owner", "data_nature",
    }
    if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
        raise HTTPException(422, {"message": "反馈CSV字段缺失", "missing": sorted(required - set(reader.fieldnames or []))})
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    batch_natures: set[str] = set()
    for line_number, row in enumerate(reader, start=2):
        normalized = {key: (value or "").strip() for key, value in row.items()}
        fingerprint = feedback_fingerprint(normalized)
        if fingerprint in seen:
            raise HTTPException(422, {"message": "反馈CSV内存在重复记录", "line": line_number})
        seen.add(fingerprint)
        nature = normalized["data_nature"]
        if nature not in {"real_entry", "manual_import"}:
            raise HTTPException(422, {"message": "未知数据性质", "line": line_number})
        batch_natures.add(nature)
        try:
            metrics = {key: int(normalized[key]) for key in ("impressions", "clicks", "interactions", "saves", "add_to_cart", "conversions")}
            start = datetime.fromisoformat(normalized["window_start"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(normalized["window_end"].replace("Z", "+00:00"))
        except (ValueError, TypeError) as exc:
            raise HTTPException(422, {"message": "时间或指标格式无效", "line": line_number}) from exc
        if any(value < 0 for value in metrics.values()):
            raise HTTPException(422, {"message": "指标不得为负数", "line": line_number})
        if not normalized["metric_definition"] or not normalized["source"] or not normalized["owner"]:
            raise HTTPException(422, {"message": "来源、指标定义和负责人不能为空", "line": line_number})
        if end <= start:
            raise HTTPException(422, {"message": "数据时间窗必须明确且结束晚于开始", "line": line_number})
        if metrics["clicks"] > metrics["impressions"] or metrics["conversions"] > metrics["clicks"] or metrics["add_to_cart"] > metrics["clicks"] or metrics["saves"] > metrics["interactions"] + metrics["clicks"]:
            raise HTTPException(422, {"message": "漏斗指标超过合理上游数量", "line": line_number})
        rows.append({**normalized, **metrics, "window_start": start, "window_end": end, "import_fingerprint": fingerprint, "line": line_number})
    if not rows:
        raise HTTPException(422, "反馈CSV没有数据行")
    if len(batch_natures) > 1:
        raise HTTPException(422, "同一批次禁止混合模拟与真实/人工导入数据")
    return rows


def recommendation_from_feedback(session: Session, project: Project, actor: str) -> RecommendationPolicy:
    feedback = session.scalars(select(FeedbackRecord).where(
        FeedbackRecord.project_id == project.id,
        FeedbackRecord.is_stale.is_(False),
        FeedbackRecord.data_nature.in_(("real_entry", "manual_import")),
    )).all()
    count = len(feedback)
    insufficient = count < 3
    channels = sorted({item.channel for item in feedback})
    coverage = {"feedback_records": count, "channels": channels, "minimum_records": 3, "minimum_channels": 2}
    if insufficient or len(channels) < 2:
        suggestion: dict[str, Any] = {}
        rationale = "数据不足，无法提出可靠调整。至少需要3条反馈且覆盖2个渠道；不会填入默认数字。"
        insufficient = True
    else:
        suggestion = {"review_focus": "由负责人复核反馈记录中的共同主题", "next_evidence": "补充可追溯的内容版本与人群分层证据"}
        rationale = "建议层只根据已导入反馈覆盖情况生成待审建议，不修改Gate、预算或正式概念。"
    policy = RecommendationPolicy(
        project_id=project.id,
        policy_version=f"RECOMMENDATION_POLICY_V{project.current_round}.{project.revision}",
        dimensions_json=compact_json(["signal_review", "scenario_validation", "content_revision", "next_evidence"]),
        feedback_sample_count=count,
        coverage_json=compact_json(coverage),
        suggestion_json=compact_json(suggestion),
        rationale=rationale,
        data_insufficient=insufficient,
        actor=actor,
        data_nature="real_entry",
    )
    session.add(policy)
    session.flush()
    audit(session, project.id, "recommendation_policy", policy.id, "proposed", rationale, actor=actor, metadata=coverage)
    return policy
