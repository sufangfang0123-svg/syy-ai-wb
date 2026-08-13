def create_project(client, name):
    response = client.post("/api/v1/projects", json={"name": name, "decision_question": "是否进入下一轮样品测试？", "product_category": "棉品", "target_user": "旅行人群"})
    assert response.status_code == 201
    return response.json()


def test_real_business_script_supplement_continue_stop_stale_history_and_export(client, monkeypatch):
    project_a = create_project(client, "真实闭环验收A")
    manual = client.post(f"/api/v1/projects/{project_a['id']}/evidence/manual", json={"title": "手工选择记录", "publisher": "受控研究", "raw_text": "24名目标用户完成包装选择。", "summary": "记录真实选择"}).json()
    async def controlled_fetch(_url):
        return {"title": "受控外部研究", "raw_text": "受控公开页面正文，仅用于验收URL导入。", "final_url": "https://fixture.example/evidence", "publisher": "fixture.example"}
    monkeypatch.setattr("app.main.fetch_public_url", controlled_fetch)
    url_item = client.post(f"/api/v1/projects/{project_a['id']}/evidence/url", json={"url": "https://fixture.example/evidence"}).json()
    for item in [manual, url_item]:
        assert client.post(f"/api/v1/evidence/{item['id']}/confirm").status_code == 200
    assumption = client.post(f"/api/v1/projects/{project_a['id']}/assumptions", json={"statement": "目标用户愿意为便携包装支付合理差价", "criticality": 5}).json()
    client.post(f"/api/v1/assumptions/{assumption['id']}/links", json={"evidence_id": manual["id"], "direction": "support", "strength": 4})
    test = client.post(f"/api/v1/projects/{project_a['id']}/tests", json={"assumption_id": assumption["id"], "name": "低成本包装选择测试", "method": "向24名目标用户展示A/B包装并记录选择", "estimated_cost": 1200, "estimated_days": 3, "success_criterion": "至少60%选择便携包装"}).json()

    supplement = client.post(f"/api/v1/projects/{project_a['id']}/gate").json()
    assert supplement["result"] == "SUPPLEMENT"
    supplement_decision = client.post(f"/api/v1/projects/{project_a['id']}/decision").json()

    client.patch(f"/api/v1/tests/{test['id']}", json={"result": "pass", "result_notes": "15/24选择便携包装"})
    assert client.get(f"/api/v1/projects/{project_a['id']}/decision/current").status_code == 404
    continued = client.post(f"/api/v1/projects/{project_a['id']}/gate").json()
    assert continued["result"] == "CONTINUE"
    continue_decision = client.post(f"/api/v1/projects/{project_a['id']}/decision").json()

    client.patch(f"/api/v1/tests/{test['id']}", json={"result": "fail", "result_notes": "复核样本未达到阈值"})
    stopped = client.post(f"/api/v1/projects/{project_a['id']}/gate").json()
    assert stopped["result"] == "STOP"
    stop_decision = client.post(f"/api/v1/projects/{project_a['id']}/decision").json()

    gates = client.get(f"/api/v1/projects/{project_a['id']}/gates").json()
    decisions = client.get(f"/api/v1/projects/{project_a['id']}/decisions").json()
    assert {item["result"] for item in gates} == {"SUPPLEMENT", "CONTINUE", "STOP"}
    assert {item["decision"] for item in decisions} == {"SUPPLEMENT", "CONTINUE", "STOP"}
    assert supplement_decision["id"] != continue_decision["id"] != stop_decision["id"]
    assert sum(item["is_stale"] for item in gates) == 2
    assert sum(item["is_stale"] for item in decisions) == 2
    exported = client.get(f"/api/v1/projects/{project_a['id']}/export").json()
    assert len(exported["gates"]) == len(exported["decisions"]) == 3

    project_b = create_project(client, "真实闭环验收B")
    assert client.get(f"/api/v1/projects/{project_b['id']}/evidence").json() == []
    assert client.get(f"/api/v1/projects/{project_b['id']}/assumptions").json() == []
    assert client.post(f"/api/v1/projects/{project_b['id']}/gate").json()["result"] == "SUPPLEMENT"
