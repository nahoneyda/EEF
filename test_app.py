import app as worker


def test_health():
    client = worker.app.test_client()
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json()["ok"] is True


def test_ef01_dry_run(monkeypatch):
    monkeypatch.setenv("DRY_RUN", "true")
    client = worker.app.test_client()
    response = client.post(
        "/execute",
        json={
            "module_code": "EF-01",
            "content_uuid": "00000000-0000-0000-0000-000000000001",
            "workflow_run_id": "00000000-0000-0000-0000-000000000002",
            "module_run_id": "00000000-0000-0000-0000-000000000003",
        },
    )
    assert response.status_code == 200
    assert response.get_json()["result"]["dry_run"] is True
