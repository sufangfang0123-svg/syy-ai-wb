import socket

import httpx
import pytest


def manual_payload(text="受访者明确选择轻量包装，并说明愿意为可重复收纳支付合理差价。"):
    return {"title": "手工研究记录", "publisher": "内部研究", "raw_text": text, "summary": "轻量包装获得明确选择"}


def test_manual_evidence_confirm_unconfirm_and_revision(client, project):
    created = client.post(f"/api/v1/projects/{project['id']}/evidence/manual", json=manual_payload())
    assert created.status_code == 201
    evidence = created.json()
    assert evidence["status"] == "draft"
    assert client.get(f"/api/v1/projects/{project['id']}").json()["revision"] == 2
    confirmed = client.post(f"/api/v1/evidence/{evidence['id']}/confirm")
    assert confirmed.json()["status"] == "confirmed"
    unconfirmed = client.post(f"/api/v1/evidence/{evidence['id']}/unconfirm")
    assert unconfirmed.json()["status"] == "draft"
    assert client.get(f"/api/v1/projects/{project['id']}").json()["revision"] == 4
    repeated = client.post(f"/api/v1/evidence/{evidence['id']}/unconfirm")
    assert repeated.status_code == 200 and repeated.json()["status"] == "draft"
    assert client.get(f"/api/v1/projects/{project['id']}").json()["revision"] == 4


@pytest.mark.parametrize(("field", "value"), [
    ("title", "修改后的标题"),
    ("publisher", "修改后的发布方"),
    ("published_at", "2026-08-22T00:00:00Z"),
    ("raw_text", "修改后的受治理原文"),
    ("summary", "修改后的摘要"),
    ("applicable_scope", "修改后的适用范围"),
    ("limitations", "修改后的限制"),
])
def test_confirmed_evidence_governed_fields_require_unconfirm(client, project, field, value):
    created = client.post(f"/api/v1/projects/{project['id']}/evidence/manual", json={
        **manual_payload(),
        "published_at": "2026-08-01T00:00:00Z",
        "applicable_scope": "原适用范围",
        "limitations": "原限制",
    }).json()
    confirmed = client.post(f"/api/v1/evidence/{created['id']}/confirm").json()
    revision_before = client.get(f"/api/v1/projects/{project['id']}").json()["revision"]

    rejected = client.patch(f"/api/v1/evidence/{created['id']}", json={field: value})

    assert rejected.status_code == 409
    assert rejected.json()["detail"] == "请先取消确认；取消确认将使引用该Evidence的下游对象stale。"
    persisted = client.get(f"/api/v1/evidence/{created['id']}").json()
    assert persisted[field] == confirmed[field]
    assert persisted["content_hash"] == confirmed["content_hash"]
    assert client.get(f"/api/v1/projects/{project['id']}").json()["revision"] == revision_before


def test_draft_evidence_can_be_edited_and_raw_text_rehashes(client, project):
    from app.services import content_hash

    created = client.post(f"/api/v1/projects/{project['id']}/evidence/manual", json=manual_payload()).json()
    revision_before = client.get(f"/api/v1/projects/{project['id']}").json()["revision"]
    replacement = "  更新后的  脱敏原文，必须产生新的规范化哈希。  "

    updated = client.patch(f"/api/v1/evidence/{created['id']}", json={
        "title": "更新后的草稿标题",
        "raw_text": replacement,
    })

    assert updated.status_code == 200, updated.text
    assert updated.json()["title"] == "更新后的草稿标题"
    assert updated.json()["raw_text"] == replacement
    assert updated.json()["content_hash"] == content_hash(replacement)
    assert updated.json()["content_hash"] != created["content_hash"]
    assert client.get(f"/api/v1/projects/{project['id']}").json()["revision"] == revision_before + 1


def test_content_hash_duplicate_is_rejected_without_silent_copy(client, project):
    assert client.post(f"/api/v1/projects/{project['id']}/evidence/manual", json=manual_payload()).status_code == 201
    duplicate = client.post(f"/api/v1/projects/{project['id']}/evidence/manual", json=manual_payload("  受访者明确选择轻量包装，并说明愿意为可重复收纳支付合理差价。  "))
    assert duplicate.status_code == 409
    assert len(client.get(f"/api/v1/projects/{project['id']}/evidence").json()) == 1


def test_url_import_creates_real_draft_without_fabricated_summary(client, project, monkeypatch):
    async def controlled_fetch(_url):
        return {"title": "受控公开页面", "raw_text": "公开测试正文", "final_url": "https://evidence.example/report", "publisher": "evidence.example"}
    monkeypatch.setattr("app.main.fetch_public_url", controlled_fetch)
    response = client.post(f"/api/v1/projects/{project['id']}/evidence/url", json={"url": "https://evidence.example/report", "summary": ""})
    assert response.status_code == 201
    item = response.json()
    assert item["source_type"] == "url"
    assert item["status"] == "draft"
    assert item["raw_text"] == "公开测试正文"
    assert item["summary"] == ""


def test_url_failure_does_not_create_evidence(client, project, monkeypatch):
    async def failed_fetch(_url):
        raise ValueError("受控采集失败")
    monkeypatch.setattr("app.main.fetch_public_url", failed_fetch)
    response = client.post(f"/api/v1/projects/{project['id']}/evidence/url", json={"url": "https://evidence.example/fail"})
    assert response.status_code == 422
    assert client.get(f"/api/v1/projects/{project['id']}/evidence").json() == []


@pytest.mark.parametrize("url", ["file:///etc/passwd", "ftp://example.com/file", "http://localhost/data", "http://127.0.0.1/data", "http://169.254.169.254/latest/meta-data"])
def test_url_protocol_and_private_targets_are_rejected(url):
    from app.services import fetch_public_url
    with pytest.raises(ValueError):
        import asyncio
        asyncio.run(fetch_public_url(url, httpx.MockTransport(lambda request: httpx.Response(200, text="never", request=request))))


def test_redirect_revalidates_private_destination(monkeypatch):
    from app.services import fetch_public_url
    monkeypatch.setattr(socket, "getaddrinfo", lambda host, port, type: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (("93.184.216.34" if host == "public.example" else host), port))])
    def handler(request):
        return httpx.Response(302, headers={"location": "http://127.0.0.1/private"}, request=request)
    with pytest.raises(ValueError, match="内网|回环|保留"):
        import asyncio
        asyncio.run(fetch_public_url("https://public.example/start", httpx.MockTransport(handler)))


def test_response_type_and_size_limits(monkeypatch):
    from app.services import fetch_public_url
    monkeypatch.setattr(socket, "getaddrinfo", lambda host, port, type: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port))])
    import asyncio
    binary = httpx.MockTransport(lambda request: httpx.Response(200, headers={"content-type": "application/octet-stream"}, content=b"x", request=request))
    with pytest.raises(ValueError, match="HTML|纯文本"):
        asyncio.run(fetch_public_url("https://public.example/file", binary))
    large = httpx.MockTransport(lambda request: httpx.Response(200, headers={"content-type": "text/plain"}, content=b"x" * 1_000_001, request=request))
    with pytest.raises(ValueError, match="1MB"):
        asyncio.run(fetch_public_url("https://public.example/large", large))


def test_html_extraction_ignores_script_and_uses_real_title(monkeypatch):
    from app.services import fetch_public_url
    monkeypatch.setattr(socket, "getaddrinfo", lambda host, port, type: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port))])
    html = "<html><head><title>真实标题</title><script>伪造内容</script></head><body><main>可见正文</main></body></html>"
    transport = httpx.MockTransport(lambda request: httpx.Response(200, headers={"content-type": "text/html; charset=utf-8"}, text=html, request=request))
    import asyncio
    result = asyncio.run(fetch_public_url("https://public.example/report", transport))
    assert result["title"] == "真实标题"
    assert "可见正文" in result["raw_text"]
    assert "伪造内容" not in result["raw_text"]


def test_request_is_pinned_to_validated_ip_to_prevent_dns_rebinding(monkeypatch):
    from app.services import fetch_public_url
    calls = []
    monkeypatch.setattr(socket, "getaddrinfo", lambda host, port, type: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port))])
    def handler(request):
        calls.append(request)
        return httpx.Response(200, headers={"content-type": "text/plain"}, text="pinned response", request=request)
    import asyncio
    result = asyncio.run(fetch_public_url("https://public.example/report", httpx.MockTransport(handler)))
    assert calls[0].headers["host"] == "public.example"
    assert calls[0].extensions["validated_ip"] == "93.184.216.34"
    assert result["final_url"] == "https://public.example/report"


def test_evidence_stale_state_and_summary_audit_survive_fastapi_restart(tmp_path):
    from fastapi.testclient import TestClient

    from app import database
    from app.main import app

    database_url = f"sqlite:///{(tmp_path / 'evidence-restart.sqlite3').as_posix()}"

    def client_for(engine):
        TestingSession = database.sessionmaker(bind=engine, expire_on_commit=False)

        def override_session():
            session = TestingSession()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[database.get_session] = override_session
        return TestClient(app)

    first_engine = database.make_engine(database_url)
    database.run_migrations(first_engine)
    with client_for(first_engine) as first:
        project = first.post("/api/v1/projects", json={
            "name": "Evidence重启恢复", "decision_question": "失效状态能否恢复？",
        }).json()
        evidence = first.post(f"/api/v1/projects/{project['id']}/evidence/manual", json=manual_payload()).json()
        first.post(f"/api/v1/evidence/{evidence['id']}/confirm").raise_for_status()
        opportunity = first.post(f"/api/v1/projects/{project['id']}/opportunities", json={
            "title": "重启恢复机会", "description": "只用于固定脱敏持久化测试",
            "evidence_ids": [evidence["id"]], "status": "confirmed",
            "actor": "验收负责人", "data_nature": "manual_hypothesis",
        }).json()
        first.post(f"/api/v1/evidence/{evidence['id']}/unconfirm").raise_for_status()
        first_bundle = first.get(f"/api/v1/projects/{project['id']}/workbench").json()
        first_summary = next(
            item for item in first_bundle["audit_events"]
            if item["entity_id"] == evidence["id"] and item["action"] == "dependents_stale"
        )
        first_revision = first_bundle["project"]["revision"]
    app.dependency_overrides.clear()
    first_engine.dispose()

    second_engine = database.make_engine(database_url)
    database.run_migrations(second_engine)
    with client_for(second_engine) as restarted:
        restored = restarted.get(f"/api/v1/projects/{project['id']}/workbench")
        assert restored.status_code == 200, restored.text
        bundle = restored.json()
        restored_opportunity = next(item for item in bundle["opportunities"] if item["id"] == opportunity["id"])
        restored_summary = next(
            item for item in bundle["audit_events"]
            if item["entity_id"] == evidence["id"] and item["action"] == "dependents_stale"
        )
        assert bundle["project"]["revision"] == first_revision
        assert restored_opportunity["is_stale"] is True
        assert evidence["id"] in restored_opportunity["stale_reason"]
        assert restored_summary["id"] == first_summary["id"]
        assert restored_summary["metadata_json"] == first_summary["metadata_json"]
    app.dependency_overrides.clear()
    second_engine.dispose()
