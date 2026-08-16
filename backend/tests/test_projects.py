from pathlib import Path

from sqlalchemy import select


def test_health_database_and_version(client):
    payload = client.get("/api/v1/health").json()
    assert payload == {"status": "ok", "version": "0.3.1", "database": "ready", "schema_version": 2}


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
    assert run_migrations(engine) == 2
    assert run_migrations(engine) == 2
    with engine.connect() as connection:
        assert connection.exec_driver_sql("SELECT COUNT(*) FROM schema_migrations").scalar_one() == 1


def test_v02_database_migrates_forward_without_losing_project(tmp_path):
    from app.database import make_engine, run_migrations
    engine = make_engine(f"sqlite:///{(tmp_path / 'legacy.sqlite3').as_posix()}")
    with engine.begin() as connection:
        connection.exec_driver_sql("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)")
        connection.exec_driver_sql("INSERT INTO schema_migrations VALUES (1, CURRENT_TIMESTAMP)")
        connection.exec_driver_sql("CREATE TABLE projects (id VARCHAR(32) PRIMARY KEY, name VARCHAR(160), revision INTEGER, created_at DATETIME, updated_at DATETIME)")
        connection.exec_driver_sql("CREATE TABLE evidence (id VARCHAR(32) PRIMARY KEY, project_id VARCHAR(32), created_at DATETIME)")
        connection.exec_driver_sql("CREATE TABLE assumptions (id VARCHAR(32) PRIMARY KEY, project_id VARCHAR(32))")
        connection.exec_driver_sql("CREATE TABLE validation_tests (id VARCHAR(32) PRIMARY KEY, project_id VARCHAR(32), assumption_id VARCHAR(32))")
        connection.exec_driver_sql("CREATE TABLE gate_evaluations (id VARCHAR(32) PRIMARY KEY, project_id VARCHAR(32))")
        connection.exec_driver_sql("CREATE TABLE decisions (id VARCHAR(32) PRIMARY KEY, project_id VARCHAR(32), gate_evaluation_id VARCHAR(32))")
        connection.exec_driver_sql("INSERT INTO projects(id,name,revision,created_at,updated_at) VALUES ('legacy','v0.2保留项目',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
    assert run_migrations(engine) == 2
    with engine.connect() as connection:
        assert connection.exec_driver_sql("SELECT name FROM projects WHERE id='legacy'").scalar_one() == "v0.2保留项目"
        assert connection.exec_driver_sql("SELECT current_round FROM projects WHERE id='legacy'").scalar_one() == 1
        assert connection.exec_driver_sql("SELECT COUNT(*) FROM schema_migrations").scalar_one() == 2


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

