import uuid

from fastapi.testclient import TestClient

from app.db import EndpointAgentRow, EndpointSecurityEventRow, SessionLocal, init_db
from app.main import app

client = TestClient(app)


def test_agent_enrollment_ingestion_and_revocation(monkeypatch):
    init_db()
    admin_token = "test-admin-token-" + uuid.uuid4().hex + "extra"
    monkeypatch.setenv("MIRAGE_AGENT_ADMIN_TOKEN", admin_token)

    registration = client.post(
        "/api/agents/register",
        headers={"X-MIRAGE-Admin-Token": admin_token},
        json={
            "hostname": "test-endpoint-" + uuid.uuid4().hex[:8],
            "operatingSystem": "Linux",
            "osVersion": "test-os",
            "agentVersion": "0.1.0",
        },
    )
    assert registration.status_code == 201
    details = registration.json()
    agent_id = details["agentId"]
    credential = details["credential"]

    try:
        assert details["status"] == "pending"
        assert "token_hash" not in details
        assert credential not in str(client.get(
            "/api/agents",
            headers={"X-MIRAGE-Admin-Token": admin_token},
        ).json())

        invalid = client.post(
            "/api/agents/heartbeat",
            headers={"Authorization": "Bearer invalid"},
            json={},
        )
        assert invalid.status_code == 401

        event = {
            "eventId": "evt-" + uuid.uuid4().hex,
            "timestamp": "2026-11-01T00:00:00Z",
            "source": "sshd",
            "eventType": "ssh_login_failed",
            "severity": "medium",
            "message": "Failed SSH authentication; password=hunter2",
            "sourceIp": "192.0.2.10",
            "raw": {
                "password": "must-not-be-stored",
                "eventCode": 4625,
                "logMessage": "password hunter2",
            },
        }
        ingested = client.post(
            "/api/agents/events",
            headers={"Authorization": f"Bearer {credential}"},
            json={"events": [event, event]},
        )
        assert ingested.status_code == 200
        assert ingested.json()["inserted"] == 1
        assert ingested.json()["duplicates"] == 1

        stored = client.get(
            f"/api/agents/{agent_id}/events",
            headers={"X-MIRAGE-Admin-Token": admin_token},
        )
        assert stored.status_code == 200
        assert len(stored.json()) == 1
        assert "password" not in stored.json()[0]["raw"]
        assert "hunter2" not in stored.json()[0]["message"]
        assert "hunter2" not in str(stored.json()[0]["raw"])

        heartbeat = client.post(
            "/api/agents/heartbeat",
            headers={"Authorization": f"Bearer {credential}"},
            json={"agentVersion": "0.1.1"},
        )
        assert heartbeat.status_code == 200
        assert heartbeat.json()["agentId"] == agent_id

        rotated = client.post(
            f"/api/agents/{agent_id}/rotate",
            headers={"X-MIRAGE-Admin-Token": admin_token},
        )
        assert rotated.status_code == 200
        new_credential = rotated.json()["credential"]
        assert new_credential != credential
        old_credential_rejected = client.post(
            "/api/agents/heartbeat",
            headers={"Authorization": f"Bearer {credential}"},
            json={},
        )
        assert old_credential_rejected.status_code == 401
        new_heartbeat = client.post(
            "/api/agents/heartbeat",
            headers={"Authorization": f"Bearer {new_credential}"},
            json={},
        )
        assert new_heartbeat.status_code == 200

        revoked = client.post(
            f"/api/agents/{agent_id}/revoke",
            headers={"X-MIRAGE-Admin-Token": admin_token},
        )
        assert revoked.status_code == 200
        assert revoked.json()["status"] == "revoked"

        rejected = client.post(
            "/api/agents/heartbeat",
            headers={"Authorization": f"Bearer {new_credential}"},
            json={},
        )
        assert rejected.status_code == 401
    finally:
        with SessionLocal() as db:
            db.query(EndpointSecurityEventRow).filter(
                EndpointSecurityEventRow.agent_id == agent_id
            ).delete()
            db.query(EndpointAgentRow).filter(EndpointAgentRow.id == agent_id).delete()
            db.commit()


def test_agent_admin_api_requires_configured_secret(monkeypatch):
    monkeypatch.delenv("MIRAGE_AGENT_ADMIN_TOKEN", raising=False)
    response = client.get("/api/agents")
    assert response.status_code == 503


def test_agent_registration_requires_admin_secret(monkeypatch):
    monkeypatch.setenv("MIRAGE_AGENT_ADMIN_TOKEN", "a" * 40)
    response = client.post(
        "/api/agents/register",
        headers={"X-MIRAGE-Admin-Token": "wrong"},
        json={
            "hostname": "unauthorized",
            "operatingSystem": "Linux",
            "osVersion": "test",
            "agentVersion": "0.1.0",
        },
    )
    assert response.status_code == 401


def test_agent_event_body_size_is_limited_before_parsing():
    response = client.post(
        "/api/agents/events",
        content=b"x" * (512 * 1024 + 1),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 413
