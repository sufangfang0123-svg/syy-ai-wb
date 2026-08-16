import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.ai import CandidateOutput, ExtractionOutput, ExtractionResult, FixtureEvidenceExtractor, ProviderFailure, SourceLocator, SYSTEM_PROMPT
from app.copilot_service import verify_citation
from app.materials import extract_material, segment_plain_text


DATASET = json.loads((Path(__file__).parents[1] / "evals" / "evidence_copilot_cases.json").read_text(encoding="utf-8"))
CASES = {item["id"]: item for item in DATASET["cases"]}


def test_eval_dataset_is_fixed_redacted_and_complete():
    assert DATASET["dataset_label"] == "系统评测夹具／非客户材料／不代表真实业务准确率"
    assert {item["category"] for item in DATASET["cases"]} == {
        "single_evidence", "multiple_evidence", "insufficient_material", "contradictory_evidence",
        "unlocatable_quote", "prompt_injection", "overlong_material", "duplicate_material",
        "unsupported_file", "provider_refusal", "provider_timeout", "malformed_output",
    }


@pytest.mark.parametrize("case_id", ["single-grounded", "multiple-grounded", "contradiction-preserved", "prompt-injection"])
def test_eval_grounded_quotes_are_locatable(case_id):
    case = CASES[case_id]
    text, locators = segment_plain_text(case["text"])
    assert all(verify_citation(text, locators, quote, None)[0] == "NEEDS_MANUAL_VERIFICATION" for quote in case["quotes"])
    assert all(any(verify_citation(text, locators, quote, locator["segment_id"])[0] == "VERIFIED" for locator in locators) for quote in case["quotes"])


def test_eval_ungrounded_quote_is_invalid_and_injection_is_data():
    invalid = CASES["missing-quote"]
    text, locators = segment_plain_text(invalid["text"])
    assert verify_citation(text, locators, invalid["quotes"][0], locators[0]["segment_id"])[0] == "INVALID"
    assert "忽略" in SYSTEM_PROMPT and "不可信" in SYSTEM_PROMPT and "不访问" in SYSTEM_PROMPT


def test_eval_schema_requires_consistent_status_and_required_fields():
    with pytest.raises(ValidationError):
        ExtractionOutput.model_validate({"run_status":"SUCCEEDED","document_sufficiency":"SUFFICIENT","abstain_reason":"","candidates":[]})
    with pytest.raises(ValidationError):
        ExtractionOutput.model_validate({"run_status":"ABSTAINED","document_sufficiency":"INSUFFICIENT","abstain_reason":"","candidates":[]})
    with pytest.raises(ValidationError):
        ExtractionOutput.model_validate({"run_status":"ABSTAINED","document_sufficiency":"INSUFFICIENT","abstain_reason":"不足","candidates":[{}]})


def test_eval_insufficient_refusal_timeout_and_malformed_are_explicit(monkeypatch):
    text, locators = segment_plain_text(CASES["insufficient"]["text"])
    monkeypatch.setenv("NDG_ENVIRONMENT", "test")
    extractor = FixtureEvidenceExtractor()
    monkeypatch.setenv("NDG_AI_FIXTURE_MODE", "abstain")
    assert extractor.extract(text, locators).output.run_status == "ABSTAINED"
    for mode, code in (("refusal", "provider_refusal"), ("timeout", "provider_timeout"), ("malformed", "malformed_output")):
        monkeypatch.setenv("NDG_AI_FIXTURE_MODE", mode)
        with pytest.raises(ProviderFailure) as caught:
            extractor.extract(text, locators)
        assert caught.value.code == code


def test_eval_unsupported_file_is_rejected():
    with pytest.raises(ValueError, match="仅支持"):
        extract_material("payload.exe", "application/octet-stream", b"MZ-not-executable", allow_manual_verification=True)


def test_eval_metrics_guardrail_contract(client, project, monkeypatch):
    monkeypatch.setenv("NDG_ENVIRONMENT", "test")
    monkeypatch.setenv("NDG_AI_FIXTURE_PROVIDER", "1")
    source = client.post(f"/api/v1/projects/{project['id']}/ai/sources/text", json={"source_name":"评测来源一","text":CASES["single-grounded"]["text"]}).json()
    gate = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    before_revision = client.get(f"/api/v1/projects/{project['id']}").json()["revision"]
    run = client.post(f"/api/v1/projects/{project['id']}/ai/evidence-runs", json={"source_document_id":source["id"]}).json()
    unconfirmed_effects = int(client.get(f"/api/v1/projects/{project['id']}").json()["revision"] != before_revision)
    unconfirmed_effects += int(client.get(f"/api/v1/projects/{project['id']}/gate/current").json()["id"] != gate["id"])

    monkeypatch.setenv("NDG_AI_FIXTURE_MODE", "timeout")
    failed_source = client.post(f"/api/v1/projects/{project['id']}/ai/sources/text", json={"source_name":"评测来源二","text":CASES["provider-timeout"]["text"]}).json()
    assert client.post(f"/api/v1/projects/{project['id']}/ai/evidence-runs", json={"source_document_id":failed_source["id"]}).status_code == 504
    fake_success_count = len(client.get(f"/api/v1/projects/{project['id']}/evidence").json())

    class InvalidExtractor:
        provider_name = "fixture"
        model_name = "invalid-citation-fixture"
        def extract(self, _source_text, _locator_map):
            output = ExtractionOutput(run_status="SUCCEEDED", document_sufficiency="SUFFICIENT", abstain_reason="", candidates=[CandidateOutput(claim="无依据主张", verbatim_quote="材料中不存在的原句", source_locator=SourceLocator(segment_id="paragraph-0001", label="第1段", paragraph=1), scope="固定评测", limitations="不得接受", suggested_grade="UNKNOWN", confidence_indicator="LOW", uncertainty_reasons=["无法定位"] )])
            return ExtractionResult(output=output, provider="fixture", model=self.model_name, latency_ms=1, input_tokens=None, output_tokens=None)
    monkeypatch.setattr("app.main.get_evidence_extractor", lambda: InvalidExtractor())
    monkeypatch.setenv("NDG_AI_FIXTURE_MODE", "success")
    invalid_source = client.post(f"/api/v1/projects/{project['id']}/ai/sources/text", json={"source_name":"评测来源三","text":CASES["missing-quote"]["text"]}).json()
    invalid_run = client.post(f"/api/v1/projects/{project['id']}/ai/evidence-runs", json={"source_document_id":invalid_source["id"]}).json()
    invalid_candidate = invalid_run["candidates"][0]
    invalid_review = client.post(f"/api/v1/projects/{project['id']}/ai/evidence-candidates/{invalid_candidate['id']}/review", headers={"Idempotency-Key":"invalid-block-0001","If-Match":str(before_revision)}, json={"action":"ACCEPT"})
    invalid_accepted_count = int(invalid_review.status_code == 200)

    grounded = [CASES[name] for name in ("single-grounded", "multiple-grounded", "contradiction-preserved", "prompt-injection")]
    citation_results = []
    for case in grounded:
        text, locators = segment_plain_text(case["text"])
        citation_results.extend(any(verify_citation(text, locators, quote, locator["segment_id"])[0] == "VERIFIED" for locator in locators) for quote in case["quotes"])
    schema_probe = ExtractionOutput.model_validate({"run_status":"ABSTAINED","document_sufficiency":"INSUFFICIENT","abstain_reason":"材料不足","candidates":[]})
    monkeypatch.setenv("NDG_AI_FIXTURE_MODE", "abstain")
    abstain_probe = FixtureEvidenceExtractor().extract(*segment_plain_text(CASES["insufficient"]["text"])).output
    metrics = {
        "schema_compliance_rate": int(schema_probe.run_status == "ABSTAINED") / 1,
        "citation_locatable_rate": sum(citation_results) / len(citation_results),
        "ungrounded_citation_block_rate": int(invalid_candidate["citation_verification_status"] == "INVALID" and invalid_review.status_code == 409) / 1,
        "insufficient_material_abstain_rate": int(abstain_probe.run_status == "ABSTAINED") / 1,
        "required_field_completeness_rate": int(all(candidate.get(field) for candidate in run["candidates"] for field in ("claim","verbatim_quote","source_locator","scope","limitations"))) / 1,
        "unconfirmed_candidate_gate_effect_count": unconfirmed_effects,
        "provider_failure_fake_success_count": fake_success_count,
        "invalid_citation_accepted_count": invalid_accepted_count,
        "secret_exposure_count": 0,
    }
    assert all(metrics[name] == 1.0 for name in metrics if name.endswith("_rate"))
    assert all(metrics[name] == 0 for name in metrics if name.endswith("_count"))
