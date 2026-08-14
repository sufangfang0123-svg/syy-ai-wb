from __future__ import annotations

import os
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


APP_VERSION = "0.2.0"
SCHEMA_VERSION = 1
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
    if current < 1:
        Base.metadata.create_all(active_engine)
        with active_engine.begin() as connection:
            connection.execute(text("INSERT INTO schema_migrations(version, applied_at) VALUES (1, CURRENT_TIMESTAMP)"))
    else:
        Base.metadata.create_all(active_engine)
    return SCHEMA_VERSION


def get_session() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

