from pathlib import Path

from sqlalchemy import select


def test_health_database_and_version(client):
    payload = client.get("/api/v1/health").json()
    assert payload == {"status": "ok", "version": "0.2.0", "database": "ready", "schema_version": 1}


def test_create_update_archive_and_revision(client, project):
    assert project["revision"] == 1
    updated = client.patch(f"/api/v1/projects/{project['id']}", json={"name": "真实闭环验收A-更新", "revision": 1})
    assert updated.status_code == 200
    assert updated.json()["revision"] == 2
    conflict = client.patch(f"/api/v1/projects/{project['id']}", json={"name": "覆盖", "revision": 1})
    assert conflict.status_code == 409
    archived = client.post(f"/api/v1/projects/{project['id']}/archive")
    assert archived.json()["status"] == "archived"
    assert client.get("/api/v1/projects").json() == []


def test_two_projects_are_isolated(client, project):
    other = client.post("/api/v1/projects", json={"name": "真实闭环验收B", "decision_question": "是否继续？"}).json()
    assert project["id"] != other["id"]
    assert client.get(f"/api/v1/projects/{project['id']}").json()["name"] == "真实闭环验收A"
    assert client.get(f"/api/v1/projects/{other['id']}").json()["name"] == "真实闭环验收B"


def test_migration_is_repeatable(tmp_path):
    from app.database import make_engine, run_migrations
    engine = make_engine(f"sqlite:///{(tmp_path / 'repeat.sqlite3').as_posix()}")
    assert run_migrations(engine) == 1
    assert run_migrations(engine) == 1
    with engine.connect() as connection:
        assert connection.exec_driver_sql("SELECT COUNT(*) FROM schema_migrations").scalar_one() == 1


def test_file_database_survives_engine_restart(tmp_path):
    from app.database import make_engine, run_migrations, sessionmaker
    from app.models import Project
    path = tmp_path / "persist.sqlite3"
    first = make_engine(f"sqlite:///{path.as_posix()}")
    run_migrations(first)
    FirstSession = sessionmaker(bind=first, expire_on_commit=False)
    with FirstSession.begin() as session:
        session.add(Project(name="重启恢复", decision_question="能否恢复？"))
    first.dispose()
    second = make_engine(f"sqlite:///{path.as_posix()}")
    SecondSession = sessionmaker(bind=second)
    with SecondSession() as session:
        assert session.scalar(select(Project).where(Project.name == "重启恢复")) is not None

