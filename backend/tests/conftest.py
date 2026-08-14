import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "test.sqlite3"
    monkeypatch.setenv("NDG_DATABASE_URL", f"sqlite:///{db_path.as_posix()}")
    monkeypatch.setenv("NDG_DATA_DIR", str(tmp_path / "data"))
    from app import database
    from app.main import app

    test_engine = database.make_engine(f"sqlite:///{db_path.as_posix()}")
    database.run_migrations(test_engine)
    TestingSession = database.sessionmaker(bind=test_engine, expire_on_commit=False)

    def override_session():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[database.get_session] = override_session
    with TestClient(app) as instance:
        yield instance
    app.dependency_overrides.clear()
    test_engine.dispose()


@pytest.fixture()
def project(client):
    response = client.post("/api/v1/projects", json={"name": "真实闭环验收A", "decision_question": "是否进入下一轮样品测试？", "description": "测试项目", "product_category": "棉品", "target_user": "旅行人群"})
    assert response.status_code == 201
    return response.json()

