from test_gate_decision import add_round_tests, decide, seed_dimensions


def test_three_round_real_uat_supplement_continue_stop(client, project):
    assumptions = seed_dimensions(client, project["id"])
    add_round_tests(client, project["id"], assumptions, [45] * 5)
    gate1 = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    decision1 = decide(client, project["id"], gate1).json()
    assert gate1["result"] == decision1["decision"] == "SUPPLEMENT"

    selected = {"selected_assumption_ids": [item["id"] for item in assumptions]}
    client.post(f"/api/v1/projects/{project['id']}/rounds/next", json=selected)
    add_round_tests(client, project["id"], assumptions, [70] * 5)
    gate2 = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    decision2 = decide(client, project["id"], gate2).json()
    assert gate2["result"] == decision2["decision"] == "CONTINUE"

    client.post(f"/api/v1/projects/{project['id']}/rounds/next", json=selected)
    add_round_tests(client, project["id"], assumptions, [70, 70, 20, 70, 70])
    gate3 = client.post(f"/api/v1/projects/{project['id']}/gate").json()
    decision3 = decide(client, project["id"], gate3).json()
    assert gate3["result"] == decision3["decision"] == "STOP"

    gates = client.get(f"/api/v1/projects/{project['id']}/gates").json()
    decisions = client.get(f"/api/v1/projects/{project['id']}/decisions").json()
    assert [item["result"] for item in reversed(gates)] == ["SUPPLEMENT", "CONTINUE", "STOP"]
    assert [item["decision"] for item in reversed(decisions)] == ["SUPPLEMENT", "CONTINUE", "STOP"]
    assert sum(item["is_stale"] for item in gates) == 2
    assert sum(item["is_stale"] for item in decisions) == 2
