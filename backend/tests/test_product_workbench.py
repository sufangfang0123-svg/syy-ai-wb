from __future__ import annotations

import json


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


def make_real_chain(client, project):
    evidence, assumption = seed_evidence_assumption(client, project)
    refs = [project["id"], evidence["id"], assumption["id"]]
    import_accept(client, project["id"], "opportunity", refs, {
        "title": "轻适通勤内搭机会（待验证）", "description": "比赛概念候选，不代表市场需求。",
        "evidence_ids": [evidence["id"]], "contrary_evidence": [], "alternatives": ["既有基础款"],
        "assumption_ids": [assumption["id"]], "category_fit": "有纺服装字段匹配，仍需人工验证",
    })
    opportunity = client.get(f"/api/v1/projects/{project['id']}/workbench").json()["opportunities"][0]
    import_accept(client, project["id"], "product_concept", [*refs, opportunity["id"]], {
        "opportunity_id": opportunity["id"], "name": "全棉轻适通勤内搭（比赛概念方案，非全棉时代正式产品）",
        "target_user": "通勤人群假设", "scenario": "空调办公与日常通勤假设", "need": "降低穿着打扰假设",
        "genes": ["合体版型假设", "圆领变量"], "material_hypothesis": "全棉成分待检测确认",
        "specification_hypothesis": "克重待企业技术确认", "price_hypothesis": "价格未获得真实证据",
        "unique_variable": "领口形态", "evidence_ids": [evidence["id"]], "assumption_ids": [assumption["id"]],
        "supply_risk": "起订量与交期待报价", "compliance_risk": "材质声明须有检测支持",
    })
    concept = client.get(f"/api/v1/projects/{project['id']}/workbench").json()["concepts"][0]
    return evidence, assumption, opportunity, concept


def test_category_pack_and_proposal_boundaries(client, project):
    packs = client.get("/api/v1/category-packs").json()
    assert {item["id"] for item in packs} == {"woven_apparel_v1", "legacy_nonwoven_cotton_care_v1"}
    assert client.get(f"/api/v1/projects/{project['id']}").json()["category_pack_id"] == "woven_apparel_v1"
    evidence, _ = seed_evidence_assumption(client, project)
    bad = client.post(f"/api/v1/projects/{project['id']}/ai-proposals/import", json={
        "task_type": "opportunity", "input_entity_references": [evidence["id"]], "input_snapshot_hash": "0" * 64,
        "origin": "manual_ai_import", "prompt_template_version": "manual_v1", "output_schema_version": "ai_proposal_v1",
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
    evidence, assumption, opportunity, concept = make_real_chain(client, project)
    scenarios = client.post(f"/api/v1/projects/{project['id']}/scenarios/generate", json={
        "opportunity_id": opportunity["id"], "concept_id": concept["id"], "assumption_id": assumption["id"],
        "evidence_ids": [evidence["id"]], "priority_inputs": {}, "actor": "验收负责人",
    })
    assert scenarios.status_code == 201, scenarios.text
    assert len(scenarios.json()) == 100
    assert all(item["priority"] is None for item in scenarios.json())
    assert all(len(json.loads(item["missing_inputs_json"])) == 8 for item in scenarios.json())
    first = scenarios.json()[0]
    reviewed = client.patch(f"/api/v1/scenarios/{first['id']}", json={
        "status": "validation", "owner": "验收负责人", "review_reason": "人工选择进入Validation",
        "actor": "验收负责人", "revision": first["revision"],
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
        "actor": "验收负责人", "data_nature": "real_entry",
    })
    assert change.status_code == 201
    accepted = client.patch(f"/api/v1/change-proposals/{change.json()['id']}/review", json={
        "decision": "accepted", "reviewer": "验收负责人", "review_reason": "人工确认只变更need字段", "revision": 1,
    })
    assert accepted.status_code == 200, accepted.text
    bundle = client.get(f"/api/v1/projects/{project['id']}/workbench").json()
    assert bundle["concepts"][0]["need"] == "根据人工复核反馈，改为优先验证规格理解"
    assert all(item["is_stale"] for item in bundle["scenarios"])
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


def test_gate_rule_version_unchanged(client, project):
    gate = client.post(f"/api/v1/projects/{project['id']}/gate")
    assert gate.status_code == 201
    assert gate.json()["rule_version"] == "NDG_GATE_V0.3.0"
