import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import SessionLocal, EventRow, IncidentRow

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_stats_and_incidents_empty():
    res_stats = client.get("/api/stats")
    assert res_stats.status_code == 200
    data = res_stats.json()
    assert "raw_events" in data
    assert "incidents" in data
    assert "noise_suppressed_pct" in data

def test_incident_not_found():
    res = client.get("/api/incidents/INC-999.999.999.999")
    assert res.status_code == 404

def test_demo_trigger_validation():
    res_bad = client.post("/api/demo/malicious_command")
    assert res_bad.status_code == 400

    res_good = client.post("/api/demo/targeted")
    assert res_good.status_code == 200
    assert res_good.json()["status"] == "triggered"

def test_demo_reset():
    res_reset = client.post("/api/demo/reset")
    assert res_reset.status_code == 200
    assert res_reset.json()["ok"] is True
