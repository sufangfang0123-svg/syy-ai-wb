from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


APP_VERSION = "0.4.0"
SCHEMA_VERSION = 5
DEFAULT_DATA_DIR = Path(__file__).resolve().parents[2] / "data"


class Base(DeclarativeBase):
    pass


def database_url() -> str:
    configured = os.getenv("NDG_DATABASE_URL", "").strip()
    if configured:
        return configured
    data_dir = Path(os.getenv("NDG_DATA_DIR", str(DEFAULT_DATA_DIR)))
    data_dir.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{(data_dir / 'next-dollar-gate.sqlite3').as_posix()}"


def make_engine(url: str | None = None):
    resolved = url or database_url()
    engine = create_engine(resolved, connect_args={"check_same_thread": False} if resolved.startswith("sqlite") else {})
    if resolved.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def configure_sqlite(connection, _record):  # type: ignore[no-untyped-def]
            cursor = connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.close()
    return engine


engine = make_engine()
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)


def _sqlite_make_scenario_concept_nullable(connection) -> None:
    """Rebuild only the v4 scenario table so pre-concept universes can store NULL."""
    table_sql = connection.execute(text(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='scenario_candidates'"
    )).scalar_one_or_none()
    if not table_sql:
        return
    replacement, count = re.subn(
        r'(["`\[]?concept_id["`\]]?\s+VARCHAR(?:\(\d+\))?)\s+NOT\s+NULL',
        r"\1",
        table_sql,
        count=1,
        flags=re.IGNORECASE,
    )
    if count == 0:
        return
    indexes = connection.execute(text(
        "SELECT name, sql FROM sqlite_master "
        "WHERE type='index' AND tbl_name='scenario_candidates' AND sql IS NOT NULL"
    )).all()
    backup = "scenario_candidates_schema4_backup"
    connection.execute(text(f'ALTER TABLE "scenario_candidates" RENAME TO "{backup}"'))
    for index_name, _ in indexes:
        quoted = str(index_name).replace('"', '""')
        connection.execute(text(f'DROP INDEX IF EXISTS "{quoted}"'))
    replacement = re.sub(
        r"^(CREATE\s+TABLE\s+)(?:IF\s+NOT\s+EXISTS\s+)?(?:[\"`\[]?scenario_candidates[\"`\]]?)",
        r'\1"scenario_candidates"',
        replacement,
        count=1,
        flags=re.IGNORECASE,
    )
    connection.exec_driver_sql(replacement)
    columns = [column[1] for column in connection.exec_driver_sql(f'PRAGMA table_info("{backup}")').all()]
    quoted_columns = ", ".join(f'"{column.replace(chr(34), chr(34) * 2)}"' for column in columns)
    connection.exec_driver_sql(
        f'INSERT INTO "scenario_candidates" ({quoted_columns}) SELECT {quoted_columns} FROM "{backup}"'
    )
    connection.exec_driver_sql(f'DROP TABLE "{backup}"')
    for _, index_sql in indexes:
        connection.exec_driver_sql(index_sql)


def run_migrations(target_engine=None) -> int:
    from . import models  # noqa: F401
    from . import workbench_models  # noqa: F401
    from .category_packs import CATEGORY_PACKS

    active_engine = target_engine or engine
    with active_engine.begin() as connection:
        connection.execute(text("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)"))
        current = connection.execute(text("SELECT COALESCE(MAX(version), 0) FROM schema_migrations")).scalar_one()
    if current > SCHEMA_VERSION:
        raise RuntimeError(f"数据库 Schema {current} 高于当前程序支持的 {SCHEMA_VERSION}，已拒绝启动以避免破坏数据")
    if current < 1:
        Base.metadata.create_all(active_engine)
        with active_engine.begin() as connection:
            connection.execute(text("INSERT INTO schema_migrations(version, applied_at) VALUES (:version, CURRENT_TIMESTAMP)"), {"version": SCHEMA_VERSION})
    else:
        if current < 2:
            additions = {
                "projects": [
                    ("planned_investment", "FLOAT"), ("currency", "VARCHAR(8) NOT NULL DEFAULT 'CNY'"),
                    ("current_round", "INTEGER NOT NULL DEFAULT 1"),
                ],
                "evidence": [
                    ("applicable_scope", "TEXT NOT NULL DEFAULT ''"), ("limitations", "TEXT NOT NULL DEFAULT ''"),
                    ("origin_kind", "VARCHAR(16) NOT NULL DEFAULT 'manual'"), ("original_filename", "VARCHAR(255)"),
                    ("mime_type", "VARCHAR(120)"), ("size_bytes", "INTEGER"), ("file_sha256", "VARCHAR(64)"),
                    ("imported_at", "DATETIME"), ("snapshot_ref", "TEXT NOT NULL DEFAULT 'database:raw_text'"),
                ],
                "assumptions": [
                    ("dimension", "VARCHAR(16) NOT NULL DEFAULT 'NEED'"), ("potential_loss", "FLOAT"),
                    ("avoidable_loss", "FLOAT"),
                ],
                "validation_tests": [
                    ("round_number", "INTEGER NOT NULL DEFAULT 1"), ("metric_name", "VARCHAR(160) NOT NULL DEFAULT '目标指标'"),
                    ("metric_unit", "VARCHAR(40) NOT NULL DEFAULT 'count'"), ("direction", "VARCHAR(16) NOT NULL DEFAULT 'at_least'"),
                    ("baseline_value", "FLOAT"), ("threshold_value", "FLOAT NOT NULL DEFAULT 1"), ("stop_threshold", "FLOAT"),
                ],
                "gate_evaluations": [
                    ("round_number", "INTEGER NOT NULL DEFAULT 1"),
                    ("rule_version", "VARCHAR(40) NOT NULL DEFAULT 'NDG_GATE_V0.3.0'"),
                ],
                "decisions": [
                    ("round_number", "INTEGER NOT NULL DEFAULT 1"), ("rationale", "TEXT NOT NULL DEFAULT ''"),
                    ("decided_by", "VARCHAR(160) NOT NULL DEFAULT 'self-declared'"),
                ],
            }
            with active_engine.begin() as connection:
                existing = {table: {column["name"] for column in inspect(connection).get_columns(table)} for table in additions}
                for table, columns in additions.items():
                    for name, ddl in columns:
                        if name not in existing[table]:
                            connection.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{name}" {ddl}'))
                connection.execute(text("UPDATE evidence SET imported_at = created_at WHERE imported_at IS NULL"))
                connection.execute(text("INSERT INTO schema_migrations(version, applied_at) VALUES (2, CURRENT_TIMESTAMP)"))
            current = 2
        # create_all仅补充缺失表，不改写旧表；先建v3新表，再对旧表做精确ALTER。
        Base.metadata.create_all(active_engine)
        if current < 3:
            additions = {
                "projects": [("category_pack_id", "VARCHAR(80) NOT NULL DEFAULT 'woven_apparel_v1'")],
                "audit_events": [
                    ("actor", "VARCHAR(160) NOT NULL DEFAULT 'self-declared'"),
                    ("data_nature", "VARCHAR(24) NOT NULL DEFAULT 'real_entry'"),
                    ("metadata_json", "TEXT NOT NULL DEFAULT '{}'")
                ],
            }
            with active_engine.begin() as connection:
                inspector = inspect(connection)
                for table, columns in additions.items():
                    existing = {column["name"] for column in inspector.get_columns(table)}
                    for name, ddl in columns:
                        if name not in existing:
                            connection.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{name}" {ddl}'))
                connection.execute(text("INSERT INTO schema_migrations(version, applied_at) VALUES (3, CURRENT_TIMESTAMP)"))
            current = 3
        if current < 4:
            additions = {
                "scenario_candidates": [
                    ("shortlisted_by", "VARCHAR(160) NOT NULL DEFAULT ''"),
                    ("shortlist_reason", "TEXT NOT NULL DEFAULT ''"),
                    ("shortlist_evidence_ids_json", "TEXT NOT NULL DEFAULT '[]'"),
                    ("shortlisted_at", "DATETIME"),
                ],
                "content_assets": [
                    ("review_findings_snapshot_json", "TEXT NOT NULL DEFAULT '[]'"),
                    ("reviewed_at", "DATETIME"),
                ],
                "ai_proposals": [
                    ("source_description", "TEXT NOT NULL DEFAULT ''"),
                    ("source_confirmed_at", "DATETIME"),
                ],
            }
            with active_engine.begin() as connection:
                inspector = inspect(connection)
                for table, columns in additions.items():
                    existing = {column["name"] for column in inspector.get_columns(table)}
                    for name, ddl in columns:
                        if name not in existing:
                            connection.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{name}" {ddl}'))
                scenario_columns = {column["name"] for column in inspect(connection).get_columns("scenario_candidates")}
                if {"priority", "priority_inputs_json", "priority_policy_version", "missing_inputs_json", "rationale"}.issubset(scenario_columns):
                    missing_inputs = json.dumps([
                        "evidence_fit", "error_cost", "uncertainty_gap", "execution",
                        "category_fit", "channel_fit", "compliance_safety", "contrary_evidence_safety",
                    ], ensure_ascii=False, separators=(",", ":"))
                    connection.execute(text(
                        "UPDATE scenario_candidates "
                        "SET rationale = 'Schema 4已撤销旧版共享priority；旧值=' || COALESCE(CAST(priority AS TEXT), 'none') || '；' || COALESCE(rationale, ''), "
                        "priority = NULL, priority_inputs_json = '{}', priority_policy_version = NULL, missing_inputs_json = :missing "
                        "WHERE priority IS NOT NULL OR priority_policy_version IS NOT NULL "
                        "OR COALESCE(TRIM(priority_inputs_json), '') NOT IN ('', '{}')"
                    ), {"missing": missing_inputs})
                if {"status", "shortlisted_by", "shortlist_reason", "shortlist_evidence_ids_json", "shortlisted_at", "is_stale", "stale_reason"}.issubset(scenario_columns):
                    connection.execute(text(
                        "UPDATE scenario_candidates SET is_stale = 1, "
                        "stale_reason = 'Schema 4发现旧shortlist缺少操作者、理由、Evidence引用或时间；保留原状态，须从新候选宇宙重新shortlist。' "
                        "WHERE status IN ('shortlisted','must_validate','validation') AND ("
                        "TRIM(COALESCE(shortlisted_by, '')) = '' OR TRIM(COALESCE(shortlist_reason, '')) = '' "
                        "OR COALESCE(TRIM(shortlist_evidence_ids_json), '') IN ('', '[]') OR shortlisted_at IS NULL)"
                    ))
                content_columns = {column["name"] for column in inspect(connection).get_columns("content_assets")}
                if {"review_status", "reviewer", "review_reason", "compliance_findings_json", "review_findings_snapshot_json", "reviewed_at"}.issubset(content_columns):
                    connection.execute(text(
                        "UPDATE content_assets SET review_status = 'pending', reviewer = '', review_reason = '', "
                        "review_findings_snapshot_json = '[]', reviewed_at = NULL "
                        "WHERE review_status = 'approved' "
                        "AND COALESCE(TRIM(compliance_findings_json), '') NOT IN ('', '[]') "
                        "AND (COALESCE(TRIM(review_findings_snapshot_json), '') IN ('', '[]') OR reviewed_at IS NULL)"
                    ))
                proposal_columns = {column["name"] for column in inspect(connection).get_columns("ai_proposals")}
                if {"id", "origin", "prompt_template_version", "candidates_json", "data_nature", "is_stale", "stale_reason", "source_description", "source_confirmed_at"}.issubset(proposal_columns):
                    legacy_fixture_title = "全棉轻适通勤内搭机会（待验证）"
                    legacy_fixture_description = "结构化AI建议候选；不代表市场结论。"
                    legacy_candidates = connection.execute(text(
                        "SELECT id, candidates_json FROM ai_proposals "
                        "WHERE origin = 'manual_ai_import' AND prompt_template_version = 'manual_template_v1'"
                    )).all()
                    for proposal_id, candidates_json in legacy_candidates:
                        try:
                            candidates = json.loads(candidates_json or "[]")
                        except (TypeError, json.JSONDecodeError):
                            candidates = []
                        if any(
                            isinstance(candidate, dict)
                            and candidate.get("title") == legacy_fixture_title
                            and candidate.get("description") == legacy_fixture_description
                            for candidate in candidates
                        ):
                            connection.execute(text(
                                "UPDATE ai_proposals SET origin = 'fixed_demo', data_nature = 'fixed_demo', is_stale = 1, "
                                "stale_reason = 'Schema 4通过模板版本与候选签名识别为旧版内置fixed_demo。' WHERE id = :id"
                            ), {"id": proposal_id})
                    connection.execute(text(
                        "UPDATE ai_proposals SET data_nature = 'fixed_demo', is_stale = 1, "
                        "stale_reason = 'Schema 4识别为旧版fixed_demo；禁止进入正式域或AI产出统计。' "
                        "WHERE origin = 'fixed_demo'"
                    ))
                    connection.execute(text(
                        "UPDATE ai_proposals SET data_nature = 'manual_import', is_stale = 1, "
                        "stale_reason = 'Schema 4要求重新确认人工导入来源；旧记录未保存来源确认。' "
                        "WHERE origin = 'manual_ai_import' "
                        "AND (source_confirmed_at IS NULL OR TRIM(source_description) = '')"
                    ))
                    for table in ("opportunities", "product_concepts", "content_assets", "change_proposals"):
                        columns = {column["name"] for column in inspect(connection).get_columns(table)}
                        if {"source_proposal_id", "data_nature", "is_stale", "stale_reason"}.issubset(columns):
                            connection.execute(text(
                                f"UPDATE {table} SET data_nature = 'fixed_demo', is_stale = 1, "
                                "stale_reason = 'Schema 4识别其来源为旧版fixed_demo；禁止计入正式或AI产出统计。' "
                                "WHERE source_proposal_id IN (SELECT id FROM ai_proposals WHERE origin = 'fixed_demo')"
                            ))
                            connection.execute(text(
                                f"UPDATE {table} SET data_nature = 'manual_import', is_stale = 1, "
                                "stale_reason = 'Schema 4要求重新确认人工导入来源；旧记录未保存来源确认。' "
                                "WHERE source_proposal_id IN ("
                                "SELECT id FROM ai_proposals WHERE origin = 'manual_ai_import' "
                                "AND (source_confirmed_at IS NULL OR TRIM(source_description) = '')"
                                ")"
                            ))
                            connection.execute(text(
                                f"UPDATE {table} SET is_stale = 1, "
                                "stale_reason = 'Schema 4禁止fixed_demo或未验收AI对象进入真实前向流程。' "
                                "WHERE data_nature IN ('fixed_demo', 'ai_proposal')"
                            ))
                connection.execute(text("INSERT INTO schema_migrations(version, applied_at) VALUES (4, CURRENT_TIMESTAMP)"))
            current = 4
        if current < 5:
            with active_engine.begin() as connection:
                concept_columns = {column["name"] for column in inspect(connection).get_columns("product_concepts")}
                if "source_scenario_id" not in concept_columns:
                    connection.execute(text(
                        'ALTER TABLE "product_concepts" ADD COLUMN "source_scenario_id" VARCHAR(32)'
                    ))
                scenario_columns = {column["name"]: column for column in inspect(connection).get_columns("scenario_candidates")}
                concept_id_column = scenario_columns.get("concept_id")
                if concept_id_column and not concept_id_column.get("nullable", True):
                    if connection.dialect.name == "sqlite":
                        _sqlite_make_scenario_concept_nullable(connection)
                    else:
                        connection.execute(text(
                            'ALTER TABLE "scenario_candidates" ALTER COLUMN "concept_id" DROP NOT NULL'
                        ))
                connection.execute(text(
                    "UPDATE product_concepts SET is_stale = 1, "
                    "stale_reason = 'Schema 5旧Concept缺少人工shortlist Scenario来源；须从候选宇宙重新shortlist后创建。' "
                    "WHERE COALESCE(TRIM(source_scenario_id), '') = ''"
                ))
                if "concept_id" in scenario_columns:
                    connection.execute(text(
                        "UPDATE scenario_candidates SET is_stale = 1, "
                        "stale_reason = 'Schema 5识别为旧版Concept先行情景；须从Opportunity重新生成候选宇宙。' "
                        "WHERE concept_id IS NOT NULL AND is_stale = 0"
                    ))
                concept_columns = {column["name"] for column in inspect(connection).get_columns("product_concepts")}
                content_columns = {column["name"] for column in inspect(connection).get_columns("content_assets")}
                if {"id", "project_id", "is_stale"}.issubset(concept_columns) and {"id", "concept_id", "project_id", "is_stale", "stale_reason"}.issubset(content_columns):
                    connection.execute(text(
                        "UPDATE content_assets SET is_stale = 1, "
                        "stale_reason = 'Schema 5上游旧Concept缺少人工shortlist来源；内容资产失效。' "
                        "WHERE concept_id IN (SELECT id FROM product_concepts WHERE is_stale = 1)"
                    ))
                    feedback_columns = {column["name"] for column in inspect(connection).get_columns("feedback_records")}
                    if {"content_asset_id", "concept_id", "project_id", "is_stale", "stale_reason"}.issubset(feedback_columns):
                        connection.execute(text(
                            "UPDATE feedback_records SET is_stale = 1, "
                            "stale_reason = 'Schema 5上游旧Concept或Content失效；反馈不得继续驱动变更。' "
                            "WHERE concept_id IN (SELECT id FROM product_concepts WHERE is_stale = 1) "
                            "OR content_asset_id IN (SELECT id FROM content_assets WHERE is_stale = 1)"
                        ))
                    change_columns = {column["name"] for column in inspect(connection).get_columns("change_proposals")}
                    if {"target_entity_type", "target_entity_id", "project_id", "is_stale", "stale_reason"}.issubset(change_columns):
                        connection.execute(text(
                            "UPDATE change_proposals SET is_stale = 1, "
                            "stale_reason = 'Schema 5目标旧Concept或Content失效；变更建议不得继续接受。' "
                            "WHERE (target_entity_type = 'product_concept' AND target_entity_id IN "
                            "(SELECT id FROM product_concepts WHERE is_stale = 1)) OR "
                            "(target_entity_type = 'content_asset' AND target_entity_id IN "
                            "(SELECT id FROM content_assets WHERE is_stale = 1))"
                        ))
                    policy_columns = {column["name"] for column in inspect(connection).get_columns("recommendation_policies")}
                    if {"project_id", "is_stale", "stale_reason"}.issubset(policy_columns):
                        connection.execute(text(
                            "UPDATE recommendation_policies SET is_stale = 1, "
                            "stale_reason = 'Schema 5项目包含旧漏斗反馈；Recommendation须基于新漏斗重算。' "
                            "WHERE project_id IN (SELECT project_id FROM product_concepts WHERE is_stale = 1)"
                        ))
                connection.execute(text(
                    'CREATE UNIQUE INDEX IF NOT EXISTS "ix_product_concepts_source_scenario_id" '
                    'ON "product_concepts" ("source_scenario_id")'
                ))
                connection.execute(text("INSERT INTO schema_migrations(version, applied_at) VALUES (5, CURRENT_TIMESTAMP)"))
        Base.metadata.create_all(active_engine)
    with active_engine.begin() as connection:
        for pack in CATEGORY_PACKS:
            existing = connection.execute(text("SELECT id FROM category_packs WHERE id=:id"), {"id": pack["id"]}).first()
            if not existing:
                connection.execute(text("INSERT INTO category_packs(id,name,version,status,category_type,description,config_json,created_at,updated_at) VALUES (:id,:name,:version,:status,:category_type,:description,:config_json,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"), {**{key: pack[key] for key in ("id", "name", "version", "status", "category_type", "description")}, "config_json": json.dumps(pack["config"], ensure_ascii=False, sort_keys=True)})
    return SCHEMA_VERSION


def get_session() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

