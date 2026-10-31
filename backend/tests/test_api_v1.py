import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_v1_health_and_readiness():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["db"] == "connected"

    r_ready = client.get("/api/v1/health/ready")
    assert r_ready.status_code == 200
    assert r_ready.json()["ready"] is True

    r_sensors = client.get("/api/v1/health/sensors")
    assert r_sensors.status_code == 200
    sensors = r_sensors.json()
    assert len(sensors) >= 4
    names = [s["sensor"] for s in sensors]
    assert "cowrie" in names
    assert "portal" in names

def test_v1_metrics_endpoints():
    r = client.get("/api/v1/metrics/overview")
    assert r.status_code == 200
    data = r.json()
    assert "raw_events" in data
    assert "incidents" in data
    assert "noise_suppressed_pct" in data

    r_time = client.get("/api/v1/metrics/timeline")
    assert r_time.status_code == 200
    assert isinstance(r_time.json(), list)

    r_sens = client.get("/api/v1/metrics/sensors")
    assert r_sens.status_code == 200

    r_sev = client.get("/api/v1/metrics/severity")
    assert r_sev.status_code == 200

def test_v1_attackers_and_techniques():
    r_att = client.get("/api/v1/attackers")
    assert r_att.status_code == 200
    assert isinstance(r_att.json(), list)

    r_tech = client.get("/api/v1/techniques")
    assert r_tech.status_code == 200
    assert isinstance(r_tech.json(), list)

def test_v1_actions_and_demo():
    r_act = client.get("/api/v1/actions")
    assert r_act.status_code == 200
    assert isinstance(r_act.json(), list)

    r_status = client.get("/api/v1/demo/status")
    assert r_status.status_code == 200
    assert r_status.json()["sim_ready"] is True

    r_iocs = client.get("/api/v1/exports/iocs")
    assert r_iocs.status_code == 200
    assert isinstance(r_iocs.json(), list)
