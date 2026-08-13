from __future__ import annotations

import hashlib
import ipaddress
import json
import socket
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

import httpx
from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from .models import Assumption, AuditEvent, Decision, Evidence, EvidenceAssumptionLink, GateEvaluation, Project, ValidationTest, utcnow


def audit(session: Session, project_id: str | None, entity_type: str, entity_id: str, action: str, summary: str) -> None:
    session.add(AuditEvent(project_id=project_id, entity_type=entity_type, entity_id=entity_id, action=action, change_summary=summary))


def invalidate_project(session: Session, project: Project, reason: str) -> None:
    session.execute(update(GateEvaluation).where(GateEvaluation.project_id == project.id, GateEvaluation.is_stale.is_(False)).values(is_stale=True))
    session.execute(update(Decision).where(Decision.project_id == project.id, Decision.is_stale.is_(False)).values(is_stale=True))
    project.revision += 1
    project.updated_at = utcnow()
    audit(session, project.id, "project", project.id, "revision_incremented", reason)


def content_hash(raw_text: str) -> str:
    normalized = " ".join(raw_text.split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self._in_title = False
        self._ignored = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag, attrs):  # type: ignore[no-untyped-def]
        if tag == "title":
            self._in_title = True
        if tag in {"script", "style", "noscript", "svg"}:
            self._ignored += 1

    def handle_endtag(self, tag):  # type: ignore[no-untyped-def]
        if tag == "title":
            self._in_title = False
        if tag in {"script", "style", "noscript", "svg"} and self._ignored:
            self._ignored -= 1

    def handle_data(self, data: str) -> None:
        value = data.strip()
        if not value or self._ignored:
            return
        if self._in_title:
            self.title = f"{self.title} {value}".strip()
        self.parts.append(value)


def ensure_public_address(hostname: str, port: int | None = None) -> None:
    lowered = hostname.rstrip(".").lower()
    if lowered in {"localhost", "localhost.localdomain"} or lowered.endswith(".localhost"):
        raise ValueError("拒绝本机地址")
    try:
        addresses = {item[4][0] for item in socket.getaddrinfo(hostname, port or 443, type=socket.SOCK_STREAM)}
    except socket.gaierror as exc:
        raise ValueError("域名解析失败") from exc
    if not addresses:
        raise ValueError("域名未解析到地址")
    for address in addresses:
        ip = ipaddress.ip_address(address.split("%")[0])
        if not ip.is_global:
            raise ValueError("拒绝内网、回环、链路本地或保留地址")


async def fetch_public_url(url: str, transport: httpx.AsyncBaseTransport | None = None) -> dict[str, str]:
    current = url
    max_bytes = 1_000_000
    headers = {"User-Agent": "NextDollarGate/0.2 evidence-import", "Accept": "text/html,text/plain;q=0.9"}
    async with httpx.AsyncClient(transport=transport, follow_redirects=False, timeout=httpx.Timeout(8.0, connect=4.0), headers=headers) as client:
        for _redirect in range(6):
            parsed = urlsplit(current)
            if parsed.scheme not in {"http", "https"} or not parsed.hostname:
                raise ValueError("仅允许公开的 http 或 https URL")
            ensure_public_address(parsed.hostname, parsed.port)
            async with client.stream("GET", current) as response:
                if response.status_code in {301, 302, 303, 307, 308}:
                    location = response.headers.get("location")
                    if not location:
                        raise ValueError("重定向缺少目标地址")
                    current = urljoin(current, location)
                    continue
                response.raise_for_status()
                content_type = response.headers.get("content-type", "").split(";", 1)[0].strip().lower()
                if content_type not in {"text/html", "text/plain"}:
                    raise ValueError("仅接受 HTML 或纯文本响应")
                body = bytearray()
                async for chunk in response.aiter_bytes():
                    body.extend(chunk)
                    if len(body) > max_bytes:
                        raise ValueError("响应正文超过 1MB 限制")
                encoding = response.encoding or "utf-8"
                decoded = bytes(body).decode(encoding, errors="replace")
                if content_type == "text/html":
                    parser = TextExtractor()
                    parser.feed(decoded)
                    title = parser.title or parsed.hostname
                    raw_text = "\n".join(parser.parts)
                else:
                    title = parsed.path.rsplit("/", 1)[-1] or parsed.hostname
                    raw_text = decoded.strip()
                if not raw_text:
                    raise ValueError("页面没有可提取的公开文本")
                return {"title": title[:300], "raw_text": raw_text[:1_000_000], "final_url": str(response.url), "publisher": parsed.hostname}
    raise ValueError("重定向次数超过限制")


def evaluate_gate(session: Session, project: Project) -> GateEvaluation:
    assumptions = session.scalars(
        select(Assumption)
        .where(Assumption.project_id == project.id, Assumption.criticality >= 4)
        .options(selectinload(Assumption.links).selectinload(EvidenceAssumptionLink.evidence), selectinload(Assumption.tests))
    ).all()
    rules: list[dict] = []
    gaps: list[str] = []
    result = "CONTINUE"
    if not assumptions:
        result = "SUPPLEMENT"
        rules.append({"rule": "SUP-01", "message": "没有 criticality≥4 的关键假设"})
        gaps.append("创建至少一项关键假设")
    for assumption in assumptions:
        confirmed_links = [link for link in assumption.links if link.evidence.status == "confirmed"]
        contradict = [link for link in confirmed_links if link.direction == "contradict" and link.strength >= 4]
        failed = [test for test in assumption.tests if test.status == "completed" and test.result == "fail"]
        if contradict:
            result = "STOP"
            rules.append({"rule": "STOP-01", "assumption_id": assumption.id, "evidence_ids": [link.evidence_id for link in contradict], "message": "关键假设存在强反对证据"})
        if failed:
            result = "STOP"
            rules.append({"rule": "STOP-02", "assumption_id": assumption.id, "test_ids": [test.id for test in failed], "message": "关键假设存在失败验证"})
        support = [link for link in confirmed_links if link.direction == "support" and link.strength >= 3]
        passed = [test for test in assumption.tests if test.status == "completed" and test.result == "pass"]
        if not confirmed_links:
            gaps.append(f"{assumption.id}: 缺少已确认Evidence")
            rules.append({"rule": "SUP-02", "assumption_id": assumption.id, "message": "关键假设没有已确认Evidence"})
        if not support:
            gaps.append(f"{assumption.id}: 缺少强度≥3的支持Evidence")
            rules.append({"rule": "SUP-03", "assumption_id": assumption.id, "message": "缺少足够强的支持Evidence"})
        if not passed:
            gaps.append(f"{assumption.id}: 缺少已完成且通过的验证")
            rules.append({"rule": "SUP-04", "assumption_id": assumption.id, "message": "缺少通过验证"})
        inconclusive = [test for test in assumption.tests if test.result in {"pending", "inconclusive"}]
        if inconclusive:
            rules.append({"rule": "SUP-05", "assumption_id": assumption.id, "test_ids": [test.id for test in inconclusive], "message": "存在待完成或无法判断的验证"})
        if result != "STOP" and (not confirmed_links or not support or not passed or inconclusive):
            result = "SUPPLEMENT"
    snapshot = {
        "project_id": project.id,
        "project_revision": project.revision,
        "assumptions": [
            {
                "id": assumption.id,
                "criticality": assumption.criticality,
                "links": [{"id": link.id, "evidence_id": link.evidence_id, "status": link.evidence.status, "direction": link.direction, "strength": link.strength} for link in assumption.links],
                "tests": [{"id": test.id, "status": test.status, "result": test.result} for test in assumption.tests],
            }
            for assumption in assumptions
        ],
        "triggered_rules": rules,
    }
    gate = GateEvaluation(project_id=project.id, project_revision=project.revision, result=result, reasons=json.dumps(rules, ensure_ascii=False), evidence_gaps=json.dumps(gaps, ensure_ascii=False), snapshot=json.dumps(snapshot, ensure_ascii=False))
    session.add(gate)
    session.flush()
    audit(session, project.id, "gate", gate.id, "evaluated", f"result={result}; revision={project.revision}")
    return gate


def decision_next_action(session: Session, project: Project, gate: GateEvaluation) -> str:
    snapshot = json.loads(gate.snapshot)
    if gate.result == "STOP":
        stop_rule = next((rule for rule in snapshot["triggered_rules"] if rule["rule"].startswith("STOP")), None)
        return f"停止下一笔投入并复核失败假设 {stop_rule.get('assumption_id') if stop_rule else ''}".strip()
    if gate.result == "CONTINUE":
        return "在保留风险边界的前提下，由负责人决定是否继续下一笔投入；本结论不承诺商业成功。"
    assumptions = session.scalars(select(Assumption).where(Assumption.project_id == project.id, Assumption.criticality >= 4).order_by(Assumption.criticality.desc(), Assumption.created_at)).all()
    for assumption in assumptions:
        tests = session.scalars(select(ValidationTest).where(ValidationTest.assumption_id == assumption.id, ValidationTest.status == "planned").order_by(ValidationTest.estimated_cost, ValidationTest.estimated_days, ValidationTest.created_at)).all()
        if tests:
            test = tests[0]
            return f"优先执行 {test.name}（{test.id}）：预计成本 ¥{test.estimated_cost:g}，预计 {test.estimated_days} 天。"
    return "关键证据不足；请先为最高关键度的未满足假设设计验证。"
