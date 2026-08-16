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


@pytest.mark.parametrize("url", ["file:///etc/passwd", "ftp://example.com/file", "http://localhost/data", "http://127.0.0.1/data", "http://[::1]/data", "http://[::ffff:127.0.0.1]/data", "http://169.254.169.254/latest/meta-data", "https://user:secret@example.com/report", "https://example.com:8443/report"])
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
