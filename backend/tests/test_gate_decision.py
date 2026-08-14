import json

DIMENSIONS = ["NEED", "COMMERCIAL", "PRODUCT", "SUPPLY", "COMPLIANCE"]


def seed_dimensions(client, project_id):
    assumptions = []
    for index, dimension in enumerate(DIMENSIONS):
        evidence = client.post(f"/api/v1/projects/{project_id}/evidence/paste", json={"title": f"{dimension}证据", "publisher": "受控测试", "raw_text": f"{dimension} 的独立事实 {index}", "applicable_scope": "本项目", "limitations": "仅用于试点"}).json()
        client.post(f"/api/v1/evidence/{evidence['id']}/confirm")
        assumption = client.post(f"/api/v1/projects/{project_id}/assumptions", json={"statement": f"{dimension}关键假设具备成立条件", "criticality": 5, "dimension": dimension, "potential_loss": 10000 + index, "avoidable_loss": 5000 + index}).json()
        client.post(f"/api/v1/assumptions/{assumption['id']}/links", json={"evidence_id": evidence["id"], "direction": "support", "strength": 4})
        assumptions.append(assumption)
    return assumptions


def add_round_tests(client, project_id, assumptions, actuals):
    tests = []
    for assumption, actual in zip(assumptions, actuals):
        test = client.post(f"/api/v1/projects/{project_id}/tests", json={"assumption_id": assumption["id"], "name": f"{assumption['dimension']}指标验证", "method": "受控样本测量", "estimated_cost": 100, "estimated_days": 1, "success_criterion": "指标达到60%", "metric_name": "通过率", "metric_unit": "%", "direction": "at_least", "baseline_value": 40, "threshold_value": 60, "stop_threshold": 30}).json()
        if actual is not None:
            result = client.post(f"/api/v1/tests/{test['id']}/result", json={"actual_value": actual, "sample_size": 20, "executed_at": "2026-08-14T08:00:00Z", "source": "受控测试报告", "summary": f"实际值{actual}"})
            assert result.status_code == 201
        tests.append(test)
    return tests


def decide(client, project_id, gate, decision=None):
    return client.post(f"/api/v1/projects/{project_id}/decision", json={"gate_evaluation_id": gate["id"], "decision": decision or gate["result"], "rationale": "负责人复核规则快照后确认", "decided_by": "试点负责人（自我声明）"})


def test_empty_and_partial_dimensions_are_supplement(client, project):
    empty = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    assert empty["result"] == "SUPPLEMENT"
    assert json.loads(empty["snapshot"])["rule_version"] == "NDG_GATE_V0.3.0"
    assumptions = seed_dimensions(client, project["id"])
    add_round_tests(client, project["id"], assumptions, [None] * 5)
    gate = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    assert gate["result"] == "SUPPLEMENT"
    assert set(json.loads(gate["snapshot"])["dimension_states"]) == set(DIMENSIONS)


def test_all_dimensions_pass_and_snapshot_trace(client, project):
    assumptions = seed_dimensions(client, project["id"])
    add_round_tests(client, project["id"], assumptions, [70] * 5)
    gate = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    assert gate["result"] == "CONTINUE"
    snapshot = json.loads(gate["snapshot"])
    assert set(snapshot["dimension_states"].values()) == {"CONTINUE"}
    assert all(item["links"][0]["evidence_id"] for item in snapshot["assumptions"])


def test_threshold_derivation_and_hard_stop_precedence(client, project):
    assumptions = seed_dimensions(client, project["id"])
    tests = add_round_tests(client, project["id"], assumptions, [70, 70, 20, 70, 70])
    results = client.get(f"/api/v1/projects/{project['id']}/results").json()
    stopped = next(item for item in results if item["validation_test_id"] == tests[2]["id"])
    assert stopped["derived_outcome"] == "stop"
    assert json.loads(stopped["calculation_snapshot"])["actual"] == 20
    gate = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    assert gate["result"] == "STOP"
    assert "STOP-02" in {item["rule"] for item in json.loads(gate["reasons"])}


def test_conflict_is_supplement_and_gate_stales_on_governance_change(client, project):
    assumptions = seed_dimensions(client, project["id"])
    add_round_tests(client, project["id"], assumptions, [70] * 5)
    first = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    evidence = client.get(f"/api/v1/projects/{project['id']}/evidence").json()
    client.post(f"/api/v1/projects/{project['id']}/evidence-relations", json={"source_evidence_id": evidence[0]["id"], "target_evidence_id": evidence[1]["id"], "relation_type": "conflicts", "notes": "待复核"})
    assert client.get(f"/api/v1/projects/{project['id']}/gate/current").status_code == 404
    second = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    assert second["result"] == "SUPPLEMENT" and second["id"] != first["id"]
    assert client.get(f"/api/v1/projects/{project['id']}/gates").json()[1]["is_stale"] is True


def test_human_decision_cannot_be_more_aggressive(client, project):
    gate = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    assert decide(client, project["id"], gate, "CONTINUE").status_code == 422
    accepted = decide(client, project["id"], gate, "STOP")
    assert accepted.status_code == 201
    assert accepted.json()["decided_by"].endswith("（自我声明）")


def test_round_creation_stales_but_preserves_history(client, project):
    assumptions = seed_dimensions(client, project["id"])
    add_round_tests(client, project["id"], assumptions, [70] * 5)
    gate = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    decision = decide(client, project["id"], gate).json()
    next_round = client.post(f"/api/v1/projects/{project['id']}/rounds/next", json={"selected_assumption_ids": [item["id"] for item in assumptions]})
    assert next_round.status_code == 201 and next_round.json()["round_number"] == 2
    assert client.get(f"/api/v1/projects/{project['id']}/gate/current").status_code == 404
    assert client.get(f"/api/v1/projects/{project['id']}/gates").json()[0]["id"] == gate["id"]
    assert client.get(f"/api/v1/projects/{project['id']}/decisions").json()[0]["id"] == decision["id"]


def test_economics_returns_formulas_and_explicit_gaps(client, project):
    initial = client.get(f"/api/v1/projects/{project['id']}/economics").json()
    assert {"planned_investment", "potential_loss", "avoidable_loss"}.issubset(initial["missing_fields"])
    assumptions = seed_dimensions(client, project["id"])
    add_round_tests(client, project["id"], assumptions, [None] * 5)
    updated_project = client.get(f"/api/v1/projects/{project['id']}").json()
    client.patch(f"/api/v1/projects/{project['id']}", json={"revision": updated_project["revision"], "planned_investment": 50000})
    economics = client.get(f"/api/v1/projects/{project['id']}/economics").json()
    assert economics["validation_cost"] == 500
    assert economics["validation_to_planned_investment_ratio"] == 500 / 50000
    assert economics["break_even_probability"] == 500 / sum(5000 + index for index in range(5))
    assert economics["formulas"]["break_even_probability"] == "validation_cost / avoidable_loss"


def test_export_contains_v03_entities_and_audit(client, project):
    assumptions = seed_dimensions(client, project["id"])
    add_round_tests(client, project["id"], assumptions, [70] * 5)
    gate = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    decide(client, project["id"], gate)
    exported = client.get(f"/api/v1/projects/{project['id']}/export").json()
    assert len(exported["evidence"]) == len(exported["assumptions"]) == len(exported["links"]) == len(exported["tests"]) == len(exported["validation_results"]) == 5
    assert len(exported["gates"]) == len(exported["decisions"]) == 1
    assert exported["rounds"][0]["round_number"] == 1
    assert {"derived", "evaluated", "created"}.issubset({item["action"] for item in exported["audit_events"]})
