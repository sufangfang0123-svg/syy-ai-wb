def add_evidence(client, project_id, text="真实选择记录"):
    return client.post(f"/api/v1/projects/{project_id}/evidence/manual", json={"title": "研究记录", "raw_text": text}).json()


def add_assumption(client, project_id, statement="用户会为便携包装支付溢价", criticality=5):
    return client.post(f"/api/v1/projects/{project_id}/assumptions", json={"statement": statement, "criticality": criticality}).json()


def test_assumption_create_update_delete_and_revision(client, project):
    created = add_assumption(client, project["id"])
    assert created["criticality"] == 5
    updated = client.patch(f"/api/v1/assumptions/{created['id']}", json={"criticality": 4})
    assert updated.status_code == 200
    assert updated.json()["criticality"] == 4
    assert client.delete(f"/api/v1/assumptions/{created['id']}").status_code == 204
    assert client.get(f"/api/v1/projects/{project['id']}/assumptions").json() == []
    assert client.get(f"/api/v1/projects/{project['id']}").json()["revision"] == 4


def test_link_create_duplicate_reject_delete_and_cross_project_isolation(client, project):
    evidence = add_evidence(client, project["id"])
    client.post(f"/api/v1/evidence/{evidence['id']}/confirm")
    assumption = add_assumption(client, project["id"])
    payload = {"evidence_id": evidence["id"], "direction": "support", "strength": 4}
    created = client.post(f"/api/v1/assumptions/{assumption['id']}/links", json=payload)
    assert created.status_code == 201
    assert client.post(f"/api/v1/assumptions/{assumption['id']}/links", json=payload).status_code == 409
    other = client.post("/api/v1/projects", json={"name": "另一个项目", "decision_question": "是否继续？"}).json()
    other_assumption = add_assumption(client, other["id"], "另一个项目假设")
    cross = client.post(f"/api/v1/assumptions/{other_assumption['id']}/links", json=payload)
    assert cross.status_code == 422
    assert client.delete(f"/api/v1/links/{created.json()['id']}").status_code == 204
    assert client.get(f"/api/v1/projects/{project['id']}/links").json() == []


def test_validation_create_update_result_and_project_ownership(client, project):
    assumption = add_assumption(client, project["id"])
    payload = {"assumption_id": assumption["id"], "name": "24人选择测试", "method": "展示两种包装并记录真实选择", "estimated_cost": 1200, "estimated_days": 3, "success_criterion": "至少60%选择便携包装"}
    created = client.post(f"/api/v1/projects/{project['id']}/tests", json=payload)
    assert created.status_code == 201
    item = created.json()
    assert item["status"] == "planned" and item["result"] == "pending"
    running = client.patch(f"/api/v1/tests/{item['id']}", json={"status": "running"})
    assert running.json()["status"] == "running"
    completed = client.post(f"/api/v1/tests/{item['id']}/result", json={"actual_value": 2, "sample_size": 24, "executed_at": "2026-08-14T08:00:00Z", "source": "受控记录", "summary": "15/24选择目标方案"})
    assert completed.json()["derived_outcome"] == "pass"
    assert client.get(f"/api/v1/projects/{project['id']}/tests").json()[0]["status"] == "completed"
    other = client.post("/api/v1/projects", json={"name": "项目B", "decision_question": "是否继续？"}).json()
    assert client.post(f"/api/v1/projects/{other['id']}/tests", json=payload).status_code == 422


def test_server_validation_rejects_invalid_criticality_strength_and_estimates(client, project):
    assert client.post(f"/api/v1/projects/{project['id']}/assumptions", json={"statement": "超出范围假设", "criticality": 6}).status_code == 422
    assumption = add_assumption(client, project["id"])
    evidence = add_evidence(client, project["id"])
    client.post(f"/api/v1/evidence/{evidence['id']}/confirm")
    assert client.post(f"/api/v1/assumptions/{assumption['id']}/links", json={"evidence_id": evidence["id"], "direction": "support", "strength": 9}).status_code == 422
    invalid = {"assumption_id": assumption["id"], "name": "错误", "method": "测试", "estimated_cost": -1, "estimated_days": -2, "success_criterion": "标准"}
    assert client.post(f"/api/v1/projects/{project['id']}/tests", json=invalid).status_code == 422
