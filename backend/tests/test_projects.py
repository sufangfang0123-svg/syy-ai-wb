from pathlib import Path

from sqlalchemy import select


def test_health_database_and_version(client):
    payload = client.get("/api/v1/health").json()
    assert payload == {"status": "ok", "version": "0.4.0", "database": "ready", "schema_version": 5}


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
    assert run_migrations(engine) == 5
    assert run_migrations(engine) == 5
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
    assert run_migrations(engine) == 5
    with engine.connect() as connection:
        assert connection.exec_driver_sql("SELECT name FROM projects WHERE id='legacy'").scalar_one() == "v0.2保留项目"
        assert connection.exec_driver_sql("SELECT current_round FROM projects WHERE id='legacy'").scalar_one() == 1
        assert connection.exec_driver_sql("SELECT category_pack_id FROM projects WHERE id='legacy'").scalar_one() == "woven_apparel_v1"
        assert connection.exec_driver_sql("SELECT COUNT(*) FROM schema_migrations").scalar_one() == 5


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


def test_v03_workbench_rows_migrate_to_v04_without_data_loss(tmp_path):
    from app.database import make_engine, run_migrations

    engine = make_engine(f"sqlite:///{(tmp_path / 'schema3.sqlite3').as_posix()}")
    with engine.begin() as connection:
        connection.exec_driver_sql("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)")
        connection.exec_driver_sql("INSERT INTO schema_migrations VALUES (3, CURRENT_TIMESTAMP)")
        connection.exec_driver_sql("CREATE TABLE scenario_candidates (id VARCHAR(32) PRIMARY KEY, status VARCHAR(24) NOT NULL DEFAULT 'candidate_space', review_reason TEXT NOT NULL DEFAULT '', priority FLOAT, priority_inputs_json TEXT NOT NULL DEFAULT '{}', priority_policy_version VARCHAR(80), missing_inputs_json TEXT NOT NULL DEFAULT '[]', rationale TEXT NOT NULL DEFAULT '', is_stale BOOLEAN NOT NULL DEFAULT 0, stale_reason TEXT NOT NULL DEFAULT '')")
        connection.exec_driver_sql("CREATE TABLE content_assets (id VARCHAR(32) PRIMARY KEY, body TEXT NOT NULL DEFAULT '', source_proposal_id VARCHAR(32), compliance_findings_json TEXT NOT NULL DEFAULT '[]', review_status VARCHAR(20) NOT NULL DEFAULT 'pending', reviewer VARCHAR(160) NOT NULL DEFAULT '', review_reason TEXT NOT NULL DEFAULT '', data_nature VARCHAR(24) NOT NULL DEFAULT 'real_entry', is_stale BOOLEAN NOT NULL DEFAULT 0, stale_reason TEXT NOT NULL DEFAULT '')")
        connection.exec_driver_sql("CREATE TABLE ai_proposals (id VARCHAR(32) PRIMARY KEY, origin VARCHAR(24) NOT NULL, prompt_template_version VARCHAR(60) NOT NULL DEFAULT '', candidates_json TEXT NOT NULL DEFAULT '[]', data_nature VARCHAR(24) NOT NULL DEFAULT 'ai_proposal', is_stale BOOLEAN NOT NULL DEFAULT 0, stale_reason TEXT NOT NULL DEFAULT '')")
        connection.exec_driver_sql("CREATE TABLE opportunities (id VARCHAR(32) PRIMARY KEY, source_proposal_id VARCHAR(32), data_nature VARCHAR(24) NOT NULL DEFAULT 'real_entry', is_stale BOOLEAN NOT NULL DEFAULT 0, stale_reason TEXT NOT NULL DEFAULT '')")
        connection.exec_driver_sql("CREATE TABLE product_concepts (id VARCHAR(32) PRIMARY KEY, source_proposal_id VARCHAR(32), data_nature VARCHAR(24) NOT NULL DEFAULT 'real_entry', is_stale BOOLEAN NOT NULL DEFAULT 0, stale_reason TEXT NOT NULL DEFAULT '')")
        connection.exec_driver_sql("CREATE TABLE change_proposals (id VARCHAR(32) PRIMARY KEY, source_proposal_id VARCHAR(32), data_nature VARCHAR(24) NOT NULL DEFAULT 'real_entry', is_stale BOOLEAN NOT NULL DEFAULT 0, stale_reason TEXT NOT NULL DEFAULT '')")
        connection.exec_driver_sql("INSERT INTO scenario_candidates(id, review_reason, priority, priority_inputs_json, priority_policy_version, rationale) VALUES ('scn_v3', '旧复核理由', 88.0, '{\"evidence_fit\":90,\"execution\":60}', 'WOVEN_PRIORITY_V1', '旧版共享评分')")
        connection.exec_driver_sql("INSERT INTO scenario_candidates(id, review_reason, priority_inputs_json, rationale) VALUES ('scn_v3_inputs_only', '旧输入', '{\"evidence_fit\":75}', '旧版仅保存共享输入')")
        connection.exec_driver_sql("INSERT INTO scenario_candidates(id, status, review_reason) VALUES ('scn_legacy_shortlist', 'validation', '旧版人工选择但无完整追溯')")
        connection.exec_driver_sql("INSERT INTO content_assets(id, body) VALUES ('cnt_v3', '旧内容')")
        connection.exec_driver_sql("INSERT INTO content_assets(id, body, compliance_findings_json, review_status, reviewer, review_reason) VALUES ('cnt_legacy_approved', '含风险声明', '[{\"type\":\"absolute_claim\"}]', 'approved', '旧审核人', '旧审核理由')")
        connection.exec_driver_sql("INSERT INTO content_assets(id, body, compliance_findings_json, review_status, reviewer, review_reason) VALUES ('cnt_approved_clean', '无风险声明', '[]', 'approved', '旧审核人', '无findings')")
        connection.exec_driver_sql("INSERT INTO ai_proposals(id, origin, prompt_template_version, candidates_json) VALUES ('aip_v3', 'manual_ai_import', 'manual_v1', '[{\"title\":\"普通人工导入\"}]')")
        connection.exec_driver_sql("INSERT INTO ai_proposals(id, origin, prompt_template_version, candidates_json, data_nature) VALUES ('aip_fixed_v3', 'fixed_demo', 'fixture_v1', '[{\"title\":\"既有固定演示\"}]', 'ai_proposal')")
        connection.exec_driver_sql("INSERT INTO ai_proposals(id, origin, prompt_template_version, candidates_json, data_nature) VALUES ('aip_legacy_fixture', 'manual_ai_import', 'manual_template_v1', '[{\"title\":\"全棉轻适通勤内搭机会（待验证）\",\"description\":\"结构化AI建议候选；不代表市场结论。\"}]', 'ai_proposal')")
        connection.exec_driver_sql("INSERT INTO ai_proposals(id, origin, prompt_template_version, candidates_json, data_nature) VALUES ('aip_near_wrong_prompt', 'manual_ai_import', 'manual_v1', '[{\"title\":\"全棉轻适通勤内搭机会（待验证）\"}]', 'ai_proposal')")
        connection.exec_driver_sql("INSERT INTO ai_proposals(id, origin, prompt_template_version, candidates_json, data_nature) VALUES ('aip_near_wrong_title', 'manual_ai_import', 'manual_template_v1', '[{\"title\":\"全棉轻适通勤内搭机会\"}]', 'ai_proposal')")
        connection.exec_driver_sql("INSERT INTO ai_proposals(id, origin, prompt_template_version, candidates_json, data_nature) VALUES ('aip_near_wrong_description', 'manual_ai_import', 'manual_template_v1', '[{\"title\":\"全棉轻适通勤内搭机会（待验证）\",\"description\":\"用户自行编写的同名候选\"}]', 'ai_proposal')")
        connection.exec_driver_sql("INSERT INTO opportunities(id, source_proposal_id) VALUES ('opp_v3', 'aip_v3')")
        connection.exec_driver_sql("INSERT INTO opportunities(id, source_proposal_id, data_nature) VALUES ('opp_fixed_v3', 'aip_fixed_v3', 'ai_proposal')")
        connection.exec_driver_sql("INSERT INTO opportunities(id, source_proposal_id, data_nature) VALUES ('opp_legacy_fixture', 'aip_legacy_fixture', 'ai_proposal')")
        connection.exec_driver_sql("INSERT INTO product_concepts(id, source_proposal_id, data_nature) VALUES ('con_fixed_v3', 'aip_fixed_v3', 'ai_proposal')")
        connection.exec_driver_sql("INSERT INTO content_assets(id, body, source_proposal_id, data_nature) VALUES ('cnt_fixed_v3', '固定演示内容', 'aip_fixed_v3', 'ai_proposal')")
        connection.exec_driver_sql("INSERT INTO change_proposals(id, source_proposal_id, data_nature) VALUES ('chg_fixed_v3', 'aip_fixed_v3', 'ai_proposal')")
        for table, prefix in (("opportunities", "opp"), ("product_concepts", "con"), ("change_proposals", "chg")):
            connection.exec_driver_sql(
                f"INSERT INTO {table}(id, data_nature) VALUES ('{prefix}_orphan_fixed', 'fixed_demo'), ('{prefix}_orphan_ai', 'ai_proposal')"
            )
        connection.exec_driver_sql(
            "INSERT INTO content_assets(id, body, data_nature) VALUES "
            "('cnt_orphan_fixed', '无source的固定演示内容', 'fixed_demo'), "
            "('cnt_orphan_ai', '无source的未验收AI内容', 'ai_proposal')"
        )

    assert run_migrations(engine) == 5
    with engine.connect() as connection:
        scenario = connection.exec_driver_sql(
            "SELECT review_reason, shortlisted_by, shortlist_reason, shortlist_evidence_ids_json, shortlisted_at, priority, priority_inputs_json, priority_policy_version, rationale FROM scenario_candidates WHERE id='scn_v3'"
        ).one()
        content = connection.exec_driver_sql(
            "SELECT body, review_findings_snapshot_json, reviewed_at FROM content_assets WHERE id='cnt_v3'"
        ).one()
        proposal = connection.exec_driver_sql(
            "SELECT origin, data_nature, source_description, source_confirmed_at, is_stale, stale_reason FROM ai_proposals WHERE id='aip_v3'"
        ).one()
        fixed_proposal = connection.exec_driver_sql(
            "SELECT origin, data_nature, is_stale, stale_reason FROM ai_proposals WHERE id='aip_fixed_v3'"
        ).one()
        legacy_fixture = connection.exec_driver_sql(
            "SELECT origin, data_nature, is_stale, stale_reason FROM ai_proposals WHERE id='aip_legacy_fixture'"
        ).one()
        near_misses = connection.exec_driver_sql(
            "SELECT id, origin, data_nature, is_stale FROM ai_proposals WHERE id IN ('aip_near_wrong_prompt','aip_near_wrong_title','aip_near_wrong_description') ORDER BY id"
        ).all()
        opportunity = connection.exec_driver_sql(
            "SELECT data_nature, is_stale, stale_reason FROM opportunities WHERE id='opp_v3'"
        ).one()
        fixed_downstream = [
            connection.exec_driver_sql(f"SELECT data_nature, is_stale, stale_reason FROM {table} WHERE id='{row_id}'").one()
            for table, row_id in (
                ("opportunities", "opp_fixed_v3"),
                ("opportunities", "opp_legacy_fixture"),
                ("product_concepts", "con_fixed_v3"),
                ("content_assets", "cnt_fixed_v3"),
                ("change_proposals", "chg_fixed_v3"),
            )
        ]
        inputs_only = connection.exec_driver_sql(
            "SELECT priority_inputs_json, rationale, is_stale FROM scenario_candidates WHERE id='scn_v3_inputs_only'"
        ).one()
        legacy_shortlist = connection.exec_driver_sql(
            "SELECT status, is_stale, stale_reason FROM scenario_candidates WHERE id='scn_legacy_shortlist'"
        ).one()
        legacy_review = connection.exec_driver_sql(
            "SELECT review_status, reviewer, review_reason, review_findings_snapshot_json, reviewed_at "
            "FROM content_assets WHERE id='cnt_legacy_approved'"
        ).one()
        clean_review = connection.exec_driver_sql(
            "SELECT review_status, reviewer, review_reason, review_findings_snapshot_json, reviewed_at "
            "FROM content_assets WHERE id='cnt_approved_clean'"
        ).one()
        orphan_formal_rows = [
            connection.exec_driver_sql(
                f"SELECT data_nature, is_stale, stale_reason FROM {table} WHERE id='{row_id}'"
            ).one()
            for table, row_id in (
                ("opportunities", "opp_orphan_fixed"),
                ("opportunities", "opp_orphan_ai"),
                ("product_concepts", "con_orphan_fixed"),
                ("product_concepts", "con_orphan_ai"),
                ("content_assets", "cnt_orphan_fixed"),
                ("content_assets", "cnt_orphan_ai"),
                ("change_proposals", "chg_orphan_fixed"),
                ("change_proposals", "chg_orphan_ai"),
            )
        ]
        assert scenario[:8] == ("旧复核理由", "", "", "[]", None, None, "{}", None)
        assert "Schema 4已撤销旧版共享priority；旧值=88.0" in scenario[8]
        assert inputs_only[0] == "{}" and "旧值=none" in inputs_only[1]
        assert inputs_only[2] == 0
        assert legacy_shortlist[:2] == ("validation", 1)
        assert "重新shortlist" in legacy_shortlist[2]
        assert content == ("旧内容", "[]", None)
        assert legacy_review == ("pending", "", "", "[]", None)
        assert clean_review[:4] == ("approved", "旧审核人", "无findings", "[]")
        assert proposal[:5] == ("manual_ai_import", "manual_import", "", None, 1)
        assert "重新确认人工导入来源" in proposal[5]
        assert fixed_proposal[:3] == ("fixed_demo", "fixed_demo", 1)
        assert "fixed_demo" in fixed_proposal[3]
        assert legacy_fixture[:3] == ("fixed_demo", "fixed_demo", 1)
        assert "fixed_demo" in legacy_fixture[3]
        assert all(row[1:] == ("manual_ai_import", "manual_import", 1) for row in near_misses)
        assert opportunity[:2] == ("manual_import", 1) and "重新确认人工导入来源" in opportunity[2]
        assert all(row[:2] == ("fixed_demo", 1) for row in fixed_downstream)
        assert {row[0] for row in orphan_formal_rows} == {"fixed_demo", "ai_proposal"}
        assert all(row[1] == 1 for row in orphan_formal_rows)
        assert connection.exec_driver_sql("SELECT MAX(version) FROM schema_migrations").scalar_one() == 5
    engine.dispose()


def test_v04_workbench_entities_survive_engine_restart(tmp_path):
    from app.database import make_engine, run_migrations, sessionmaker
    from app.models import AuditEvent, Project
    from app.workbench_models import AIProposal, ChangeProposal, ContentAsset, Opportunity, ProductConcept, RecommendationPolicy, ScenarioCandidate
    path = tmp_path / "workbench-persist.sqlite3"
    first = make_engine(f"sqlite:///{path.as_posix()}")
    run_migrations(first)
    FirstSession = sessionmaker(bind=first, expire_on_commit=False)
    with FirstSession.begin() as session:
        project = Project(id="prj_restart", name="全链路重启恢复", decision_question="是否恢复？")
        session.add(project)
        session.flush()
        opportunity = Opportunity(id="opp_restart", project_id=project.id, title="恢复机会", description="待验证")
        session.add(opportunity)
        session.flush()
        scenario = ScenarioCandidate(id="scn_restart", project_id=project.id, opportunity_id=opportunity.id, concept_id=None, persona="通勤人群", product_gene="领口变量", channel="小红书", status="shortlisted", shortlisted_by="验收人", shortlist_reason="有明确证据", shortlist_evidence_ids_json='["ev_restart"]', shortlisted_at=project.created_at)
        session.add(scenario)
        session.flush()
        concept = ProductConcept(id="con_restart", project_id=project.id, opportunity_id=opportunity.id, source_scenario_id=scenario.id, name="恢复概念")
        session.add(concept)
        session.flush()
        scenario.concept_id = concept.id
        content = ContentAsset(id="cnt_restart", project_id=project.id, opportunity_id=opportunity.id, concept_id=concept.id, channel="小红书", body="待验证内容", reviewer="验收人", review_reason="记录风险", review_findings_snapshot_json='[{"type":"test"}]', reviewed_at=project.created_at)
        proposal = AIProposal(id="aip_restart", project_id=project.id, task_type="opportunity", input_snapshot_hash="0" * 64, origin="manual_ai_import", prompt_template_version="manual_v1", output_schema_version="ai_proposal_v1", candidates_json="[]")
        change = ChangeProposal(id="chg_restart", project_id=project.id, target_entity_type="product_concept", target_entity_id=concept.id, proposed_patch_json='{"need":"待验证"}', rationale="人工待审")
        policy = RecommendationPolicy(id="pol_restart", project_id=project.id, policy_version="WOVEN_RECOMMENDATION_V1", dimensions_json="[]")
        audit = AuditEvent(project_id=project.id, entity_type="scenario_candidate", entity_id=scenario.id, action="shortlisted", change_summary="人工纳入shortlist", actor="验收人", data_nature="manual_hypothesis", metadata_json='{"evidence_ids":["ev_restart"]}')
        session.add_all([scenario, content, proposal, change, policy, audit])
    first.dispose()
    second = make_engine(f"sqlite:///{path.as_posix()}")
    run_migrations(second)
    SecondSession = sessionmaker(bind=second)
    with SecondSession() as session:
        assert session.get(Opportunity, "opp_restart").title == "恢复机会"
        assert session.get(ProductConcept, "con_restart").source_scenario_id == "scn_restart"
        assert session.get(ScenarioCandidate, "scn_restart").priority is None
        assert session.get(ScenarioCandidate, "scn_restart").concept_id == "con_restart"
        assert session.get(ScenarioCandidate, "scn_restart").shortlist_reason == "有明确证据"
        assert session.get(ContentAsset, "cnt_restart").body == "待验证内容"
        assert session.get(ContentAsset, "cnt_restart").review_findings_snapshot_json == '[{"type":"test"}]'
        assert session.get(AIProposal, "aip_restart").origin == "manual_ai_import"
        assert session.get(ChangeProposal, "chg_restart").status == "proposed"
        assert session.get(RecommendationPolicy, "pol_restart").data_insufficient is True
        assert session.scalar(select(AuditEvent).where(AuditEvent.entity_id == "scn_restart", AuditEvent.action == "shortlisted")).actor == "验收人"
    second.dispose()


def test_v04_funnel_rows_migrate_to_v05_with_nullable_scenario_concept_and_stale_cascade(tmp_path):
    from app.database import make_engine, run_migrations

    engine = make_engine(f"sqlite:///{(tmp_path / 'schema4-funnel.sqlite3').as_posix()}")
    with engine.begin() as connection:
        connection.exec_driver_sql("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)")
        connection.exec_driver_sql("INSERT INTO schema_migrations VALUES (4, CURRENT_TIMESTAMP)")
        connection.exec_driver_sql(
            "CREATE TABLE scenario_candidates (id VARCHAR(32) PRIMARY KEY, project_id VARCHAR(32) NOT NULL, "
            "opportunity_id VARCHAR(32) NOT NULL, concept_id VARCHAR(32) NOT NULL, persona VARCHAR(160) NOT NULL, "
            "product_gene VARCHAR(160) NOT NULL, channel VARCHAR(80) NOT NULL, status VARCHAR(24) NOT NULL DEFAULT 'candidate_space', "
            "shortlisted_by VARCHAR(160) NOT NULL DEFAULT '', shortlist_reason TEXT NOT NULL DEFAULT '', "
            "shortlist_evidence_ids_json TEXT NOT NULL DEFAULT '[]', shortlisted_at DATETIME, "
            "is_stale BOOLEAN NOT NULL DEFAULT 0, stale_reason TEXT NOT NULL DEFAULT '')"
        )
        connection.exec_driver_sql(
            "CREATE TABLE product_concepts (id VARCHAR(32) PRIMARY KEY, project_id VARCHAR(32) NOT NULL, "
            "opportunity_id VARCHAR(32) NOT NULL, is_stale BOOLEAN NOT NULL DEFAULT 0, stale_reason TEXT NOT NULL DEFAULT '')"
        )
        connection.exec_driver_sql(
            "CREATE TABLE content_assets (id VARCHAR(32) PRIMARY KEY, project_id VARCHAR(32) NOT NULL, "
            "concept_id VARCHAR(32) NOT NULL, is_stale BOOLEAN NOT NULL DEFAULT 0, stale_reason TEXT NOT NULL DEFAULT '')"
        )
        connection.exec_driver_sql(
            "CREATE TABLE feedback_records (id VARCHAR(32) PRIMARY KEY, project_id VARCHAR(32) NOT NULL, "
            "content_asset_id VARCHAR(32) NOT NULL, concept_id VARCHAR(32) NOT NULL, "
            "is_stale BOOLEAN NOT NULL DEFAULT 0, stale_reason TEXT NOT NULL DEFAULT '')"
        )
        connection.exec_driver_sql(
            "CREATE TABLE change_proposals (id VARCHAR(32) PRIMARY KEY, project_id VARCHAR(32) NOT NULL, "
            "target_entity_type VARCHAR(60) NOT NULL, target_entity_id VARCHAR(32) NOT NULL, "
            "is_stale BOOLEAN NOT NULL DEFAULT 0, stale_reason TEXT NOT NULL DEFAULT '')"
        )
        connection.exec_driver_sql(
            "CREATE TABLE recommendation_policies (id VARCHAR(32) PRIMARY KEY, project_id VARCHAR(32) NOT NULL, "
            "is_stale BOOLEAN NOT NULL DEFAULT 0, stale_reason TEXT NOT NULL DEFAULT '')"
        )
        connection.exec_driver_sql("INSERT INTO product_concepts VALUES ('con_old','prj_old','opp_old',0,'')")
        connection.exec_driver_sql(
            "INSERT INTO scenario_candidates VALUES "
            "('scn_old','prj_old','opp_old','con_old','旧人群','旧变量','电商','validation','旧负责人','旧理由','[\"ev_old\"]',CURRENT_TIMESTAMP,0,'')"
        )
        connection.exec_driver_sql("INSERT INTO content_assets VALUES ('cnt_old','prj_old','con_old',0,'')")
        connection.exec_driver_sql("INSERT INTO feedback_records VALUES ('fbk_old','prj_old','cnt_old','con_old',0,'')")
        connection.exec_driver_sql("INSERT INTO change_proposals VALUES ('chg_old','prj_old','product_concept','con_old',0,'')")
        connection.exec_driver_sql("INSERT INTO recommendation_policies VALUES ('pol_old','prj_old',0,'')")

    assert run_migrations(engine) == 5
    with engine.begin() as connection:
        concept_id_info = next(
            row for row in connection.exec_driver_sql("PRAGMA table_info('scenario_candidates')").all()
            if row[1] == "concept_id"
        )
        assert concept_id_info[3] == 0
        connection.exec_driver_sql(
            "INSERT INTO scenario_candidates(id,project_id,opportunity_id,concept_id,persona,product_gene,channel) "
            "VALUES ('scn_new','prj_old','opp_old',NULL,'新人群','新变量','电商')"
        )
        assert connection.exec_driver_sql("SELECT concept_id FROM scenario_candidates WHERE id='scn_new'").scalar_one_or_none() is None
        assert connection.exec_driver_sql("SELECT source_scenario_id FROM product_concepts WHERE id='con_old'").scalar_one_or_none() is None
        for table, row_id in (
            ("scenario_candidates", "scn_old"),
            ("product_concepts", "con_old"),
            ("content_assets", "cnt_old"),
            ("feedback_records", "fbk_old"),
            ("change_proposals", "chg_old"),
            ("recommendation_policies", "pol_old"),
        ):
            stale, reason = connection.exec_driver_sql(
                f"SELECT is_stale, stale_reason FROM {table} WHERE id='{row_id}'"
            ).one()
            assert stale == 1 and "Schema 5" in reason
    engine.dispose()

