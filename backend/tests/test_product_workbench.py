from __future__ import annotations

import json
from datetime import datetime, timezone


def seed_evidence_assumption(client, project):
    evidence = client.post(f"/api/v1/projects/{project['id']}/evidence/manual", json={
        "title": "授权面料规格", "publisher": "系统验收夹具",
        "raw_text": "固定脱敏测试文本：成分与缩水数据仍待正式检测确认。",
        "summary": "待核验规格", "applicable_scope": "系统验收", "limitations": "非客户材料",
    }).json()
    evidence = client.post(f"/api/v1/evidence/{evidence['id']}/confirm").json()
    assumption = client.post(f"/api/v1/projects/{project['id']}/assumptions", json={
        "statement": "通勤内搭需要先验证贴肤与洗后稳定性", "criticality": 5, "dimension": "PRODUCT",
        "potential_loss": 5000, "avoidable_loss": 3000,
    }).json()
    return evidence, assumption


def import_accept(client, project_id, task_type, refs, candidate):
    snapshot = client.get(f"/api/v1/projects/{project_id}/ai-proposals/snapshot", params=[("refs", ref) for ref in refs]).json()
    created = client.post(f"/api/v1/projects/{project_id}/ai-proposals/import", json={
        "task_type": task_type, "input_entity_references": refs, "input_snapshot_hash": snapshot["input_snapshot_hash"],
        "origin": "manual_ai_import", "provider": None, "model": None, "prompt_template_version": "manual_v1",
        "submission_kind": "external_ai_output", "source_confirmed": True, "source_description": "用户粘贴的外部脱敏候选",
        "output_schema_version": "ai_proposal_v1", "candidates": [candidate], "reasons": ["待人工核对"],
        "uncertainty": ["未进行真人验证"], "limitations": ["结构化导入，不是实时Provider输出"],
        "actor": "验收负责人（人工自述）",
    })
    assert created.status_code == 201, created.text
    reviewed = client.patch(f"/api/v1/ai-proposals/{created.json()['id']}/review", json={
        "decision": "accepted", "reviewer": "验收负责人（人工自述）", "review_reason": "逐项核对引用后人工接受",
        "candidate_index": 0, "revision": created.json()["revision"],
    })
    assert reviewed.status_code == 200, reviewed.text
    return reviewed.json()


def make_opportunity(client, project):
    evidence, assumption = seed_evidence_assumption(client, project)
    refs = [project["id"], evidence["id"], assumption["id"]]
    import_accept(client, project["id"], "opportunity", refs, {
        "title": "轻适通勤内搭机会（待验证）", "description": "比赛概念候选，不代表市场需求。",
        "evidence_ids": [evidence["id"]], "contrary_evidence": [], "alternatives": ["既有基础款"],
        "assumption_ids": [assumption["id"]], "category_fit": "有纺服装字段匹配，仍需人工验证",
    })
    opportunity = client.get(f"/api/v1/projects/{project['id']}/workbench").json()["opportunities"][0]
    return evidence, assumption, opportunity


def make_real_chain(client, project):
    evidence, assumption, opportunity = make_opportunity(client, project)
    scenarios = client.post(f"/api/v1/projects/{project['id']}/scenarios/generate", json={
        "opportunity_id": opportunity["id"], "assumption_id": assumption["id"],
        "evidence_ids": [evidence["id"]], "priority_inputs": {}, "actor": "验收负责人（人工自述）",
    })
    assert scenarios.status_code == 201, scenarios.text
    source_scenario = scenarios.json()[0]
    shortlisted = client.patch(f"/api/v1/scenarios/{source_scenario['id']}", json={
        "status": "shortlisted", "owner": "验收负责人（人工自述）", "review_reason": "引用确认Evidence后人工选择",
        "evidence_ids": [evidence["id"]], "actor": "验收负责人（人工自述）", "revision": source_scenario["revision"],
    })
    assert shortlisted.status_code == 200, shortlisted.text
    refs = [project["id"], evidence["id"], assumption["id"], opportunity["id"], source_scenario["id"]]
    import_accept(client, project["id"], "product_concept", refs, {
        "opportunity_id": opportunity["id"], "name": "全棉轻适通勤内搭（比赛概念方案，非全棉时代正式产品）",
        "source_scenario_id": source_scenario["id"],
        "target_user": "通勤人群假设", "scenario": "空调办公与日常通勤假设", "need": "降低穿着打扰假设",
        "genes": ["合体版型假设", "圆领变量"], "material_hypothesis": "全棉成分待检测确认",
        "specification_hypothesis": "克重待企业技术确认", "price_hypothesis": "价格未获得真实证据",
        "unique_variable": "领口形态", "evidence_ids": [evidence["id"]], "assumption_ids": [assumption["id"]],
        "supply_risk": "起订量与交期待报价", "compliance_risk": "材质声明须有检测支持",
    })
    concept = client.get(f"/api/v1/projects/{project['id']}/workbench").json()["concepts"][0]
    selected = client.patch(f"/api/v1/concepts/{concept['id']}", json={
        "status": "selected", "locked": True, "selection_reason": "人工确认shortlist后选择并锁定",
        "actor": "验收负责人（人工自述）", "revision": concept["revision"],
    })
    assert selected.status_code == 200, selected.text
    concept = selected.json()
    return evidence, assumption, opportunity, concept


def test_category_pack_and_proposal_boundaries(client, project):
    packs = client.get("/api/v1/category-packs").json()
    assert {item["id"] for item in packs} == {"woven_apparel_v1", "legacy_nonwoven_cotton_care_v1"}
    assert client.get(f"/api/v1/projects/{project['id']}").json()["category_pack_id"] == "woven_apparel_v1"
    evidence, _ = seed_evidence_assumption(client, project)
    bad = client.post(f"/api/v1/projects/{project['id']}/ai-proposals/import", json={
        "task_type": "opportunity", "input_entity_references": [evidence["id"]], "input_snapshot_hash": "0" * 64,
        "origin": "manual_ai_import", "prompt_template_version": "manual_v1", "output_schema_version": "ai_proposal_v1",
        "submission_kind": "external_ai_output", "source_confirmed": True, "source_description": "用户粘贴的外部脱敏候选",
        "candidates": [{"title": "候选"}], "actor": "人工负责人",
    })
    assert bad.status_code == 409
    bundle = client.get(f"/api/v1/projects/{project['id']}/workbench").json()
    assert bundle["provider"]["requests"] == 0
    assert bundle["provider"]["status"] == "disabled"


def test_proposal_rejection_and_project_reference_isolation(client, project):
    evidence, _ = seed_evidence_assumption(client, project)
    other = client.post("/api/v1/projects", json={"name": "隔离项目", "decision_question": "引用是否隔离？"}).json()
    foreign = client.post(f"/api/v1/projects/{other['id']}/evidence/manual", json={
        "title": "其他项目Evidence", "publisher": "系统验收夹具", "raw_text": "不得跨项目引用",
    }).json()
    snapshot = client.get(f"/api/v1/projects/{project['id']}/ai-proposals/snapshot", params=[("refs", evidence["id"])]).json()
    payload = {
        "task_type": "opportunity", "input_entity_references": [evidence["id"]],
        "input_snapshot_hash": snapshot["input_snapshot_hash"], "origin": "manual_ai_import",
        "submission_kind": "external_ai_output", "source_confirmed": True, "source_description": "用户粘贴的外部脱敏候选",
        "prompt_template_version": "manual_v1", "output_schema_version": "ai_proposal_v1",
        "candidates": [{"title": "只作为候选", "description": "待复核", "evidence_ids": [evidence["id"]]}],
        "limitations": ["非实时Provider输出"], "actor": "验收负责人（人工自述）",
    }
    proposal = client.post(f"/api/v1/projects/{project['id']}/ai-proposals/import", json=payload).json()
    rejected = client.patch(f"/api/v1/ai-proposals/{proposal['id']}/review", json={
        "decision": "rejected", "reviewer": "验收负责人（人工自述）", "review_reason": "反证不足，不进入正式机会",
        "candidate_index": 0, "revision": proposal["revision"],
    })
    assert rejected.status_code == 200 and rejected.json()["status"] == "rejected"
    assert client.get(f"/api/v1/projects/{project['id']}/workbench").json()["opportunities"] == []
    foreign_snapshot = client.get(f"/api/v1/projects/{project['id']}/ai-proposals/snapshot", params=[("refs", foreign["id"] )])
    assert foreign_snapshot.status_code == 422
    assert foreign_snapshot.json()["detail"]["missing"] == [foreign["id"]]


def test_workbench_persistence_scenarios_feedback_and_stale(client, project):
    evidence, assumption, opportunity = make_opportunity(client, project)
    scenarios = client.post(f"/api/v1/projects/{project['id']}/scenarios/generate", json={
        "opportunity_id": opportunity["id"], "assumption_id": assumption["id"],
        "evidence_ids": [evidence["id"]], "priority_inputs": {}, "actor": "验收负责人",
    })
    assert scenarios.status_code == 201, scenarios.text
    assert len(scenarios.json()) == 100
    assert all(item["priority"] is None for item in scenarios.json())
    assert all(len(json.loads(item["missing_inputs_json"])) == 8 for item in scenarios.json())
    first = scenarios.json()[0]
    shortlisted = client.patch(f"/api/v1/scenarios/{first['id']}", json={
        "status": "shortlisted", "owner": "验收负责人", "review_reason": "人工选择进入shortlist",
        "evidence_ids": [evidence["id"]], "actor": "验收负责人", "revision": first["revision"],
    })
    assert shortlisted.status_code == 200
    concept = client.post(f"/api/v1/projects/{project['id']}/concepts", json={
        "opportunity_id": opportunity["id"], "source_scenario_id": first["id"], "name": "人工shortlist后的产品概念",
        "evidence_ids": [evidence["id"]], "assumption_ids": [assumption["id"]], "actor": "验收负责人",
    })
    assert concept.status_code == 201, concept.text
    concept = client.patch(f"/api/v1/concepts/{concept.json()['id']}", json={
        "status": "selected", "locked": True, "selection_reason": "人工选择并锁定",
        "actor": "验收负责人", "revision": concept.json()["revision"],
    }).json()
    reviewed = client.patch(f"/api/v1/scenarios/{first['id']}", json={
        "status": "validation", "owner": "验收负责人", "review_reason": "人工确认进入Validation",
        "actor": "验收负责人", "revision": shortlisted.json()["revision"],
    })
    assert reviewed.status_code == 200

    content = client.post(f"/api/v1/projects/{project['id']}/content-assets", json={
        "concept_id": concept["id"], "opportunity_id": opportunity["id"], "channel": "小红书",
        "target_user": "通勤人群假设", "scenario": "空调办公", "objective": "验证规格理解",
        "experiment_hypothesis": "规格边界明确可能减少误解", "hook": "通勤内搭规格清单",
        "body": "全棉、零闷热且100%不起球", "cta": "查看待验证规格", "product_genes": ["圆领变量"],
        "evidence_ids": [evidence["id"]], "claim_refs": [evidence["id"]], "visual_spec": "规格卡片",
        "variant": "A", "actor": "验收负责人", "data_nature": "real_entry",
    })
    assert content.status_code == 201, content.text
    findings = {item["type"] for item in json.loads(content.json()["compliance_findings_json"])}
    assert {"prohibited_term", "absolute_claim"}.issubset(findings)

    header = "channel,content_asset_id,window_start,window_end,source,impressions,clicks,interactions,saves,add_to_cart,conversions,metric_definition,owner,data_nature,notes\n"
    row = f"小红书,{content.json()['id']},2026-08-20T00:00:00+00:00,2026-08-21T00:00:00+00:00,脱敏UAT,100,20,15,8,5,2,公开指标定义夹具,验收负责人,manual_import,非客户数据\n"
    imported = client.post(f"/api/v1/projects/{project['id']}/feedback/import", files={"file": ("feedback.csv", (header + row).encode(), "text/csv")})
    assert imported.status_code == 201, imported.text
    assert client.post(f"/api/v1/projects/{project['id']}/feedback/import", files={"file": ("feedback.csv", (header + row).encode(), "text/csv")}).status_code == 409

    change = client.post(f"/api/v1/projects/{project['id']}/change-proposals", json={
        "target_entity_type": "product_concept", "target_entity_id": concept["id"], "feedback_ids": imported.json()["ids"],
        "proposed_patch": {"need": "根据人工复核反馈，改为优先验证规格理解"}, "rationale": "人工提出，尚未接受",
        "actor": "验收负责人", "data_nature": "manual_hypothesis",
    })
    assert change.status_code == 201
    accepted = client.patch(f"/api/v1/change-proposals/{change.json()['id']}/review", json={
        "decision": "accepted", "reviewer": "验收负责人", "review_reason": "人工确认只变更need字段", "revision": 1,
    })
    assert accepted.status_code == 200, accepted.text
    bundle = client.get(f"/api/v1/projects/{project['id']}/workbench").json()
    assert bundle["concepts"][0]["need"] == "根据人工复核反馈，改为优先验证规格理解"
    assert not any(item["is_stale"] for item in bundle["scenarios"])
    assert all(item["is_stale"] for item in bundle["content_assets"])
    assert any(item["entity_type"] == "change_proposal" and item["action"] == "accepted" for item in bundle["audit_events"])
    policy = client.post(f"/api/v1/projects/{project['id']}/recommendation-policies", params={"actor": "验收负责人"}).json()
    assert policy["data_insufficient"] is True and json.loads(policy["suggestion_json"]) == {}
    exported = client.get(f"/api/v1/projects/{project['id']}/export").json()
    assert exported["export_version"] == "2.0" and len(exported["scenario_candidates"]) == 100


def test_feedback_rejects_impossible_funnel(client, project):
    evidence, assumption, opportunity, concept = make_real_chain(client, project)
    content = client.post(f"/api/v1/projects/{project['id']}/content-assets", json={
        "concept_id": concept["id"], "channel": "电商", "target_user": "待验证人群", "scenario": "待验证场景",
        "objective": "验证规格理解", "experiment_hypothesis": "待验证", "body": "规格待确认", "actor": "人工负责人",
    }).json()
    header = "channel,content_asset_id,window_start,window_end,source,impressions,clicks,interactions,saves,add_to_cart,conversions,metric_definition,owner,data_nature\n"
    row = f"电商,{content['id']},2026-08-20T00:00:00+00:00,2026-08-21T00:00:00+00:00,UAT,10,20,1,0,0,2,定义,负责人,manual_import\n"
    assert client.post(f"/api/v1/projects/{project['id']}/feedback/import", files={"file": ("feedback.csv", (header + row).encode(), "text/csv")}).status_code == 422


def test_opportunity_material_change_stales_full_derived_funnel(client, project):
    evidence, assumption, opportunity, concept = make_real_chain(client, project)
    empty_policy = client.post(
        f"/api/v1/projects/{project['id']}/recommendation-policies", params={"actor": "验收负责人"}
    ).json()
    content = client.post(f"/api/v1/projects/{project['id']}/content-assets", json={
        "concept_id": concept["id"], "opportunity_id": opportunity["id"], "channel": "电商",
        "target_user": "待验证人群", "scenario": "待验证场景", "objective": "验证变更级联",
        "experiment_hypothesis": "待验证", "body": "待验证内容", "actor": "验收负责人",
    }).json()
    header = "channel,content_asset_id,window_start,window_end,source,impressions,clicks,interactions,saves,add_to_cart,conversions,metric_definition,owner,data_nature\n"
    row = f"电商,{content['id']},2026-08-20T00:00:00+00:00,2026-08-21T00:00:00+00:00,UAT,10,2,1,0,0,0,定义,负责人,manual_import\n"
    feedback_id = client.post(
        f"/api/v1/projects/{project['id']}/feedback/import",
        files={"file": ("feedback.csv", (header + row).encode(), "text/csv")},
    ).json()["ids"][0]
    change = client.post(f"/api/v1/projects/{project['id']}/change-proposals", json={
        "target_entity_type": "product_concept", "target_entity_id": concept["id"], "feedback_ids": [feedback_id],
        "proposed_patch": {"need": "旧漏斗不得继续变更"}, "rationale": "验证失效级联", "actor": "验收负责人",
    }).json()
    policy = client.post(
        f"/api/v1/projects/{project['id']}/recommendation-policies", params={"actor": "验收负责人"}
    ).json()
    updated = client.patch(f"/api/v1/opportunities/{opportunity['id']}", json={
        "description": "机会定义发生实质变化", "actor": "验收负责人", "revision": opportunity["revision"],
    })
    assert updated.status_code == 200
    bundle = client.get(f"/api/v1/projects/{project['id']}/workbench").json()
    assert all(item["is_stale"] for item in bundle["scenarios"])
    assert next(item for item in bundle["concepts"] if item["id"] == concept["id"])["is_stale"] is True
    assert next(item for item in bundle["content_assets"] if item["id"] == content["id"])["is_stale"] is True
    assert next(item for item in bundle["feedback_records"] if item["id"] == feedback_id)["is_stale"] is True
    assert next(item for item in bundle["change_proposals"] if item["id"] == change["id"])["is_stale"] is True
    assert next(item for item in bundle["recommendation_policies"] if item["id"] == policy["id"])["is_stale"] is True
    assert next(item for item in bundle["recommendation_policies"] if item["id"] == empty_policy["id"])["is_stale"] is True
    stale_edit = client.patch(f"/api/v1/concepts/{concept['id']}", json={
        "name": "不得修改旧Concept", "actor": "验收负责人", "revision": concept["revision"],
    })
    assert stale_edit.status_code == 409
    stale_feedback = client.post(
        f"/api/v1/projects/{project['id']}/feedback/import",
        files={"file": ("feedback.csv", (header + row.replace("UAT", "UAT-2")).encode(), "text/csv")},
    )
    assert stale_feedback.status_code == 409
    stale_change_review = client.patch(f"/api/v1/change-proposals/{change['id']}/review", json={
        "decision": "accepted", "reviewer": "验收负责人", "review_reason": "不得接受旧漏斗变更", "revision": change["revision"],
    })
    assert stale_change_review.status_code == 409


def test_category_pack_switch_stales_existing_scenario_funnel(client, project):
    _, _, _, concept = make_real_chain(client, project)
    current_project = client.get(f"/api/v1/projects/{project['id']}").json()
    switched = client.patch(f"/api/v1/projects/{project['id']}/category-pack", json={
        "category_pack_id": "legacy_nonwoven_cotton_care_v1", "actor": "验收负责人",
        "revision": current_project["revision"],
    })
    assert switched.status_code == 200
    bundle = client.get(f"/api/v1/projects/{project['id']}/workbench").json()
    assert all(item["is_stale"] for item in bundle["scenarios"])
    assert next(item for item in bundle["concepts"] if item["id"] == concept["id"])["is_stale"] is True


def test_fixed_or_ai_feedback_cannot_enter_local_change_or_recommendation(client, project):
    from app.database import get_session
    from app.main import app
    from app.workbench_models import ChangeProposal, FeedbackRecord

    evidence, assumption, opportunity, concept = make_real_chain(client, project)
    content = client.post(f"/api/v1/projects/{project['id']}/content-assets", json={
        "concept_id": concept["id"], "opportunity_id": opportunity["id"], "channel": "电商",
        "target_user": "待验证人群", "scenario": "待验证场景", "objective": "验证反馈边界",
        "experiment_hypothesis": "待验证", "body": "待验证内容", "actor": "验收负责人",
    }).json()
    header = "channel,content_asset_id,window_start,window_end,source,impressions,clicks,interactions,saves,add_to_cart,conversions,metric_definition,owner,data_nature\n"
    fixed_row = f"电商,{content['id']},2026-08-20T00:00:00+00:00,2026-08-21T00:00:00+00:00,固定演示,10,2,1,0,0,0,定义,负责人,fixed_demo\n"
    fixed_import = client.post(f"/api/v1/projects/{project['id']}/feedback/import", files={"file": ("feedback.csv", (header + fixed_row).encode(), "text/csv")})
    assert fixed_import.status_code == 422
    assert "未知数据性质" in fixed_import.text

    session_generator = app.dependency_overrides[get_session]()
    session = next(session_generator)
    try:
        for feedback_id, nature, fingerprint in (
            ("fbk_forged_fixed", "fixed_demo", "f" * 64),
            ("fbk_forged_ai", "ai_proposal", "a" * 64),
        ):
            session.add(FeedbackRecord(
                id=feedback_id, project_id=project["id"], content_asset_id=content["id"], concept_id=concept["id"],
                channel="电商", window_start=datetime(2026, 8, 20, tzinfo=timezone.utc),
                window_end=datetime(2026, 8, 21, tzinfo=timezone.utc), source="伪造边界测试",
                impressions=10, clicks=2, interactions=1, saves=0, add_to_cart=0, conversions=0,
                metric_definition="测试定义", owner="验收负责人", import_fingerprint=fingerprint,
                data_nature=nature, is_stale=False,
            ))
        for change_id, nature, feedback_ids in (
            ("chg_forged_fixed", "fixed_demo", []),
            ("chg_forged_ai", "ai_proposal", []),
            ("chg_recheck_fixed_feedback", "manual_hypothesis", ["fbk_forged_fixed"]),
            ("chg_recheck_ai_feedback", "manual_hypothesis", ["fbk_forged_ai"]),
        ):
            session.add(ChangeProposal(
                id=change_id, project_id=project["id"], target_entity_type="product_concept",
                target_entity_id=concept["id"], feedback_ids_json=json.dumps(feedback_ids),
                proposed_patch_json=json.dumps({"need": "不得由伪来源驱动"}, ensure_ascii=False),
                rationale="数据库伪造攻防测试", actor="验收负责人", data_nature=nature,
            ))
        session.commit()
    finally:
        session_generator.close()

    for feedback_id in ("fbk_forged_fixed", "fbk_forged_ai"):
        change = client.post(f"/api/v1/projects/{project['id']}/change-proposals", json={
            "target_entity_type": "product_concept", "target_entity_id": concept["id"],
            "feedback_ids": [feedback_id], "proposed_patch": {"need": "不得由伪反馈驱动"},
            "rationale": "防御性边界测试", "actor": "验收负责人",
        })
        assert change.status_code == 422
        assert "只能引用real_entry或manual_import反馈" in change.text
    for change_id in (
        "chg_forged_fixed", "chg_forged_ai", "chg_recheck_fixed_feedback", "chg_recheck_ai_feedback",
    ):
        accepted = client.patch(f"/api/v1/change-proposals/{change_id}/review", json={
            "decision": "accepted", "reviewer": "验收负责人", "review_reason": "尝试接受数据库伪造记录",
            "revision": 1,
        })
        assert accepted.status_code == 422
    rejected = client.patch("/api/v1/change-proposals/chg_forged_fixed/review", json={
        "decision": "rejected", "reviewer": "验收负责人", "review_reason": "拒绝伪造的fixed_demo变更并保留审计",
        "revision": 1,
    })
    assert rejected.status_code == 200 and rejected.json()["status"] == "rejected"
    policy = client.post(f"/api/v1/projects/{project['id']}/recommendation-policies", params={"actor": "验收负责人"})
    assert policy.status_code == 201
    assert policy.json()["feedback_sample_count"] == 0
    assert json.loads(policy.json()["coverage_json"])["feedback_records"] == 0
    assert policy.json()["data_insufficient"] is True
    bundle = client.get(f"/api/v1/projects/{project['id']}/workbench").json()
    assert bundle["provider"]["requests"] == 0
    assert any(event["entity_id"] == "chg_forged_fixed" and event["action"] == "rejected" for event in bundle["audit_events"])


def test_gate_rule_version_unchanged(client, project):
    gate = client.post(f"/api/v1/projects/{project['id']}/gate")
    assert gate.status_code == 201
    assert gate.json()["rule_version"] == "NDG_GATE_V0.3.0"


def test_scenario_cannot_bypass_human_shortlist_after_concept_creation(client, project):
    from app.database import get_session
    from app.main import app
    from app.workbench_models import ScenarioCandidate

    evidence, _, opportunity, concept = make_real_chain(client, project)
    bundle = client.get(f"/api/v1/projects/{project['id']}/workbench").json()
    scenario = next(item for item in bundle["scenarios"] if item["id"] == concept["source_scenario_id"])
    for forbidden_status in ("candidate_space", "rejected"):
        response = client.patch(f"/api/v1/scenarios/{scenario['id']}", json={
            "status": forbidden_status, "owner": "验收负责人", "review_reason": "尝试绕过人工shortlist",
            "actor": "验收负责人", "revision": scenario["revision"],
        })
        assert response.status_code == 409

    session_generator = app.dependency_overrides[get_session]()
    session = next(session_generator)
    try:
        stored = session.get(ScenarioCandidate, scenario["id"])
        stored.status = "candidate_space"
        session.commit()
    finally:
        session_generator.close()
    content = client.post(f"/api/v1/projects/{project['id']}/content-assets", json={
        "concept_id": concept["id"], "opportunity_id": opportunity["id"], "channel": "电商",
        "target_user": "待验证人群", "scenario": "待验证场景", "objective": "验证shortlist防线",
        "experiment_hypothesis": "待验证", "body": "待验证内容", "evidence_ids": [evidence["id"]],
        "actor": "验收负责人",
    })
    assert content.status_code == 409
    assert "人工shortlist Scenario追溯" in content.text


def test_scenario_universe_rejects_shared_priority_and_requires_human_shortlist(client, project):
    evidence, assumption, opportunity = make_opportunity(client, project)
    unconfirmed = client.post(f"/api/v1/projects/{project['id']}/opportunities", json={
        "title": "尚未确认机会", "description": "不得生成候选宇宙", "actor": "验收负责人",
    }).json()
    unconfirmed_universe = client.post(f"/api/v1/projects/{project['id']}/scenarios/generate", json={
        "opportunity_id": unconfirmed["id"], "assumption_id": assumption["id"],
        "evidence_ids": [evidence["id"]], "priority_inputs": {}, "actor": "验收负责人",
    })
    assert unconfirmed_universe.status_code == 409
    shared_score = client.post(f"/api/v1/projects/{project['id']}/scenarios/generate", json={
        "opportunity_id": opportunity["id"], "assumption_id": assumption["id"],
        "evidence_ids": [evidence["id"]], "priority_inputs": {"evidence_fit": 90}, "actor": "验收负责人",
    })
    assert shared_score.status_code == 422
    assert "禁止把同一组输入复制" in shared_score.text

    universe = client.post(f"/api/v1/projects/{project['id']}/scenarios/generate", json={
        "opportunity_id": opportunity["id"], "assumption_id": assumption["id"],
        "evidence_ids": [evidence["id"]], "priority_inputs": {}, "actor": "验收负责人",
    })
    assert universe.status_code == 201
    assert len(universe.json()) == 100
    assert all(item["priority"] is None and item["priority_policy_version"] is None for item in universe.json())
    assert all(json.loads(item["priority_inputs_json"]) == {} for item in universe.json())
    assert {item["status"] for item in universe.json()} == {"candidate_space"}

    candidate = universe.json()[37]
    direct_validation = client.patch(f"/api/v1/scenarios/{candidate['id']}", json={
        "status": "validation", "owner": "验收负责人", "review_reason": "不能绕过shortlist",
        "actor": "验收负责人", "revision": candidate["revision"],
    })
    assert direct_validation.status_code == 409
    no_evidence = client.patch(f"/api/v1/scenarios/{candidate['id']}", json={
        "status": "shortlisted", "owner": "验收负责人", "review_reason": "理由存在但没有证据",
        "actor": "验收负责人", "revision": candidate["revision"],
    })
    assert no_evidence.status_code == 422
    draft_evidence = client.post(f"/api/v1/projects/{project['id']}/evidence/manual", json={
        "title": "尚未确认的草稿Evidence", "publisher": "验收夹具", "raw_text": "此记录仍处于草稿状态",
    }).json()
    draft_shortlist = client.patch(f"/api/v1/scenarios/{candidate['id']}", json={
        "status": "shortlisted", "owner": "验收负责人", "review_reason": "尝试引用草稿证据",
        "evidence_ids": [draft_evidence["id"]], "actor": "验收负责人", "revision": candidate["revision"],
    })
    assert draft_shortlist.status_code == 422
    assert "已确认Evidence" in draft_shortlist.text
    shortlisted = client.patch(f"/api/v1/scenarios/{candidate['id']}", json={
        "status": "shortlisted", "owner": "验收负责人", "review_reason": "引用规格证据后人工选择",
        "evidence_ids": [evidence["id"]], "actor": "验收负责人", "revision": candidate["revision"],
    })
    assert shortlisted.status_code == 200
    saved = shortlisted.json()
    assert saved["shortlisted_by"] == "验收负责人"
    assert saved["shortlist_reason"] == "引用规格证据后人工选择"
    assert json.loads(saved["shortlist_evidence_ids_json"]) == [evidence["id"]]
    assert saved["shortlisted_at"] is not None
    other_opportunity = client.post(f"/api/v1/projects/{project['id']}/opportunities", json={
        "title": "同项目另一已确认机会", "description": "用于机会链隔离", "status": "confirmed", "actor": "验收负责人",
    }).json()
    other_universe = client.post(f"/api/v1/projects/{project['id']}/scenarios/generate", json={
        "opportunity_id": other_opportunity["id"], "assumption_id": assumption["id"],
        "evidence_ids": [evidence["id"]], "priority_inputs": {}, "actor": "验收负责人",
    }).json()
    other_shortlist = client.patch(f"/api/v1/scenarios/{other_universe[0]['id']}", json={
        "status": "shortlisted", "owner": "验收负责人", "review_reason": "另一机会的人工shortlist",
        "evidence_ids": [evidence["id"]], "actor": "验收负责人", "revision": other_universe[0]["revision"],
    }).json()
    mismatched_chain = client.post(f"/api/v1/projects/{project['id']}/concepts", json={
        "opportunity_id": opportunity["id"], "source_scenario_id": other_shortlist["id"],
        "name": "跨机会链概念", "actor": "验收负责人",
    })
    assert mismatched_chain.status_code == 422
    validation_without_concept = client.patch(f"/api/v1/scenarios/{candidate['id']}", json={
        "status": "validation", "owner": "验收负责人", "review_reason": "尝试跳过Concept",
        "actor": "验收负责人", "revision": saved["revision"],
    })
    assert validation_without_concept.status_code == 409
    concept = client.post(f"/api/v1/projects/{project['id']}/concepts", json={
        "opportunity_id": opportunity["id"], "source_scenario_id": candidate["id"], "name": "shortlist派生概念",
        "evidence_ids": [evidence["id"]], "assumption_ids": [assumption["id"]], "actor": "验收负责人",
    })
    assert concept.status_code == 201, concept.text
    duplicate_concept = client.post(f"/api/v1/projects/{project['id']}/concepts", json={
        "opportunity_id": opportunity["id"], "source_scenario_id": candidate["id"], "name": "重复概念",
        "actor": "验收负责人",
    })
    assert duplicate_concept.status_code == 409
    unlocked_validation = client.patch(f"/api/v1/scenarios/{candidate['id']}", json={
        "status": "validation", "owner": "验收负责人", "review_reason": "尝试跳过Concept人工选择锁定",
        "actor": "验收负责人", "revision": saved["revision"],
    })
    assert unlocked_validation.status_code == 409
    selected_concept = client.patch(f"/api/v1/concepts/{concept.json()['id']}", json={
        "status": "selected", "locked": True, "selection_reason": "人工确认后选择并锁定",
        "actor": "验收负责人", "revision": concept.json()["revision"],
    })
    assert selected_concept.status_code == 200
    validation = client.patch(f"/api/v1/scenarios/{candidate['id']}", json={
        "status": "validation", "owner": "验收负责人", "review_reason": "Concept已创建后进入验证",
        "actor": "验收负责人", "revision": saved["revision"],
    })
    assert validation.status_code == 200, validation.text
    bundle = client.get(f"/api/v1/projects/{project['id']}/workbench").json()
    selected = next(item for item in bundle["scenarios"] if item["id"] == candidate["id"])
    assert selected["status"] == "validation" and selected["concept_id"] == concept.json()["id"]
    assert any(event["entity_id"] == candidate["id"] and event["action"] == "shortlisted" for event in bundle["audit_events"])


def test_fixed_demo_cannot_enter_formal_domain_and_origins_remain_distinct(client, project):
    evidence, assumption = seed_evidence_assumption(client, project)
    declared_refs = [evidence["id"], assumption["id"]]
    snapshot = client.get(
        f"/api/v1/projects/{project['id']}/ai-proposals/snapshot",
        params=[("refs", ref) for ref in declared_refs],
    ).json()
    base_proposal = {
        "task_type": "opportunity", "input_entity_references": declared_refs,
        "input_snapshot_hash": snapshot["input_snapshot_hash"], "origin": "manual_ai_import",
        "submission_kind": "external_ai_output", "source_confirmed": True, "source_description": "用户粘贴的外部脱敏候选",
        "prompt_template_version": "manual_v1", "output_schema_version": "ai_proposal_v1",
        "candidates": [{"title": "外部候选", "description": "待人工复核", "evidence_ids": [evidence["id"]], "assumption_ids": [assumption["id"]]}],
        "actor": "验收负责人",
    }
    fixed = client.post(f"/api/v1/projects/{project['id']}/ai-proposals/import", json={**base_proposal, "origin": "fixed_demo"})
    assert fixed.status_code == 422
    unconfirmed = client.post(f"/api/v1/projects/{project['id']}/ai-proposals/import", json={**base_proposal, "source_confirmed": False})
    assert unconfirmed.status_code == 422
    empty_source = client.post(f"/api/v1/projects/{project['id']}/ai-proposals/import", json={**base_proposal, "source_description": ""})
    assert empty_source.status_code == 422

    imported = client.post(f"/api/v1/projects/{project['id']}/ai-proposals/import", json=base_proposal)
    assert imported.status_code == 201 and imported.json()["data_nature"] == "manual_import"
    assert imported.json()["source_confirmed_at"] is not None
    assert imported.json()["source_description"] == base_proposal["source_description"]
    accepted = client.patch(f"/api/v1/ai-proposals/{imported.json()['id']}/review", json={
        "decision": "accepted", "reviewer": "验收负责人", "review_reason": "确认外部候选来源并逐项核对",
        "candidate_index": 0, "revision": imported.json()["revision"],
    })
    assert accepted.status_code == 200
    manual_import_opportunity = client.get(f"/api/v1/projects/{project['id']}/workbench").json()["opportunities"][0]
    assert manual_import_opportunity["data_nature"] == "manual_import"

    manual = client.post(f"/api/v1/projects/{project['id']}/opportunities", json={
        "title": "人工自写假设", "description": "尚未由市场证据证明", "evidence_ids": [evidence["id"]],
        "assumption_ids": [assumption["id"]], "actor": "验收负责人",
    })
    assert manual.status_code == 201 and manual.json()["data_nature"] == "manual_hypothesis"
    for endpoint, payload in (
        (f"/api/v1/projects/{project['id']}/opportunities", {"title": "固定示例", "description": "禁止", "actor": "验收人", "data_nature": "fixed_demo"}),
        (f"/api/v1/projects/{project['id']}/concepts", {"opportunity_id": manual.json()["id"], "name": "固定概念", "actor": "验收人", "data_nature": "fixed_demo"}),
        (f"/api/v1/projects/{project['id']}/change-proposals", {"target_entity_type": "product_concept", "target_entity_id": "con_x", "proposed_patch": {"need": "x"}, "rationale": "固定变更", "actor": "验收人", "data_nature": "fixed_demo"}),
    ):
        assert client.post(endpoint, json=payload).status_code == 422
    bundle = client.get(f"/api/v1/projects/{project['id']}/workbench").json()
    assert bundle["provider"]["requests"] == 0
    assert {item["data_nature"] for item in bundle["opportunities"]} == {"manual_import", "manual_hypothesis"}
    assert all(item["data_nature"] not in {"fixed_demo", "ai_proposal"} for item in bundle["opportunities"])


def test_legacy_fixed_demo_review_cannot_create_any_formal_entity(client, project):
    from app.database import get_session
    from app.main import app
    from app.workbench_models import AIProposal

    evidence, assumption, opportunity, concept = make_real_chain(client, project)
    candidates = {
        "aip_fixed_opp": ("opportunity", {"title": "固定机会", "description": "演示", "evidence_ids": [evidence["id"]]}),
        "aip_fixed_con": ("product_concept", {"opportunity_id": opportunity["id"], "name": "固定概念"}),
        "aip_fixed_chg": ("change_proposal", {"target_entity_type": "product_concept", "target_entity_id": concept["id"], "proposed_patch": {"need": "固定变更"}}),
    }
    session_generator = app.dependency_overrides[get_session]()
    session = next(session_generator)
    try:
        for proposal_id, (task_type, candidate) in candidates.items():
            session.add(AIProposal(
                id=proposal_id, project_id=project["id"], task_type=task_type,
                input_snapshot_hash="0" * 64, origin="fixed_demo", prompt_template_version="fixture_v1",
                output_schema_version="ai_proposal_v1", candidates_json=json.dumps([candidate], ensure_ascii=False),
                actor="固定演示夹具", data_nature="fixed_demo",
            ))
        session.commit()
    finally:
        session_generator.close()

    for proposal_id in candidates:
        response = client.patch(f"/api/v1/ai-proposals/{proposal_id}/review", json={
            "decision": "accepted", "reviewer": "验收负责人", "review_reason": "尝试绕过前端",
            "candidate_index": 0, "revision": 1,
        })
        assert response.status_code == 422
        assert "fixed_demo" in response.text
    bundle = client.get(f"/api/v1/projects/{project['id']}/workbench").json()
    assert all(item["source_proposal_id"] not in candidates for item in bundle["opportunities"] + bundle["concepts"] + bundle["change_proposals"])


def test_disabled_provider_candidates_cannot_be_accepted_but_can_be_rejected(client, project):
    from app.database import get_session
    from app.main import app
    from app.workbench_models import AIProposal

    evidence, assumption, opportunity, concept = make_real_chain(client, project)
    candidates = {
        "aip_provider_opp": ("opportunity", {"title": "未验收Provider机会", "description": "禁止接受", "evidence_ids": [evidence["id"]]}),
        "aip_provider_con": ("product_concept", {"opportunity_id": opportunity["id"], "name": "未验收Provider概念"}),
        "aip_provider_chg": ("change_proposal", {"target_entity_type": "product_concept", "target_entity_id": concept["id"], "proposed_patch": {"need": "禁止接受"}}),
    }
    session_generator = app.dependency_overrides[get_session]()
    session = next(session_generator)
    try:
        for proposal_id, (task_type, candidate) in candidates.items():
            session.add(AIProposal(
                id=proposal_id, project_id=project["id"], task_type=task_type,
                input_snapshot_hash="0" * 64, origin="provider_optional", provider="disabled", model="unverified",
                prompt_template_version="legacy_provider", output_schema_version="ai_proposal_v1",
                candidates_json=json.dumps([candidate], ensure_ascii=False), actor="旧记录", data_nature="ai_proposal",
            ))
        session.commit()
    finally:
        session_generator.close()

    for proposal_id in candidates:
        accepted = client.patch(f"/api/v1/ai-proposals/{proposal_id}/review", json={
            "decision": "accepted", "reviewer": "验收负责人", "review_reason": "尝试接受未验收Provider候选",
            "candidate_index": 0, "revision": 1,
        })
        assert accepted.status_code == 422
        assert "Provider已禁用" in accepted.text
    rejected = client.patch("/api/v1/ai-proposals/aip_provider_opp/review", json={
        "decision": "rejected", "reviewer": "验收负责人", "review_reason": "Provider未验收，人工拒绝并保留审计",
        "candidate_index": 0, "revision": 1,
    })
    assert rejected.status_code == 200 and rejected.json()["status"] == "rejected"
    bundle = client.get(f"/api/v1/projects/{project['id']}/workbench").json()
    assert bundle["provider"]["requests"] == 0
    assert any(event["entity_id"] == "aip_provider_opp" and event["action"] == "rejected" for event in bundle["audit_events"])


def test_stale_upstream_entities_cannot_create_downstream_records(client, project):
    from app.database import get_session
    from app.main import app
    from app.workbench_models import Opportunity, ProductConcept

    evidence, assumption, active_opportunity, active_concept = make_real_chain(client, project)
    session_generator = app.dependency_overrides[get_session]()
    session = next(session_generator)
    try:
        session.add(Opportunity(
            id="opp_migrated_stale", project_id=project["id"], title="迁移后stale机会",
            description="旧来源未确认", is_stale=True, stale_reason="Schema 4旧来源失效",
            data_nature="manual_import",
        ))
        session.add(ProductConcept(
            id="con_migrated_stale", project_id=project["id"], opportunity_id=active_opportunity["id"],
            name="迁移后stale概念", is_stale=True, stale_reason="Schema 4旧来源失效",
            data_nature="manual_import",
        ))
        session.commit()
    finally:
        session_generator.close()

    direct_concept = client.post(f"/api/v1/projects/{project['id']}/concepts", json={
        "opportunity_id": "opp_migrated_stale", "source_scenario_id": active_concept["source_scenario_id"],
        "name": "不得创建的下游概念", "actor": "验收负责人",
    })
    assert direct_concept.status_code == 409

    snapshot = client.get(f"/api/v1/projects/{project['id']}/ai-proposals/snapshot", params=[("refs", evidence["id"])]).json()
    proposal = client.post(f"/api/v1/projects/{project['id']}/ai-proposals/import", json={
        "task_type": "product_concept", "input_entity_references": [evidence["id"]],
        "input_snapshot_hash": snapshot["input_snapshot_hash"], "origin": "manual_ai_import",
        "submission_kind": "external_ai_output", "source_confirmed": True,
        "source_description": "用户粘贴的外部脱敏候选", "prompt_template_version": "manual_v1",
        "output_schema_version": "ai_proposal_v1", "actor": "验收负责人",
        "candidates": [{"opportunity_id": "opp_migrated_stale", "source_scenario_id": active_concept["source_scenario_id"], "name": "不得接受的候选概念"}],
    })
    assert proposal.status_code == 422
    assert "opp_migrated_stale" in proposal.json()["detail"]["undeclared_candidate_refs"]

    scenario = client.post(f"/api/v1/projects/{project['id']}/scenarios/generate", json={
        "opportunity_id": "opp_migrated_stale",
        "assumption_id": assumption["id"], "evidence_ids": [evidence["id"]], "priority_inputs": {},
        "actor": "验收负责人",
    })
    assert scenario.status_code == 409
    content = client.post(f"/api/v1/projects/{project['id']}/content-assets", json={
        "concept_id": "con_migrated_stale", "opportunity_id": active_opportunity["id"], "channel": "电商",
        "target_user": "待验证人群", "scenario": "待验证场景", "objective": "验证",
        "experiment_hypothesis": "待验证", "body": "待验证内容", "actor": "验收负责人",
    })
    assert content.status_code == 409
    change = client.post(f"/api/v1/projects/{project['id']}/change-proposals", json={
        "target_entity_type": "product_concept", "target_entity_id": "con_migrated_stale",
        "proposed_patch": {"need": "不得变更"}, "rationale": "尝试引用stale概念", "actor": "验收负责人",
    })
    assert change.status_code == 409
    assert client.get(f"/api/v1/projects/{project['id']}/workbench").json()["provider"]["requests"] == 0


def test_nonstale_fixed_or_ai_upstream_entities_cannot_create_downstream_records(client, project):
    from app.database import get_session
    from app.main import app
    from app.workbench_models import Opportunity, ProductConcept

    evidence, assumption, active_opportunity, active_concept = make_real_chain(client, project)
    session_generator = app.dependency_overrides[get_session]()
    session = next(session_generator)
    try:
        for opportunity_id, nature in (("opp_active_fixed", "fixed_demo"), ("opp_active_ai", "ai_proposal")):
            session.add(Opportunity(
                id=opportunity_id, project_id=project["id"], title=f"{nature}机会", description="数据库伪造攻防测试",
                is_stale=False, data_nature=nature,
            ))
        for concept_id, nature in (("con_active_fixed", "fixed_demo"), ("con_active_ai", "ai_proposal")):
            session.add(ProductConcept(
                id=concept_id, project_id=project["id"], opportunity_id=active_opportunity["id"],
                name=f"{nature}概念", is_stale=False, data_nature=nature,
            ))
        session.commit()
    finally:
        session_generator.close()

    for opportunity_id in ("opp_active_fixed", "opp_active_ai"):
        response = client.post(f"/api/v1/projects/{project['id']}/concepts", json={
            "opportunity_id": opportunity_id, "source_scenario_id": active_concept["source_scenario_id"],
            "name": "不得创建的概念", "actor": "验收负责人",
        })
        assert response.status_code == 422
        scenario = client.post(f"/api/v1/projects/{project['id']}/scenarios/generate", json={
            "opportunity_id": opportunity_id, "assumption_id": assumption["id"],
            "evidence_ids": [evidence["id"]], "priority_inputs": {}, "actor": "验收负责人",
        })
        assert scenario.status_code == 422
    for concept_id in ("con_active_fixed", "con_active_ai"):
        content = client.post(f"/api/v1/projects/{project['id']}/content-assets", json={
            "concept_id": concept_id, "opportunity_id": active_opportunity["id"], "channel": "电商",
            "target_user": "待验证人群", "scenario": "待验证场景", "objective": "验证",
            "experiment_hypothesis": "待验证", "body": "不得创建的内容", "actor": "验收负责人",
        })
        assert content.status_code == 422
        change = client.post(f"/api/v1/projects/{project['id']}/change-proposals", json={
            "target_entity_type": "product_concept", "target_entity_id": concept_id,
            "proposed_patch": {"need": "不得创建的变更"}, "rationale": "数据库伪造攻防测试",
            "actor": "验收负责人",
        })
        assert change.status_code == 422
    assert client.get(f"/api/v1/projects/{project['id']}/workbench").json()["provider"]["requests"] == 0


def test_manual_import_requires_confirmed_project_source_and_manual_hypothesis_cannot_spoof_ai(client, project):
    from app.database import get_session
    from app.main import app
    from app.workbench_models import AIProposal

    evidence, assumption = seed_evidence_assumption(client, project)
    missing_source = client.post(f"/api/v1/projects/{project['id']}/opportunities", json={
        "title": "伪造人工导入", "description": "没有来源proposal", "evidence_ids": [evidence["id"]],
        "actor": "验收负责人", "data_nature": "manual_import",
    })
    assert missing_source.status_code == 422

    snapshot = client.get(f"/api/v1/projects/{project['id']}/ai-proposals/snapshot", params=[("refs", evidence["id"])]).json()
    proposal_payload = {
        "task_type": "opportunity", "input_entity_references": [evidence["id"]],
        "input_snapshot_hash": snapshot["input_snapshot_hash"], "origin": "manual_ai_import",
        "submission_kind": "external_ai_output", "source_confirmed": True,
        "source_description": "用户粘贴的外部脱敏候选", "prompt_template_version": "manual_v1",
        "output_schema_version": "ai_proposal_v1", "candidates": [{"title": "外部候选"}], "actor": "验收负责人",
    }
    proposed_source = client.post(f"/api/v1/projects/{project['id']}/ai-proposals/import", json=proposal_payload).json()
    proposed_bypass = client.post(f"/api/v1/projects/{project['id']}/opportunities", json={
        "title": "绕过proposed复核", "description": "不得生成正式对象", "evidence_ids": [evidence["id"]],
        "source_proposal_id": proposed_source["id"], "human_reason": "绕过测试", "actor": "验收负责人",
        "data_nature": "manual_import",
    })
    assert proposed_bypass.status_code == 409
    rejected_source = client.patch(f"/api/v1/ai-proposals/{proposed_source['id']}/review", json={
        "decision": "rejected", "reviewer": "验收负责人", "review_reason": "人工拒绝该来源候选",
        "candidate_index": 0, "revision": proposed_source["revision"],
    }).json()
    rejected_bypass = client.post(f"/api/v1/projects/{project['id']}/opportunities", json={
        "title": "绕过rejected复核", "description": "不得生成正式对象", "evidence_ids": [evidence["id"]],
        "source_proposal_id": rejected_source["id"], "human_reason": "绕过测试", "actor": "验收负责人",
        "data_nature": "manual_import",
    })
    assert rejected_bypass.status_code == 409

    proposal = client.post(f"/api/v1/projects/{project['id']}/ai-proposals/import", json=proposal_payload).json()
    accepted_source = client.patch(f"/api/v1/ai-proposals/{proposal['id']}/review", json={
        "decision": "accepted", "reviewer": "验收负责人", "review_reason": "确认来源后人工接受候选",
        "candidate_index": 0, "revision": proposal["revision"],
    })
    assert accepted_source.status_code == 200
    proposal = accepted_source.json()
    opportunity = next(
        item for item in client.get(f"/api/v1/projects/{project['id']}/workbench").json()["opportunities"]
        if item["source_proposal_id"] == proposal["id"]
    )
    accepted_reuse = client.post(f"/api/v1/projects/{project['id']}/opportunities", json={
        "title": "重复复用已接受来源", "description": "不得生成第二个正式对象", "evidence_ids": [evidence["id"]],
        "source_proposal_id": proposal["id"], "actor": "验收负责人", "data_nature": "manual_import",
    })
    assert accepted_reuse.status_code == 409
    universe = client.post(f"/api/v1/projects/{project['id']}/scenarios/generate", json={
        "opportunity_id": opportunity["id"], "assumption_id": assumption["id"], "evidence_ids": [evidence["id"]],
        "priority_inputs": {}, "actor": "验收负责人",
    }).json()
    source_scenario = client.patch(f"/api/v1/scenarios/{universe[0]['id']}", json={
        "status": "shortlisted", "owner": "验收负责人", "review_reason": "人工选择用于来源边界测试",
        "evidence_ids": [evidence["id"]], "actor": "验收负责人", "revision": universe[0]["revision"],
    }).json()
    no_concept_source = client.post(f"/api/v1/projects/{project['id']}/concepts", json={
        "opportunity_id": opportunity["id"], "source_scenario_id": source_scenario["id"],
        "name": "无来源导入概念", "actor": "验收负责人", "data_nature": "manual_import",
    })
    assert no_concept_source.status_code == 422
    mismatched_concept_source = client.post(f"/api/v1/projects/{project['id']}/concepts", json={
        "opportunity_id": opportunity["id"], "source_scenario_id": source_scenario["id"],
        "name": "错误复用Opportunity来源", "source_proposal_id": proposal["id"],
        "selection_reason": "人工选择", "actor": "验收负责人", "data_nature": "manual_import",
    })
    assert mismatched_concept_source.status_code == 422
    assert "目标实体类型不匹配" in mismatched_concept_source.text
    concept = client.post(f"/api/v1/projects/{project['id']}/concepts", json={
        "opportunity_id": opportunity["id"], "source_scenario_id": source_scenario["id"],
        "name": "人工自写概念", "selection_reason": "人工选择", "actor": "验收负责人",
    })
    assert concept.status_code == 201
    content_payload = {
        "concept_id": concept.json()["id"], "opportunity_id": opportunity["id"], "channel": "电商",
        "target_user": "待验证人群", "scenario": "待验证场景", "objective": "验证",
        "experiment_hypothesis": "待验证", "body": "待验证内容", "actor": "验收负责人", "data_nature": "manual_import",
    }
    assert client.post(f"/api/v1/projects/{project['id']}/content-assets", json=content_payload).status_code == 422
    assert client.post(f"/api/v1/projects/{project['id']}/content-assets", json={**content_payload, "source_proposal_id": proposal["id"]}).status_code == 422
    content = client.post(f"/api/v1/projects/{project['id']}/content-assets", json={
        **content_payload, "data_nature": "manual_hypothesis",
    })
    assert content.status_code == 201
    change_payload = {
        "target_entity_type": "content_asset", "target_entity_id": content.json()["id"], "proposed_patch": {"body": "人工调整"},
        "rationale": "来源候选经人工复核", "actor": "验收负责人", "data_nature": "manual_import",
    }
    assert client.post(f"/api/v1/projects/{project['id']}/change-proposals", json=change_payload).status_code == 422
    assert client.post(f"/api/v1/projects/{project['id']}/change-proposals", json={**change_payload, "source_proposal_id": proposal["id"]}).status_code == 422

    spoof_external_as_manual = client.post(f"/api/v1/projects/{project['id']}/opportunities", json={
        "title": "冒充人工自写", "description": "指向外部AI候选", "source_proposal_id": proposal["id"],
        "actor": "验收负责人", "data_nature": "manual_hypothesis",
    })
    assert spoof_external_as_manual.status_code == 422
    honest_manual = client.post(f"/api/v1/projects/{project['id']}/opportunities", json={
        "title": "人工自写假设", "description": "没有伪造AI来源", "actor": "验收负责人",
    })
    assert honest_manual.status_code == 201 and honest_manual.json()["data_nature"] == "manual_hypothesis"

    session_generator = app.dependency_overrides[get_session]()
    session = next(session_generator)
    try:
        session.add(AIProposal(
            id="aip_unverified_ai", project_id=project["id"], task_type="opportunity", input_snapshot_hash="0" * 64,
            origin="provider_optional", provider="provider-disabled", model="unverified", prompt_template_version="legacy",
            output_schema_version="ai_proposal_v1", candidates_json='[{"title":"未验收AI"}]', data_nature="ai_proposal",
        ))
        session.add(AIProposal(
            id="aip_legacy_unconfirmed", project_id=project["id"], task_type="opportunity", input_snapshot_hash="0" * 64,
            origin="manual_ai_import", prompt_template_version="legacy", output_schema_version="ai_proposal_v1",
            candidates_json='[{"title":"旧版无来源确认"}]', data_nature="manual_import",
        ))
        session.commit()
    finally:
        session_generator.close()
    unverified_ai_source = client.post(f"/api/v1/projects/{project['id']}/opportunities", json={
        "title": "未验收AI来源", "description": "禁止", "source_proposal_id": "aip_unverified_ai",
        "actor": "验收负责人", "data_nature": "manual_hypothesis",
    })
    assert unverified_ai_source.status_code == 422
    legacy_review = client.patch("/api/v1/ai-proposals/aip_legacy_unconfirmed/review", json={
        "decision": "accepted", "reviewer": "验收负责人", "review_reason": "尝试接受旧版无来源记录",
        "candidate_index": 0, "revision": 1,
    })
    assert legacy_review.status_code == 422
    assert "缺少持久化来源确认" in legacy_review.text


def test_cross_project_workbench_references_are_rejected(client, project):
    evidence, assumption, opportunity, concept = make_real_chain(client, project)
    other = client.post("/api/v1/projects", json={"name": "外部隔离项目", "decision_question": "不得被引用"}).json()
    other_evidence, other_assumption, other_opportunity, other_concept = make_real_chain(client, other)
    other_bundle = client.get(f"/api/v1/projects/{other['id']}/workbench").json()
    other_proposal = other_bundle["ai_proposals"][0]

    cross_scenario = client.post(f"/api/v1/projects/{project['id']}/concepts", json={
        "opportunity_id": opportunity["id"], "source_scenario_id": other_concept["source_scenario_id"],
        "name": "跨项目Scenario来源", "actor": "验收负责人",
    })
    assert cross_scenario.status_code == 404

    cross_source = client.post(f"/api/v1/projects/{project['id']}/opportunities", json={
        "title": "跨项目来源", "description": "应拒绝", "evidence_ids": [evidence["id"]],
        "source_proposal_id": other_proposal["id"], "actor": "验收负责人", "data_nature": "manual_import",
    })
    assert cross_source.status_code == 404
    cross_content = client.post(f"/api/v1/projects/{project['id']}/content-assets", json={
        "concept_id": concept["id"], "channel": "电商", "target_user": "待验证人群", "scenario": "待验证场景",
        "objective": "验证", "experiment_hypothesis": "待验证", "body": "待验证内容",
        "source_proposal_id": other_proposal["id"], "actor": "验收负责人", "data_nature": "manual_import",
    })
    assert cross_content.status_code == 404
    cross_claim = client.post(f"/api/v1/projects/{project['id']}/content-assets", json={
        "concept_id": concept["id"], "channel": "电商", "target_user": "待验证人群", "scenario": "待验证场景",
        "objective": "验证", "experiment_hypothesis": "待验证", "body": "待验证内容",
        "claim_refs": [other_evidence["id"]], "actor": "验收负责人",
    })
    assert cross_claim.status_code == 422
    second_opportunity = client.post(f"/api/v1/projects/{project['id']}/opportunities", json={
        "title": "第二机会假设", "description": "用于父子关系隔离测试", "actor": "验收负责人",
    }).json()
    mismatched_parent = client.post(f"/api/v1/projects/{project['id']}/content-assets", json={
        "concept_id": concept["id"], "opportunity_id": second_opportunity["id"], "channel": "电商",
        "target_user": "待验证人群", "scenario": "待验证场景", "objective": "验证",
        "experiment_hypothesis": "待验证", "body": "待验证内容", "actor": "验收负责人",
    })
    assert mismatched_parent.status_code == 422

    other_content = client.post(f"/api/v1/projects/{other['id']}/content-assets", json={
        "concept_id": other_concept["id"], "channel": "电商", "target_user": "外部人群", "scenario": "外部场景",
        "objective": "外部验证", "experiment_hypothesis": "外部假设", "body": "外部内容", "actor": "外部负责人",
    }).json()
    header = "channel,content_asset_id,window_start,window_end,source,impressions,clicks,interactions,saves,add_to_cart,conversions,metric_definition,owner,data_nature\n"
    foreign_row = f"电商,{other_content['id']},2026-08-20T00:00:00+00:00,2026-08-21T00:00:00+00:00,UAT,10,2,1,0,0,0,定义,负责人,manual_import\n"
    assert client.post(f"/api/v1/projects/{project['id']}/feedback/import", files={"file": ("feedback.csv", (header + foreign_row).encode(), "text/csv")}).status_code == 404

    current_content = client.post(f"/api/v1/projects/{project['id']}/content-assets", json={
        "concept_id": concept["id"], "channel": "电商", "target_user": "当前人群", "scenario": "当前场景",
        "objective": "当前验证", "experiment_hypothesis": "当前假设", "body": "当前内容", "actor": "当前负责人",
    }).json()
    other_row = f"电商,{other_content['id']},2026-08-20T00:00:00+00:00,2026-08-21T00:00:00+00:00,UAT,10,2,1,0,0,0,定义,负责人,manual_import\n"
    other_feedback = client.post(f"/api/v1/projects/{other['id']}/feedback/import", files={"file": ("feedback.csv", (header + other_row).encode(), "text/csv")}).json()["ids"][0]
    assumption_header = header.strip() + ",assumption_id\n"
    assumption_row = f"电商,{current_content['id']},2026-08-22T00:00:00+00:00,2026-08-23T00:00:00+00:00,UAT-2,10,2,1,0,0,0,定义,负责人,manual_import,{other_assumption['id']}\n"
    cross_assumption = client.post(f"/api/v1/projects/{project['id']}/feedback/import", files={"file": ("feedback.csv", (assumption_header + assumption_row).encode(), "text/csv")})
    assert cross_assumption.status_code == 404
    cross_target = client.post(f"/api/v1/projects/{project['id']}/change-proposals", json={
        "target_entity_type": "product_concept", "target_entity_id": other_concept["id"],
        "proposed_patch": {"need": "x"}, "rationale": "跨项目目标", "actor": "验收负责人",
    })
    assert cross_target.status_code == 404
    cross_feedback = client.post(f"/api/v1/projects/{project['id']}/change-proposals", json={
        "target_entity_type": "content_asset", "target_entity_id": current_content["id"], "feedback_ids": [other_feedback],
        "proposed_patch": {"body": "x"}, "rationale": "跨项目反馈", "actor": "验收负责人",
    })
    assert cross_feedback.status_code == 404

    snapshot = client.get(f"/api/v1/projects/{project['id']}/ai-proposals/snapshot", params=[("refs", evidence["id"])]).json()
    proposal_base = {
        "task_type": "change_proposal", "input_entity_references": [evidence["id"]],
        "input_snapshot_hash": snapshot["input_snapshot_hash"], "origin": "manual_ai_import",
        "submission_kind": "external_ai_output", "source_confirmed": True,
        "source_description": "用户粘贴的跨项目攻击候选夹具", "prompt_template_version": "manual_v1",
        "output_schema_version": "ai_proposal_v1", "actor": "验收负责人",
    }
    attack_candidates = (
        ({"target_entity_type": "product_concept", "target_entity_id": other_concept["id"], "proposed_patch": {"need": "x"}}, 404),
        ({"target_entity_type": "content_asset", "target_entity_id": current_content["id"], "feedback_ids": [other_feedback], "proposed_patch": {"body": "x"}}, 404),
        ({"target_entity_type": "product_concept", "target_entity_id": concept["id"], "contrary_evidence": [other_evidence["id"]], "proposed_patch": {"need": "x"}}, 422),
    )
    for candidate, _expected_status in attack_candidates:
        proposal = client.post(f"/api/v1/projects/{project['id']}/ai-proposals/import", json={**proposal_base, "candidates": [candidate]})
        assert proposal.status_code == 422
        assert proposal.json()["detail"]["undeclared_candidate_refs"]


def test_content_findings_override_requires_reason_and_keeps_snapshot(client, project):
    evidence, assumption, opportunity, concept = make_real_chain(client, project)
    content = client.post(f"/api/v1/projects/{project['id']}/content-assets", json={
        "concept_id": concept["id"], "opportunity_id": opportunity["id"], "channel": "小红书",
        "target_user": "待验证人群", "scenario": "待验证场景", "objective": "验证声明理解",
        "experiment_hypothesis": "待验证", "body": "100%不起球且零风险", "actor": "内容负责人",
    }).json()
    assert json.loads(content["compliance_findings_json"])
    empty_reason = client.patch(f"/api/v1/content-assets/{content['id']}", json={
        "review_status": "approved", "reviewer": "", "review_reason": "", "actor": "内容负责人", "revision": content["revision"],
    })
    assert empty_reason.status_code == 422
    approved = client.patch(f"/api/v1/content-assets/{content['id']}", json={
        "review_status": "approved", "reviewer": "人工审核人", "review_reason": "仅供受控测试，保留风险标记并禁止公开投放",
        "actor": "人工审核人", "revision": content["revision"],
    })
    assert approved.status_code == 200
    saved = approved.json()
    assert saved["reviewed_at"] is not None
    assert saved["reviewer"] == "人工审核人"
    assert saved["review_reason"] == "仅供受控测试，保留风险标记并禁止公开投放"
    assert json.loads(saved["review_findings_snapshot_json"]) == json.loads(saved["compliance_findings_json"])
    audit_events = client.get(f"/api/v1/projects/{project['id']}/workbench").json()["audit_events"]
    event = next(item for item in audit_events if item["entity_id"] == content["id"] and item["action"] == "approved_with_findings_override")
    metadata = json.loads(event["metadata_json"])
    assert metadata["review_reason"] == saved["review_reason"]
    assert metadata["findings_snapshot"] == json.loads(saved["compliance_findings_json"])
    edited = client.patch(f"/api/v1/content-assets/{content['id']}", json={
        "body": "修改后的普通待验证内容", "actor": "内容负责人", "revision": saved["revision"],
    })
    assert edited.status_code == 200
    assert edited.json()["review_status"] == "pending"
    assert edited.json()["reviewer"] == "" and edited.json()["review_reason"] == ""
    assert edited.json()["reviewed_at"] is None
    assert json.loads(edited.json()["review_findings_snapshot_json"]) == []


def test_content_review_governance_fields_cannot_be_cleared_while_remaining_approved(client, project):
    _, _, opportunity, concept = make_real_chain(client, project)
    content = client.post(f"/api/v1/projects/{project['id']}/content-assets", json={
        "concept_id": concept["id"], "opportunity_id": opportunity["id"], "channel": "小红书",
        "target_user": "待验证人群", "scenario": "待验证场景", "objective": "验证声明理解",
        "experiment_hypothesis": "待验证", "body": "100%不起球且零风险", "actor": "内容负责人",
    }).json()
    findings = json.loads(content["compliance_findings_json"])
    assert findings
    approved = client.patch(f"/api/v1/content-assets/{content['id']}", json={
        "review_status": "approved", "reviewer": "人工审核人", "review_reason": "仅用于受控治理测试",
        "actor": "人工审核人", "revision": content["revision"],
    })
    assert approved.status_code == 200, approved.text
    assert approved.json()["review_status"] == "approved"
    assert json.loads(approved.json()["review_findings_snapshot_json"]) == findings

    bypass = client.patch(f"/api/v1/content-assets/{content['id']}", json={
        "reviewer": "", "review_reason": "", "actor": "绕过测试操作者",
        "revision": approved.json()["revision"],
    })
    assert bypass.status_code == 200, bypass.text
    reset = bypass.json()
    assert reset["review_status"] == "pending"
    assert reset["reviewer"] == "" and reset["review_reason"] == ""
    assert reset["reviewed_at"] is None
    assert json.loads(reset["review_findings_snapshot_json"]) == []
    assert json.loads(reset["compliance_findings_json"]) == findings

    non_approval = client.patch(f"/api/v1/content-assets/{content['id']}", json={
        "review_status": "changes", "reviewer": "伪造审核人", "review_reason": "不得写入",
        "actor": "内容负责人", "revision": reset["revision"],
    })
    assert non_approval.status_code == 200, non_approval.text
    assert non_approval.json()["review_status"] == "changes"
    assert non_approval.json()["reviewer"] == "" and non_approval.json()["review_reason"] == ""
    assert non_approval.json()["reviewed_at"] is None
    assert json.loads(non_approval.json()["review_findings_snapshot_json"]) == []

    events = client.get(f"/api/v1/projects/{project['id']}/workbench").json()["audit_events"]
    bypass_event = next(
        item for item in events
        if item["entity_id"] == content["id"]
        and json.loads(item["metadata_json"]).get("review_reset") == ["review_governance_changed_without_approval"]
    )
    assert set(bypass_event["change_summary"].split(",")) == {"review_reason", "reviewer"}


def test_direct_content_material_patch_stales_feedback_and_recommendation(client, project):
    evidence, _, opportunity, concept = make_real_chain(client, project)
    content = client.post(f"/api/v1/projects/{project['id']}/content-assets", json={
        "concept_id": concept["id"], "opportunity_id": opportunity["id"], "channel": "小红书",
        "target_user": "待验证人群", "scenario": "待验证场景", "objective": "验证规格理解",
        "experiment_hypothesis": "待验证", "body": "全棉材质，须以成分检测为准",
        "evidence_ids": [evidence["id"]], "actor": "内容负责人",
    }).json()
    approved = client.patch(f"/api/v1/content-assets/{content['id']}", json={
        "review_status": "approved", "reviewer": "人工审核人", "review_reason": "已核对当前内容版本",
        "actor": "人工审核人", "revision": content["revision"],
    })
    assert approved.status_code == 200, approved.text

    header = "channel,content_asset_id,window_start,window_end,source,impressions,clicks,interactions,saves,add_to_cart,conversions,metric_definition,owner,data_nature\n"
    row = f"小红书,{content['id']},2026-08-20T00:00:00+00:00,2026-08-21T00:00:00+00:00,DIRECT-PATCH,20,4,3,1,0,0,固定测试口径,负责人,manual_import\n"
    imported = client.post(
        f"/api/v1/projects/{project['id']}/feedback/import",
        files={"file": ("feedback.csv", (header + row).encode(), "text/csv")},
    )
    assert imported.status_code == 201, imported.text
    feedback_id = imported.json()["ids"][0]
    policy = client.post(
        f"/api/v1/projects/{project['id']}/recommendation-policies", params={"actor": "验收负责人"}
    )
    assert policy.status_code == 201, policy.text
    pending_change = client.post(f"/api/v1/projects/{project['id']}/change-proposals", json={
        "target_entity_type": "content_asset", "target_entity_id": content["id"],
        "feedback_ids": [], "proposed_patch": {"body": "基于旧内容版本的待审变更"},
        "rationale": "等待人工复核的旧内容提案", "actor": "验收负责人",
    })
    assert pending_change.status_code == 201, pending_change.text

    patched = client.patch(f"/api/v1/content-assets/{content['id']}", json={
        "body": "全棉材质，修改后的内容版本仍待重新审核",
        "actor": "内容负责人", "revision": approved.json()["revision"],
    })
    assert patched.status_code == 200, patched.text
    assert patched.json()["review_status"] == "pending"
    assert patched.json()["reviewer"] == "" and patched.json()["review_reason"] == ""

    bundle = client.get(f"/api/v1/projects/{project['id']}/workbench").json()
    feedback = next(item for item in bundle["feedback_records"] if item["id"] == feedback_id)
    recommendation = next(item for item in bundle["recommendation_policies"] if item["id"] == policy.json()["id"])
    stale_change = next(item for item in bundle["change_proposals"] if item["id"] == pending_change.json()["id"])
    assert feedback["is_stale"] is True
    assert recommendation["is_stale"] is True
    assert stale_change["is_stale"] is True
    assert content["id"] in feedback["stale_reason"]
    assert content["id"] in recommendation["stale_reason"]
    event = next(
        item for item in bundle["audit_events"]
        if item["entity_id"] == content["id"]
        and json.loads(item["metadata_json"]).get("stale_feedback_ids") == [feedback_id]
    )
    metadata = json.loads(event["metadata_json"])
    assert event["action"] == "updated"
    assert metadata["stale_recommendation_policy_ids"] == [policy.json()["id"]]
    assert metadata["stale_change_proposal_ids"] == [pending_change.json()["id"]]
    assert content["id"] in metadata["derived_records_stale_reason"]
    cannot_accept_old_change = client.patch(
        f"/api/v1/change-proposals/{pending_change.json()['id']}/review",
        json={
            "decision": "accepted", "reviewer": "人工审核人", "review_reason": "不得接受旧内容提案",
            "revision": pending_change.json()["revision"],
        },
    )
    assert cannot_accept_old_change.status_code == 409


def test_accepting_content_change_rechecks_claims_and_stales_derived_records(client, project):
    evidence, _, opportunity, concept = make_real_chain(client, project)
    content = client.post(f"/api/v1/projects/{project['id']}/content-assets", json={
        "concept_id": concept["id"], "opportunity_id": opportunity["id"], "channel": "小红书",
        "target_user": "待验证人群", "scenario": "待验证场景", "objective": "验证规格理解",
        "experiment_hypothesis": "待验证", "body": "全棉材质，须以成分检测为准",
        "evidence_ids": [evidence["id"]], "actor": "内容负责人",
    }).json()
    assert json.loads(content["compliance_findings_json"]) == []
    approved = client.patch(f"/api/v1/content-assets/{content['id']}", json={
        "review_status": "approved", "reviewer": "人工审核人", "review_reason": "已核对当前Evidence和声明",
        "actor": "人工审核人", "revision": content["revision"],
    })
    assert approved.status_code == 200, approved.text
    assert approved.json()["review_status"] == "approved"
    assert approved.json()["reviewed_at"] is not None

    header = "channel,content_asset_id,window_start,window_end,source,impressions,clicks,interactions,saves,add_to_cart,conversions,metric_definition,owner,data_nature\n"
    row = f"小红书,{content['id']},2026-08-20T00:00:00+00:00,2026-08-21T00:00:00+00:00,UAT-CONTENT,20,4,3,1,0,0,固定测试口径,负责人,manual_import\n"
    imported = client.post(
        f"/api/v1/projects/{project['id']}/feedback/import",
        files={"file": ("feedback.csv", (header + row).encode(), "text/csv")},
    )
    assert imported.status_code == 201, imported.text
    feedback_id = imported.json()["ids"][0]
    policy = client.post(
        f"/api/v1/projects/{project['id']}/recommendation-policies", params={"actor": "验收负责人"}
    )
    assert policy.status_code == 201, policy.text

    change = client.post(f"/api/v1/projects/{project['id']}/change-proposals", json={
        "target_entity_type": "content_asset", "target_entity_id": content["id"],
        "feedback_ids": [feedback_id], "proposed_patch": {"body": "100%不起球且零风险"},
        "rationale": "旧反馈提出高风险文案，仅用于验证重新检查路径", "actor": "验收负责人",
    })
    assert change.status_code == 201, change.text
    sibling_change = client.post(f"/api/v1/projects/{project['id']}/change-proposals", json={
        "target_entity_type": "content_asset", "target_entity_id": content["id"],
        "feedback_ids": [], "proposed_patch": {"cta": "另一个基于旧版本的待审CTA"},
        "rationale": "同一旧内容版本的并行提案", "actor": "验收负责人",
    })
    assert sibling_change.status_code == 201, sibling_change.text
    accepted = client.patch(f"/api/v1/change-proposals/{change.json()['id']}/review", json={
        "decision": "accepted", "reviewer": "人工审核人", "review_reason": "仅验证风险变更后的治理重置",
        "revision": change.json()["revision"],
    })
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["status"] == "accepted"

    bundle = client.get(f"/api/v1/projects/{project['id']}/workbench").json()
    saved = next(item for item in bundle["content_assets"] if item["id"] == content["id"])
    findings = json.loads(saved["compliance_findings_json"])
    assert saved["body"] == "100%不起球且零风险"
    assert {item["type"] for item in findings} >= {"prohibited_term", "absolute_claim"}
    assert saved["review_status"] == "pending"
    assert saved["reviewer"] == "" and saved["review_reason"] == ""
    assert saved["reviewed_at"] is None
    assert json.loads(saved["review_findings_snapshot_json"]) == []
    assert json.loads(saved["edited_snapshot"])["body"] == saved["body"]
    stale_feedback = next(item for item in bundle["feedback_records"] if item["id"] == feedback_id)
    stale_policy = next(item for item in bundle["recommendation_policies"] if item["id"] == policy.json()["id"])
    stale_sibling = next(item for item in bundle["change_proposals"] if item["id"] == sibling_change.json()["id"])
    accepted_change = next(item for item in bundle["change_proposals"] if item["id"] == change.json()["id"])
    assert stale_feedback["is_stale"] is True
    assert stale_policy["is_stale"] is True
    assert stale_sibling["is_stale"] is True
    assert accepted_change["status"] == "accepted" and accepted_change["is_stale"] is False
    assert change.json()["id"] in stale_feedback["stale_reason"]
    assert change.json()["id"] in stale_policy["stale_reason"]

    content_audit = next(
        item for item in bundle["audit_events"]
        if item["entity_id"] == content["id"] and item["action"] == "change_proposal_applied"
    )
    content_metadata = json.loads(content_audit["metadata_json"])
    assert content_metadata["change_proposal_id"] == change.json()["id"]
    assert content_metadata["review_reset"] is True
    assert content_metadata["new_findings"] == findings
    assert content_metadata["stale_feedback_ids"] == [feedback_id]
    assert content_metadata["stale_recommendation_policy_ids"] == [policy.json()["id"]]
    assert content_metadata["stale_change_proposal_ids"] == [sibling_change.json()["id"]]
    change_audit = next(
        item for item in bundle["audit_events"]
        if item["entity_id"] == change.json()["id"] and item["action"] == "accepted"
    )
    assert json.loads(change_audit["metadata_json"])["review_reset"] is True
    cannot_accept_sibling = client.patch(
        f"/api/v1/change-proposals/{sibling_change.json()['id']}/review",
        json={
            "decision": "accepted", "reviewer": "人工审核人", "review_reason": "不得接受并行旧提案",
            "revision": sibling_change.json()["revision"],
        },
    )
    assert cannot_accept_sibling.status_code == 409


def test_concept_material_change_stales_feedback_change_and_accepted_policy(client, project):
    evidence, _, opportunity, concept = make_real_chain(client, project)
    content = client.post(f"/api/v1/projects/{project['id']}/content-assets", json={
        "concept_id": concept["id"], "opportunity_id": opportunity["id"], "channel": "电商",
        "target_user": "待验证人群", "scenario": "待验证场景", "objective": "验证规格理解",
        "experiment_hypothesis": "待验证", "body": "待验证内容", "evidence_ids": [evidence["id"]],
        "actor": "验收负责人",
    }).json()
    header = "channel,content_asset_id,window_start,window_end,source,impressions,clicks,interactions,saves,add_to_cart,conversions,metric_definition,owner,data_nature\n"
    row = f"电商,{content['id']},2026-08-20T00:00:00+00:00,2026-08-21T00:00:00+00:00,UAT,10,2,1,0,0,0,定义,负责人,manual_import\n"
    feedback_id = client.post(
        f"/api/v1/projects/{project['id']}/feedback/import",
        files={"file": ("feedback.csv", (header + row).encode(), "text/csv")},
    ).json()["ids"][0]
    change = client.post(f"/api/v1/projects/{project['id']}/change-proposals", json={
        "target_entity_type": "content_asset", "target_entity_id": content["id"],
        "feedback_ids": [feedback_id], "proposed_patch": {"body": "旧反馈建议"},
        "rationale": "待人工复核", "actor": "验收负责人",
    }).json()
    policy = client.post(
        f"/api/v1/projects/{project['id']}/recommendation-policies", params={"actor": "验收负责人"}
    ).json()
    accepted_policy = client.patch(f"/api/v1/recommendation-policies/{policy['id']}/review", json={
        "decision": "accepted", "reviewer": "验收负责人", "review_reason": "仅验证失效语义",
        "revision": policy["revision"],
    })
    assert accepted_policy.status_code == 200

    updated = client.patch(f"/api/v1/concepts/{concept['id']}", json={
        "need": "概念实质内容已变化", "actor": "验收负责人", "revision": concept["revision"],
    })
    assert updated.status_code == 200
    bundle = client.get(f"/api/v1/projects/{project['id']}/workbench").json()
    assert next(item for item in bundle["content_assets"] if item["id"] == content["id"])["is_stale"] is True
    assert next(item for item in bundle["feedback_records"] if item["id"] == feedback_id)["is_stale"] is True
    assert next(item for item in bundle["change_proposals"] if item["id"] == change["id"])["is_stale"] is True
    assert next(item for item in bundle["recommendation_policies"] if item["id"] == policy["id"])["is_stale"] is True
    stale_feedback_change = client.post(f"/api/v1/projects/{project['id']}/change-proposals", json={
        "target_entity_type": "product_concept", "target_entity_id": concept["id"],
        "feedback_ids": [feedback_id], "proposed_patch": {"need": "不得复用旧反馈"},
        "rationale": "攻击夹具", "actor": "验收负责人",
    })
    assert stale_feedback_change.status_code == 409


def test_ai_proposal_snapshot_rejects_draft_stale_and_fixed_demo_inputs(client, project):
    from app.database import get_session
    from app.main import app
    from app.workbench_models import Opportunity

    draft = client.post(f"/api/v1/projects/{project['id']}/evidence/manual", json={
        "title": "尚未确认的输入", "publisher": "系统验收夹具", "raw_text": "不得进入建议包快照",
    }).json()
    draft_snapshot = client.get(
        f"/api/v1/projects/{project['id']}/ai-proposals/snapshot", params=[("refs", draft["id"])]
    )
    assert draft_snapshot.status_code == 422
    assert draft["id"] in draft_snapshot.json()["detail"]["blocked"]

    _, _, opportunity, concept = make_real_chain(client, project)
    client.patch(f"/api/v1/opportunities/{opportunity['id']}", json={
        "description": "使旧概念链路失效", "actor": "验收负责人", "revision": opportunity["revision"],
    })
    stale_snapshot = client.get(
        f"/api/v1/projects/{project['id']}/ai-proposals/snapshot", params=[("refs", concept["id"])]
    )
    assert stale_snapshot.status_code == 422
    assert concept["id"] in stale_snapshot.json()["detail"]["blocked"]

    session_generator = app.dependency_overrides[get_session]()
    session = next(session_generator)
    try:
        session.add(Opportunity(
            id="opp_fixed_snapshot_attack", project_id=project["id"], title="固定夹具机会",
            description="不得洗入真实候选", status="confirmed", data_nature="fixed_demo",
        ))
        session.commit()
    finally:
        session_generator.close()
    fixed_snapshot = client.get(
        f"/api/v1/projects/{project['id']}/ai-proposals/snapshot",
        params=[("refs", "opp_fixed_snapshot_attack")],
    )
    assert fixed_snapshot.status_code == 422
    assert "opp_fixed_snapshot_attack" in fixed_snapshot.json()["detail"]["blocked"]


def test_ai_proposal_accept_rechecks_snapshot_after_upstream_change(client, project):
    evidence, _ = seed_evidence_assumption(client, project)
    snapshot = client.get(
        f"/api/v1/projects/{project['id']}/ai-proposals/snapshot", params=[("refs", evidence["id"])]
    ).json()
    proposal = client.post(f"/api/v1/projects/{project['id']}/ai-proposals/import", json={
        "task_type": "opportunity", "input_entity_references": [evidence["id"]],
        "input_snapshot_hash": snapshot["input_snapshot_hash"], "origin": "manual_ai_import",
        "submission_kind": "manual_hypothesis", "source_confirmed": True,
        "source_description": "负责人自行编写的待审候选", "prompt_template_version": "manual_v1",
        "output_schema_version": "ai_proposal_v1", "candidates": [{
            "title": "待审机会", "description": "输入变化后不得接受", "evidence_ids": [evidence["id"]],
        }], "actor": "验收负责人",
    }).json()
    changed = client.patch(f"/api/v1/evidence/{evidence['id']}", json={
        "summary": "Evidence在候选导入后发生实质变化",
    })
    assert changed.status_code == 200
    review = client.patch(f"/api/v1/ai-proposals/{proposal['id']}/review", json={
        "decision": "accepted", "reviewer": "验收负责人", "review_reason": "尝试接受旧快照",
        "candidate_index": 0, "revision": proposal["revision"],
    })
    assert review.status_code == 409
    bundle = client.get(f"/api/v1/projects/{project['id']}/workbench").json()
    assert bundle["opportunities"] == []
    saved = next(item for item in bundle["ai_proposals"] if item["id"] == proposal["id"])
    assert saved["is_stale"] is True
    assert "输入快照已变化" in saved["stale_reason"]


def test_ai_proposal_candidate_references_must_be_in_declared_snapshot(client, project):
    declared, _ = seed_evidence_assumption(client, project)
    undeclared = client.post(f"/api/v1/projects/{project['id']}/evidence/manual", json={
        "title": "未纳入输入快照的Evidence", "publisher": "系统验收夹具",
        "raw_text": "候选不得通过未声明引用绕开快照复核。",
    }).json()
    undeclared = client.post(f"/api/v1/evidence/{undeclared['id']}/confirm").json()
    snapshot = client.get(
        f"/api/v1/projects/{project['id']}/ai-proposals/snapshot",
        params=[("refs", declared["id"])],
    ).json()
    imported = client.post(f"/api/v1/projects/{project['id']}/ai-proposals/import", json={
        "task_type": "opportunity", "input_entity_references": [declared["id"]],
        "input_snapshot_hash": snapshot["input_snapshot_hash"], "origin": "manual_ai_import",
        "submission_kind": "manual_hypothesis", "source_confirmed": True,
        "source_description": "负责人自行编写的待审候选", "prompt_template_version": "manual_v1",
        "output_schema_version": "ai_proposal_v1", "candidates": [{
            "title": "引用绕过候选", "description": "不得导入",
            "evidence_ids": [undeclared["id"]],
        }], "actor": "验收负责人",
    })
    assert imported.status_code == 422
    assert imported.json()["detail"]["undeclared_candidate_refs"] == [undeclared["id"]]
    assert client.get(f"/api/v1/projects/{project['id']}/workbench").json()["ai_proposals"] == []
