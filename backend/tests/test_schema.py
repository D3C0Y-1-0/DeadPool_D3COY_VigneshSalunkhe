import pytest
from app.schema import NormalizedEvent

def test_frozen_schema_instantiation():
    ev = NormalizedEvent(
        id="evt-001",
        ts="2026-10-31T12:00:00Z",
        source="cowrie",
        sensor="db-prod-02",
        src_ip="203.0.113.50",
        raw_src_ip="172.28.0.50",
        dst_service="ssh",
        dst_port=2222,
        action="command",
        cmd="whoami"
    )
    assert ev.id == "evt-001"
    assert ev.cmd == "whoami"
    assert ev.action == "command"

def test_master_prompt_schema_alias_reconciliation():
    raw_payload = {
        "event_id": "master-uuid-123",
        "timestamp": "2026-10-31T12:05:00Z",
        "sensor": "customer-portal",
        "event_type": "web_request",
        "source_ip": "198.51.100.25",
        "destination_asset": "customer-portal",
        "destination_port": 8080,
        "username": "admin",
        "command": "cat /etc/passwd",
        "request_path": "/admin/backup",
        "raw_event": {"method": "GET"},
        "tags": ["sqli", "lure_accessed"]
    }
    ev = NormalizedEvent(**raw_payload)
    assert ev.id == "master-uuid-123"
    assert ev.ts == "2026-10-31T12:05:00Z"
    assert ev.action == "web_request"
    assert ev.src_ip == "198.51.100.25"
    assert ev.dst_port == 8080
    assert ev.user == "admin"
    assert ev.cmd == "cat /etc/passwd"
    assert ev.raw == {"method": "GET"}
    assert "sqli" in ev.flags

    v1 = ev.to_v1_dict()
    assert v1["event_id"] == "master-uuid-123"
    assert v1["event_type"] == "web_request"
    assert v1["destination_asset"] == "customer-portal"
    assert v1["username"] == "admin"
    assert v1["command"] == "cat /etc/passwd"
