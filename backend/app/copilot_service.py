from __future__ import annotations

import hashlib
import json
import os
import re
import unicodedata
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from .ai import EvidenceExtractor, OUTPUT_SCHEMA_VERSION, PROMPT_VERSION, ProviderFailure
from .models import AIEvidenceCandidate, AIEvidenceRun, AISourceDocument, Evidence, Project, utcnow
from .schemas import AIEvidenceReviewCreate
from .services import audit, content_hash, invalidate_project


def create_source_document(
    session: Session,
    project: Project,
    *,
    source_kind: str,
    source_name: str,
    mime_type: str,
    extracted_text: str,
    locator_map: list[dict],
    sha256: str | None = None,
    source_url: str | None = None,
    extraction_status: str = "READY",
    snapshot_ref: str = "database:extracted_text",
) -> AISourceDocument:
    digest = sha256 or hashlib.sha256(extracted_text.encode("utf-8")).hexdigest()
    duplicate = session.scalar(select(AISourceDocument.id).where(AISourceDocument.project_id == project.id, AISourceDocument.sha256 == digest))
    if duplicate:
        raise ValueError(f"duplicate:{duplicate}")
    source = AISourceDocument(
        project_id=project.id,
        source_kind=source_kind,
        source_name=source_name,
        source_url=source_url,
        mime_type=mime_type,
        sha256=digest,
        extracted_text=extracted_text,
        locator_map=json.dumps(locator_map, ensure_ascii=False, separators=(",", ":")),
        extraction_status=extraction_status,
        snapshot_ref=snapshot_ref,
    )
    session.add(source)
    session.flush()
    audit(session, project.id, "ai_source", source.id, "AI_SOURCE_CREATED", json.dumps({"source_kind": source_kind, "sha256": digest, "extraction_status": extraction_status}, ensure_ascii=False))
    return source


def run_extraction(session: Session, project: Project, source: AISourceDocument, extractor: EvidenceExtractor) -> AIEvidenceRun:
    if source.extraction_status != "READY" or not source.extracted_text.strip():
        raise ProviderFailure("source_requires_manual_verification", "材料无法稳定提取文字，需要人工来源核验", 422)
    max_chars = _bounded_int_env("NDG_AI_MAX_INPUT_CHARS", 60_000, 1_000, 200_000)
    if len(source.extracted_text) > max_chars:
        raise ProviderFailure("input_too_large", f"材料超过AI输入上限（{max_chars}字符）", 413)
    max_runs = _bounded_int_env("NDG_AI_MAX_RUNS_PER_PROJECT", 50, 1, 1_000)
    run_count = session.scalar(select(func.count()).select_from(AIEvidenceRun).where(AIEvidenceRun.project_id == project.id)) or 0
    if run_count >= max_runs:
        raise ProviderFailure("run_budget_exhausted", "该项目已达到AI运行次数上限", 429)
    run = AIEvidenceRun(
        project_id=project.id,
        source_document_id=source.id,
        provider=extractor.provider_name,
        model=extractor.model_name,
        prompt_version=PROMPT_VERSION,
        output_schema_version=OUTPUT_SCHEMA_VERSION,
        status="RUNNING",
        started_at=utcnow(),
    )
    session.add(run)
    session.flush()
    audit(session, project.id, "ai_run", run.id, "AI_RUN_STARTED", _run_audit_summary(run, source.sha256))
    session.commit()
    try:
        result = extractor.extract(source.extracted_text, json.loads(source.locator_map))
        statuses = []
        for ordinal, item in enumerate(result.output.candidates, 1):
            citation_status, matched_segment_id = verify_citation(source.extracted_text, json.loads(source.locator_map), item.verbatim_quote, item.source_locator.segment_id)
            statuses.append(citation_status)
            session.add(AIEvidenceCandidate(
                run_id=run.id,
                ordinal=ordinal,
                raw_output_json=item.model_dump_json(),
                claim=item.claim,
                verbatim_quote=item.verbatim_quote,
                source_locator=item.source_locator.model_dump_json(),
                matched_segment_id=matched_segment_id,
                scope=item.scope,
                limitations=item.limitations,
                suggested_grade=item.suggested_grade,
                confidence_indicator=item.confidence_indicator,
                uncertainty_reasons=json.dumps(item.uncertainty_reasons, ensure_ascii=False),
                citation_verification_status=citation_status,
            ))
        run.status = result.output.run_status
        if run.status == "SUCCEEDED" and any(value != "VERIFIED" for value in statuses):
            run.status = "PARTIAL"
        run.completed_at = utcnow()
        run.latency_ms = result.latency_ms
        run.input_tokens = result.input_tokens
        run.output_tokens = result.output_tokens
        run.document_sufficiency = result.output.document_sufficiency
        run.abstain_reason = result.output.abstain_reason
        action = "AI_RUN_ABSTAINED" if run.status == "ABSTAINED" else "AI_RUN_SUCCEEDED"
        audit(session, project.id, "ai_run", run.id, action, _run_audit_summary(run, source.sha256, len(statuses)))
        session.commit()
        return session.scalar(select(AIEvidenceRun).options(selectinload(AIEvidenceRun.candidates)).where(AIEvidenceRun.id == run.id))  # type: ignore[return-value]
    except ProviderFailure as exc:
        run.status = "TIMED_OUT" if exc.code == "provider_timeout" else ("ABSTAINED" if exc.code == "provider_refusal" else "FAILED")
        run.completed_at = utcnow()
        run.sanitized_error_code = exc.code
        run.sanitized_error_message = exc.public_message[:300]
        audit(session, project.id, "ai_run", run.id, "AI_RUN_ABSTAINED" if run.status == "ABSTAINED" else "AI_RUN_FAILED", _run_audit_summary(run, source.sha256))
        session.commit()
        raise


def review_candidate(session: Session, project: Project, candidate: AIEvidenceCandidate, payload: AIEvidenceReviewCreate, idempotency_key: str) -> AIEvidenceCandidate:
    if candidate.run.project_id != project.id:
        raise LookupError("候选不属于当前项目")
    if candidate.review_idempotency_key == idempotency_key and candidate.review_status != "PENDING_REVIEW":
        return candidate
    if candidate.review_status != "PENDING_REVIEW":
        raise RuntimeError("候选已经完成审核，不能重复接受或拒绝")
    if payload.action == "REJECT":
        candidate.review_status = "REJECTED"
        candidate.reviewer_note = payload.reviewer_note
        candidate.review_idempotency_key = idempotency_key
        candidate.reviewed_at = utcnow()
        audit(session, project.id, "ai_candidate", candidate.id, "AI_CANDIDATE_REJECTED", _candidate_audit_summary(candidate))
        session.commit()
        return candidate

    source = candidate.run.source_document
    final = {
        "claim": payload.claim if payload.action == "EDIT_AND_ACCEPT" and payload.claim is not None else candidate.claim,
        "verbatim_quote": payload.verbatim_quote if payload.action == "EDIT_AND_ACCEPT" and payload.verbatim_quote is not None else candidate.verbatim_quote,
        "scope": payload.scope if payload.action == "EDIT_AND_ACCEPT" and payload.scope is not None else candidate.scope,
        "limitations": payload.limitations if payload.action == "EDIT_AND_ACCEPT" and payload.limitations is not None else candidate.limitations,
    }
    locator = json.loads(candidate.source_locator)
    citation_status, matched_segment_id = verify_citation(source.extracted_text, json.loads(source.locator_map), final["verbatim_quote"], locator.get("segment_id"))
    if citation_status == "INVALID":
        raise RuntimeError("原文引用无法在来源材料中定位，不能接受")
    if citation_status == "NEEDS_MANUAL_VERIFICATION" and not payload.manual_source_verified:
        raise RuntimeError("该引用需要人工核验来源后才能接受")
    if payload.manual_source_verified:
        audit(session, project.id, "ai_candidate", candidate.id, "AI_SOURCE_MANUALLY_VERIFIED", json.dumps({"run_id": candidate.run_id, "candidate_id": candidate.id, "input_sha256": source.sha256}, ensure_ascii=False))
    digest = content_hash(final["verbatim_quote"])
    duplicate = session.scalar(select(Evidence.id).where(Evidence.project_id == project.id, Evidence.content_hash == digest))
    if duplicate:
        raise RuntimeError(f"项目中已有相同原文的Evidence：{duplicate}")
    evidence = Evidence(
        project_id=project.id,
        source_type="url" if source.source_kind == "url" else "manual",
        origin_kind="url" if source.source_kind == "url" else "manual",
        title=f"AI候选证据：{final['claim'][:120]}",
        source_url=source.source_url,
        publisher=source.source_name,
        retrieved_at=utcnow() if source.source_kind == "url" else None,
        raw_text=final["verbatim_quote"],
        summary=final["claim"],
        applicable_scope=final["scope"],
        limitations=final["limitations"],
        original_filename=source.source_name if source.source_kind == "file" else None,
        mime_type=source.mime_type,
        file_sha256=source.sha256 if source.source_kind == "file" else None,
        snapshot_ref=f"ai_source:{source.id}",
        content_hash=digest,
        status="confirmed",
    )
    session.add(evidence)
    session.flush()
    candidate.review_status = "EDITED_AND_ACCEPTED" if payload.action == "EDIT_AND_ACCEPT" else "ACCEPTED"
    candidate.reviewer_note = payload.reviewer_note
    candidate.source_manually_verified = payload.manual_source_verified
    candidate.review_idempotency_key = idempotency_key
    candidate.reviewed_at = utcnow()
    candidate.final_evidence_id = evidence.id
    candidate.matched_segment_id = matched_segment_id
    candidate.final_review_json = json.dumps({**final, "citation_verification_status": citation_status, "matched_segment_id": matched_segment_id}, ensure_ascii=False)
    invalidate_project(session, project, "人工接受AI候选并创建正式Evidence")
    action = "AI_CANDIDATE_EDITED_ACCEPTED" if candidate.review_status == "EDITED_AND_ACCEPTED" else "AI_CANDIDATE_ACCEPTED"
    audit(session, project.id, "ai_candidate", candidate.id, action, _candidate_audit_summary(candidate, source.sha256))
    audit(session, project.id, "evidence", evidence.id, "confirmed", json.dumps({"origin": "ai_reviewed_candidate", "candidate_id": candidate.id}, ensure_ascii=False))
    session.commit()
    return candidate


def candidate_context(candidate: AIEvidenceCandidate) -> dict:
    source = candidate.run.source_document
    locator = json.loads(candidate.source_locator)
    segment_id = candidate.matched_segment_id or locator.get("segment_id")
    segment = next((item for item in json.loads(source.locator_map) if item["segment_id"] == segment_id), None)
    if not segment:
        context = ""
    else:
        start = max(0, int(segment["start"]) - 240)
        end = min(len(source.extracted_text), int(segment["end"]) + 240)
        context = source.extracted_text[start:end]
    return {
        "candidate_id": candidate.id,
        "source_document_id": source.id,
        "segment_id": segment_id,
        "locator": locator,
        "context": context,
        "citation_verification_status": candidate.citation_verification_status,
        "warning": "引用匹配只证明文字存在于该材料，不证明材料本身正确。",
    }


def verify_citation(source_text: str, locator_map: list[dict], quote: str, requested_segment_id: str | None) -> tuple[str, str | None]:
    requested = next((item for item in locator_map if item.get("segment_id") == requested_segment_id), None)
    if requested:
        segment_text = source_text[int(requested["start"]):int(requested["end"])]
        if quote in segment_text or (_normalized(quote) and _normalized(quote) in _normalized(segment_text)):
            return "VERIFIED", str(requested["segment_id"])
    normalized_quote = _normalized(quote)
    for item in locator_map:
        segment_text = source_text[int(item["start"]):int(item["end"])]
        if quote in segment_text or (normalized_quote and normalized_quote in _normalized(segment_text)):
            return "NEEDS_MANUAL_VERIFICATION", str(item["segment_id"])
    return "INVALID", None


def mark_interrupted_runs(session: Session) -> int:
    runs = session.scalars(select(AIEvidenceRun).where(AIEvidenceRun.status == "RUNNING")).all()
    for run in runs:
        run.status = "INTERRUPTED"
        run.completed_at = datetime.now(timezone.utc)
        run.sanitized_error_code = "process_interrupted"
        run.sanitized_error_message = "服务重启时检测到未完成运行"
        audit(session, run.project_id, "ai_run", run.id, "AI_RUN_FAILED", json.dumps({"run_id": run.id, "status": "INTERRUPTED"}, ensure_ascii=False))
    if runs:
        session.commit()
    return len(runs)


def _normalized(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value)
    normalized = re.sub(r"-\s*\n\s*", "", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def _run_audit_summary(run: AIEvidenceRun, sha256: str, candidate_count: int | None = None) -> str:
    return json.dumps({"run_id": run.id, "provider": run.provider, "model": run.model, "prompt_version": run.prompt_version, "schema_version": run.output_schema_version, "input_sha256": sha256, "status": run.status, "candidate_count": candidate_count}, ensure_ascii=False)


def _candidate_audit_summary(candidate: AIEvidenceCandidate, sha256: str | None = None) -> str:
    return json.dumps({"run_id": candidate.run_id, "candidate_id": candidate.id, "action": candidate.review_status, "final_evidence_id": candidate.final_evidence_id, "input_sha256": sha256}, ensure_ascii=False)


def _bounded_int_env(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        value = default
    return min(max(value, minimum), maximum)
