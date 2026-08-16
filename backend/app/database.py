from __future__ import annotations

import os
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


APP_VERSION = "0.4.0"
SCHEMA_VERSION = 3
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


def run_migrations(target_engine=None) -> int:
    from . import models  # noqa: F401

    active_engine = target_engine or engine
    with active_engine.begin() as connection:
        connection.execute(text("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)"))
        current = connection.execute(text("SELECT COALESCE(MAX(version), 0) FROM schema_migrations")).scalar_one()
    if current > SCHEMA_VERSION:
        raise RuntimeError(f"数据库Schema版本{current}高于应用支持的{SCHEMA_VERSION}")
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
        if current < 3:
            Base.metadata.create_all(active_engine)
            with active_engine.begin() as connection:
                connection.execute(text("INSERT INTO schema_migrations(version, applied_at) VALUES (3, CURRENT_TIMESTAMP)"))
        Base.metadata.create_all(active_engine)
    return SCHEMA_VERSION


def get_session() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

