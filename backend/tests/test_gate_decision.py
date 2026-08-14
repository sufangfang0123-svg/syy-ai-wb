import json


def create_chain(client, project_id, *, confirmed=True, direction="support", strength=4, test_cost=1200, test_days=3):
    evidence = client.post(f"/api/v1/projects/{project_id}/evidence/manual", json={"title": "选择记录", "raw_text": f"真实观察 {project_id} {direction} {strength}"}).json()
    if confirmed:
        evidence = client.post(f"/api/v1/evidence/{evidence['id']}/confirm").json()
    assumption = client.post(f"/api/v1/projects/{project_id}/assumptions", json={"statement": "用户愿意为便携包装支付溢价", "criticality": 5}).json()
    link = client.post(f"/api/v1/assumptions/{assumption['id']}/links", json={"evidence_id": evidence["id"], "direction": direction, "strength": strength}).json()
    test = client.post(f"/api/v1/projects/{project_id}/tests", json={"assumption_id": assumption["id"], "name": "真实选择测试", "method": "记录受控选择", "estimated_cost": test_cost, "estimated_days": test_days, "success_criterion": "目标选择率达到60%"}).json()
    return evidence, assumption, link, test


def test_no_critical_assumption_is_supplement_with_snapshot(client, project):
    gate = client.post(f"/api/v1/projects/{project['id']}/gate")
    assert gate.status_code == 201
    body = gate.json()
    assert body["result"] == "SUPPLEMENT"
    assert json.loads(body["reasons"])[0]["rule"] == "SUP-01"
    assert json.loads(body["snapshot"])["project_revision"] == 1


def test_draft_evidence_and_pending_test_are_supplement(client, project):
    evidence, assumption, link, test = create_chain(client, project["id"], confirmed=False)
    gate = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    assert gate["result"] == "SUPPLEMENT"
    rules = {item["rule"] for item in json.loads(gate["reasons"])}
    assert {"SUP-02", "SUP-03", "SUP-04", "SUP-05"}.issubset(rules)


def test_support_and_pass_produce_continue(client, project):
    evidence, assumption, link, test = create_chain(client, project["id"])
    client.patch(f"/api/v1/tests/{test['id']}", json={"result": "pass", "result_notes": "达到标准"})
    gate = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    assert gate["result"] == "CONTINUE"
    snapshot = json.loads(gate["snapshot"])
    assert snapshot["assumptions"][0]["links"][0]["evidence_id"] == evidence["id"]
    assert snapshot["assumptions"][0]["tests"][0]["result"] == "pass"


def test_contradict_evidence_or_failed_test_produce_stop(client, project):
    evidence, assumption, link, test = create_chain(client, project["id"], direction="contradict", strength=4)
    gate = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    assert gate["result"] == "STOP"
    assert "STOP-01" in {item["rule"] for item in json.loads(gate["reasons"])}
    other = client.post("/api/v1/projects", json={"name": "失败验证项目", "decision_question": "是否继续？"}).json()
    evidence2, assumption2, link2, test2 = create_chain(client, other["id"])
    client.patch(f"/api/v1/tests/{test2['id']}", json={"result": "fail", "result_notes": "未达到标准"})
    failed_gate = client.post(f"/api/v1/projects/{other['id']}/gate").json()
    assert failed_gate["result"] == "STOP"
    assert "STOP-02" in {item["rule"] for item in json.loads(failed_gate["reasons"])}


def test_data_change_stales_gate_and_preserves_history(client, project):
    evidence, assumption, link, test = create_chain(client, project["id"])
    first = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    assert first["is_stale"] is False
    client.post(f"/api/v1/evidence/{evidence['id']}/unconfirm")
    assert client.get(f"/api/v1/projects/{project['id']}/gate/current").status_code == 404
    history = client.get(f"/api/v1/projects/{project['id']}/gates").json()
    assert len(history) == 1 and history[0]["is_stale"] is True
    second = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    assert second["id"] != first["id"]
    assert second["project_revision"] > first["project_revision"]


def test_gate_isolated_between_projects(client, project):
    other = client.post("/api/v1/projects", json={"name": "项目B", "decision_question": "是否继续？"}).json()
    create_chain(client, project["id"])
    assert client.post(f"/api/v1/projects/{project['id']}/gate").json()["result"] == "SUPPLEMENT"
    other_gate = client.post(f"/api/v1/projects/{other['id']}/gate").json()
    assert other_gate["result"] == "SUPPLEMENT"
    assert json.loads(other_gate["reasons"])[0]["rule"] == "SUP-01"


def test_decision_requires_current_gate_and_preserves_trace_after_stale(client, project):
    assert client.post(f"/api/v1/projects/{project['id']}/decision").status_code == 409
    evidence, assumption, link, test = create_chain(client, project["id"])
    client.patch(f"/api/v1/tests/{test['id']}", json={"result": "pass", "result_notes": "通过"})
    gate = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    decision = client.post(f"/api/v1/projects/{project['id']}/decision").json()
    assert decision["decision"] == "CONTINUE"
    assert decision["gate_evaluation_id"] == gate["id"]
    trace = client.get(f"/api/v1/projects/{project['id']}/trace").json()
    assert trace["snapshot"]["assumptions"][0]["links"][0]["evidence_id"] == evidence["id"]
    client.patch(f"/api/v1/evidence/{evidence['id']}", json={"summary": "底层证据发生变化"})
    assert client.get(f"/api/v1/projects/{project['id']}/decision/current").status_code == 404
    history = client.get(f"/api/v1/projects/{project['id']}/decisions").json()
    assert len(history) == 1 and history[0]["is_stale"] is True
    assert client.get(f"/api/v1/projects/{project['id']}/trace").status_code == 200


def test_supplement_decision_selects_lowest_cost_then_days(client, project):
    evidence, assumption, link, first = create_chain(client, project["id"], test_cost=500, test_days=5)
    second = client.post(f"/api/v1/projects/{project['id']}/tests", json={"assumption_id": assumption["id"], "name": "更低成本验证", "method": "小样选择", "estimated_cost": 200, "estimated_days": 7, "success_criterion": "达到标准"}).json()
    third = client.post(f"/api/v1/projects/{project['id']}/tests", json={"assumption_id": assumption["id"], "name": "同成本更快验证", "method": "快速选择", "estimated_cost": 200, "estimated_days": 2, "success_criterion": "达到标准"}).json()
    client.post(f"/api/v1/projects/{project['id']}/gate")
    decision = client.post(f"/api/v1/projects/{project['id']}/decision").json()
    assert decision["decision"] == "SUPPLEMENT"
    assert third["id"] in decision["next_action"]


def test_export_contains_history_audit_and_all_entities(client, project):
    evidence, assumption, link, test = create_chain(client, project["id"])
    client.post(f"/api/v1/projects/{project['id']}/gate")
    client.post(f"/api/v1/projects/{project['id']}/decision")
    exported = client.get(f"/api/v1/projects/{project['id']}/export").json()
    assert exported["project"]["id"] == project["id"]
    assert len(exported["evidence"]) == len(exported["assumptions"]) == len(exported["links"]) == len(exported["tests"]) == 1
    assert len(exported["gates"]) == len(exported["decisions"]) == 1
    actions = {event["action"] for event in exported["audit_events"]}
    assert {"created", "confirmed", "evaluated", "generated"}.issubset(actions)
