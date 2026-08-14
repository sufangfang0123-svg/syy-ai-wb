import io
from pathlib import Path

from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject


def text_pdf_bytes():
    output = io.BytesIO()
    writer = PdfWriter()
    page = writer.add_blank_page(width=300, height=200)
    font = DictionaryObject({NameObject("/Type"): NameObject("/Font"), NameObject("/Subtype"): NameObject("/Type1"), NameObject("/BaseFont"): NameObject("/Helvetica")})
    page[NameObject("/Resources")] = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/F1"): writer._add_object(font)})})
    stream = DecodedStreamObject()
    stream.set_data(b"BT /F1 12 Tf 20 100 Td (DEMO decision evidence) Tj ET")
    page[NameObject("/Contents")] = writer._add_object(stream)
    writer.write(output)
    return output.getvalue()


def test_paste_file_hash_dedupe_snapshot_and_confirmed_only_link(client, project, tmp_path):
    pasted = client.post(f"/api/v1/projects/{project['id']}/evidence/paste", json={"title": "访谈摘要（已脱敏）", "publisher": "内部研究", "raw_text": "目标用户明确表达便携需求。", "applicable_scope": "当前客群", "limitations": "小样本"})
    assert pasted.status_code == 201
    assert pasted.json()["origin_kind"] == "paste"
    duplicate = client.post(f"/api/v1/projects/{project['id']}/evidence/paste", json={"title": "重复", "raw_text": "目标用户明确表达便携需求。"})
    assert duplicate.status_code == 409
    uploaded = client.post(f"/api/v1/projects/{project['id']}/evidence/file", data={"title": "测试报告", "publisher": "测试组", "applicable_scope": "Round 1"}, files={"file": ("report.csv", b"metric,value\nchoice,68", "text/csv")})
    assert uploaded.status_code == 201
    body = uploaded.json()
    assert body["file_sha256"] and body["snapshot_ref"].startswith("uploads/")
    assert Path(tmp_path / "data" / body["snapshot_ref"]).exists()
    assumption = client.post(f"/api/v1/projects/{project['id']}/assumptions", json={"statement": "需求成立并值得继续验证", "criticality": 5, "dimension": "NEED"}).json()
    assert client.post(f"/api/v1/assumptions/{assumption['id']}/links", json={"evidence_id": body["id"], "direction": "support", "strength": 4}).status_code == 422
    client.post(f"/api/v1/evidence/{body['id']}/confirm")
    assert client.post(f"/api/v1/assumptions/{assumption['id']}/links", json={"evidence_id": body["id"], "direction": "support", "strength": 4}).status_code == 201


def test_file_security_and_relation_governance(client, project):
    cases = [
        ("../escape.txt", b"safe", "text/plain"),
        ("fake.pdf", b"not-pdf", "application/pdf"),
        ("binary.txt", b"a\x00b", "text/plain"),
        ("wrong.csv", b"a,b", "application/pdf"),
        ("huge.txt", b"x" * (5 * 1024 * 1024 + 1), "text/plain"),
    ]
    for name, data, mime in cases:
        response = client.post(f"/api/v1/projects/{project['id']}/evidence/file", data={"title": "invalid"}, files={"file": (name, data, mime)})
        assert response.status_code == 422
    first = client.post(f"/api/v1/projects/{project['id']}/evidence/paste", json={"title": "证据A", "raw_text": "事实A"}).json()
    second = client.post(f"/api/v1/projects/{project['id']}/evidence/paste", json={"title": "证据B", "raw_text": "事实B"}).json()
    relation = client.post(f"/api/v1/projects/{project['id']}/evidence-relations", json={"source_evidence_id": first["id"], "target_evidence_id": second["id"], "relation_type": "conflicts", "notes": "结论相反"})
    assert relation.status_code == 201
    assert client.post(f"/api/v1/projects/{project['id']}/evidence-relations", json={"source_evidence_id": first["id"], "target_evidence_id": first["id"], "relation_type": "duplicate"}).status_code == 422


def test_text_pdf_is_extracted_and_scanned_pdf_is_rejected(client, project):
    imported = client.post(f"/api/v1/projects/{project['id']}/evidence/file", data={"title": "DEMO文本PDF"}, files={"file": ("demo.pdf", text_pdf_bytes(), "application/pdf")})
    assert imported.status_code == 201
    assert "DEMO decision evidence" in imported.json()["raw_text"]
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    output = io.BytesIO()
    writer.write(output)
    scanned = client.post(f"/api/v1/projects/{project['id']}/evidence/file", data={"title": "扫描件"}, files={"file": ("scan.pdf", output.getvalue(), "application/pdf")})
    assert scanned.status_code == 422
    assert "OCR" in scanned.json()["detail"]


def test_url_security_rules_remain_enforced(client, project, monkeypatch):
    monkeypatch.setattr("app.services.socket.getaddrinfo", lambda *args, **kwargs: [(None, None, None, None, ("127.0.0.1", 443))])
    response = client.post(f"/api/v1/projects/{project['id']}/evidence/url", json={"url": "https://example.com/private"})
    assert response.status_code == 422
