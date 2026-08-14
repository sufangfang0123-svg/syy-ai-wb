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

from .models import Assumption, AuditEvent, Decision, Evidence, EvidenceAssumptionLink, EvidenceRelation, GateEvaluation, Project, ValidationResult, ValidationTest, utcnow

RULE_VERSION = "NDG_GATE_V0.3.0"
DIMENSIONS = ("NEED", "COMMERCIAL", "PRODUCT", "SUPPLY", "COMPLIANCE")


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


def ensure_public_address(hostname: str, port: int | None = None) -> str:
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
    return sorted(addresses)[0]


async def fetch_public_url(url: str, transport: httpx.AsyncBaseTransport | None = None) -> dict[str, str]:
    current = url
    max_bytes = 1_000_000
    headers = {"User-Agent": "NextDollarGate/0.3 evidence-import", "Accept": "text/html,text/plain;q=0.9"}
    async with httpx.AsyncClient(transport=transport, follow_redirects=False, timeout=httpx.Timeout(8.0, connect=4.0), headers=headers) as client:
        for _redirect in range(6):
            parsed = urlsplit(current)
            if parsed.scheme not in {"http", "https"} or not parsed.hostname:
                raise ValueError("仅允许公开的 http 或 https URL")
            pinned_ip = ensure_public_address(parsed.hostname, parsed.port)
            port = parsed.port or (443 if parsed.scheme == "https" else 80)
            host_header = parsed.hostname if parsed.port is None else f"{parsed.hostname}:{parsed.port}"
            if transport is None:
                ip_host = f"[{pinned_ip}]" if ":" in pinned_ip else pinned_ip
                request_url = parsed._replace(netloc=f"{ip_host}:{port}").geturl()
            else:
                request_url = current
            async with client.stream("GET", request_url, headers={"Host": host_header}, extensions={"sni_hostname": parsed.hostname, "validated_ip": pinned_ip}) as response:
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
                return {"title": title[:300], "raw_text": raw_text[:1_000_000], "final_url": current, "publisher": parsed.hostname}
    raise ValueError("重定向次数超过限制")


def derive_validation_outcome(test: ValidationTest, actual_value: float) -> tuple[str, dict]:
    if test.direction == "at_least":
        outcome = "pass" if actual_value >= test.threshold_value else ("stop" if test.stop_threshold is not None and actual_value <= test.stop_threshold else "supplement")
    else:
        outcome = "pass" if actual_value <= test.threshold_value else ("stop" if test.stop_threshold is not None and actual_value >= test.stop_threshold else "supplement")
    return outcome, {"algorithm": "threshold_v1", "metric": test.metric_name, "unit": test.metric_unit, "direction": test.direction, "baseline": test.baseline_value, "pass_threshold": test.threshold_value, "stop_threshold": test.stop_threshold, "actual": actual_value, "derived_outcome": outcome}


def economics_snapshot(session: Session, project: Project) -> dict:
    assumptions = session.scalars(select(Assumption).where(Assumption.project_id == project.id)).all()
    tests = session.scalars(select(ValidationTest).where(ValidationTest.project_id == project.id, ValidationTest.round_number == project.current_round)).all()
    validation_cost = sum(item.estimated_cost for item in tests)
    potential_values = [item.potential_loss for item in assumptions if item.potential_loss is not None]
    avoidable_values = [item.avoidable_loss for item in assumptions if item.avoidable_loss is not None]
    potential_loss = sum(potential_values) if potential_values else None
    avoidable_loss = sum(avoidable_values) if avoidable_values else None
    investment_ratio = validation_cost / project.planned_investment if project.planned_investment and project.planned_investment > 0 else None
    break_even = validation_cost / avoidable_loss if avoidable_loss and avoidable_loss > 0 else None
    gaps = []
    if project.planned_investment is None: gaps.append("planned_investment")
    if potential_loss is None: gaps.append("potential_loss")
    if avoidable_loss is None: gaps.append("avoidable_loss")
    return {"currency": project.currency, "planned_investment": project.planned_investment, "validation_cost": validation_cost, "potential_loss": potential_loss, "avoidable_loss": avoidable_loss, "validation_to_planned_investment_ratio": investment_ratio, "validation_to_avoidable_loss_ratio": break_even, "break_even_probability": break_even, "path_comparison": {"direct_investment": {"immediate_cost": project.planned_investment, "loss_exposure": potential_loss}, "validate_first": {"immediate_cost": validation_cost, "potentially_avoidable_loss": avoidable_loss}}, "formulas": {"validation_cost": "sum(current_round estimated_cost)", "validation_to_planned_investment_ratio": "validation_cost / planned_investment", "break_even_probability": "validation_cost / avoidable_loss"}, "rounding": "API保留IEEE-754原值；界面最多展示4位小数", "input_sources": {"planned_investment": "Project", "validation_cost": "ValidationTest.estimated_cost", "potential_loss": "Assumption.potential_loss", "avoidable_loss": "Assumption.avoidable_loss"}, "missing_fields": gaps}


def evaluate_gate(session: Session, project: Project) -> GateEvaluation:
    assumptions = session.scalars(
        select(Assumption)
        .where(Assumption.project_id == project.id, Assumption.criticality >= 4)
        .options(selectinload(Assumption.links).selectinload(EvidenceAssumptionLink.evidence), selectinload(Assumption.tests))
    ).all()
    rules: list[dict] = []
    gaps: list[str] = []
    dimension_states: dict[str, str] = {dimension: "SUPPLEMENT" for dimension in DIMENSIONS}
    result = "CONTINUE"
    if not assumptions:
        result = "SUPPLEMENT"
        rules.append({"rule": "SUP-01", "message": "没有 criticality≥4 的关键假设"})
        gaps.append("创建至少一项关键假设")
    for assumption in assumptions:
        confirmed_links = [link for link in assumption.links if link.evidence.status == "confirmed"]
        contradict = [link for link in confirmed_links if link.direction == "contradict" and link.strength >= 4]
        current_tests = [test for test in assumption.tests if test.round_number == project.current_round]
        stopped = [test for test in current_tests if test.status == "completed" and test.validation_result and test.validation_result.derived_outcome == "stop"]
        if contradict:
            result = "STOP"
            rules.append({"rule": "STOP-01", "assumption_id": assumption.id, "evidence_ids": [link.evidence_id for link in contradict], "message": "关键假设存在强反对证据"})
        if stopped:
            result = "STOP"
            dimension_states[assumption.dimension] = "STOP"
            rules.append({"rule": "STOP-02", "assumption_id": assumption.id, "dimension": assumption.dimension, "test_ids": [test.id for test in stopped], "message": "关键假设指标进入停止阈值"})
        support = [link for link in confirmed_links if link.direction == "support" and link.strength >= 3]
        passed = [test for test in current_tests if test.status == "completed" and test.validation_result and test.validation_result.derived_outcome == "pass"]
        supplemented = [test for test in current_tests if test.status == "completed" and test.validation_result and test.validation_result.derived_outcome == "supplement"]
        if not confirmed_links:
            gaps.append(f"{assumption.id}: 缺少已确认Evidence")
            rules.append({"rule": "SUP-02", "assumption_id": assumption.id, "message": "关键假设没有已确认Evidence"})
        if not support:
            gaps.append(f"{assumption.id}: 缺少强度≥3的支持Evidence")
            rules.append({"rule": "SUP-03", "assumption_id": assumption.id, "message": "缺少足够强的支持Evidence"})
        if not passed:
            gaps.append(f"{assumption.id}: 缺少已完成且通过的验证")
            rules.append({"rule": "SUP-04", "assumption_id": assumption.id, "message": "缺少通过验证"})
        latest = max(current_tests, key=lambda item: item.updated_at) if current_tests else None
        latest_inconclusive = latest is not None and latest.result in {"pending", "inconclusive"}
        if latest_inconclusive:
            rules.append({"rule": "SUP-05", "assumption_id": assumption.id, "test_ids": [latest.id], "message": "最新验证待完成或无法判断"})
        if result != "STOP" and (not confirmed_links or not support or not passed or supplemented or latest_inconclusive):
            result = "SUPPLEMENT"
        if dimension_states[assumption.dimension] != "STOP":
            dimension_states[assumption.dimension] = "CONTINUE" if confirmed_links and support and passed and not supplemented and not latest_inconclusive else "SUPPLEMENT"
    relations = session.scalars(select(EvidenceRelation).where(EvidenceRelation.project_id == project.id)).all()
    conflicts = [item for item in relations if item.relation_type == "conflicts"]
    if conflicts and result != "STOP":
        result = "SUPPLEMENT"
        gaps.append("存在尚未解决的证据冲突")
        rules.append({"rule": "SUP-06", "relation_ids": [item.id for item in conflicts], "message": "存在证据冲突，需人工复核"})
    for dimension, state in dimension_states.items():
        if not any(item.dimension == dimension for item in assumptions):
            gaps.append(f"{dimension}: 缺少关键假设")
            rules.append({"rule": "DIM-01", "dimension": dimension, "message": "该维度缺少关键假设"})
            if result != "STOP": result = "SUPPLEMENT"
    snapshot = {
        "project_id": project.id,
        "project_revision": project.revision,
        "round_number": project.current_round,
        "rule_version": RULE_VERSION,
        "dimension_states": dimension_states,
        "economics": economics_snapshot(session, project),
        "assumptions": [
            {
                "id": assumption.id,
                "criticality": assumption.criticality,
                "links": [{"id": link.id, "evidence_id": link.evidence_id, "status": link.evidence.status, "direction": link.direction, "strength": link.strength} for link in assumption.links],
                "dimension": assumption.dimension,
                "tests": [{"id": test.id, "round": test.round_number, "status": test.status, "derived_outcome": test.validation_result.derived_outcome if test.validation_result else None} for test in assumption.tests],
            }
            for assumption in assumptions
        ],
        "triggered_rules": rules,
    }
    gate = GateEvaluation(project_id=project.id, project_revision=project.revision, round_number=project.current_round, rule_version=RULE_VERSION, result=result, reasons=json.dumps(rules, ensure_ascii=False), evidence_gaps=json.dumps(gaps, ensure_ascii=False), snapshot=json.dumps(snapshot, ensure_ascii=False))
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
