import time
import pytest
from app.engine.evaluate import evaluate, cadence

def test_botnet_driveby():
    events = [
        {
            "ts": "2026-10-31T10:00:00.000Z",
            "source": "cowrie",
            "sensor": "db-prod-02",
            "zone": "deception",
            "src_ip": "198.51.100.5",
            "dst_service": "ssh",
            "action": "auth",
            "outcome": "failure",
            "user": "root",
            "password": "123456",
            "stage": "credential_attack",
            "techniques": ["T1110.001"],
            "flags": []
        },
        {
            "ts": "2026-10-31T10:00:02.000Z",
            "source": "cowrie",
            "sensor": "db-prod-02",
            "zone": "deception",
            "src_ip": "198.51.100.5",
            "dst_service": "ssh",
            "action": "auth",
            "outcome": "failure",
            "user": "admin",
            "password": "password",
            "stage": "credential_attack",
            "techniques": ["T1110.001"],
            "flags": []
        }
    ]
    inc = evaluate("198.51.100.5", events)
    assert inc["score"] == 0
    assert inc["severity"] == "low"
    assert inc["verdict"] == "opportunistic"
    assert inc["real_asset_touched"] is False
    assert inc["honeytoken_hit"] is False

def test_targeted_adversary():
    events = [
        # 1. Scan
        {
            "ts": "2026-10-31T10:00:00.000Z",
            "source": "tripwire",
            "sensor": "scan-detector",
            "zone": "deception",
            "src_ip": "203.0.113.50",
            "dst_service": "multi",
            "action": "scan",
            "outcome": "success",
            "stage": "recon",
            "techniques": ["T1046", "T1595.001"],
            "flags": ["ports:[2323, 3390, 4445, 5901]"]
        },
        # 2. Login success on Cowrie
        {
            "ts": "2026-10-31T10:00:05.000Z",
            "source": "cowrie",
            "sensor": "db-prod-02",
            "zone": "deception",
            "session_id": "s1",
            "src_ip": "203.0.113.50",
            "dst_service": "ssh",
            "action": "auth",
            "outcome": "success",
            "user": "root",
            "password": "root",
            "stage": "initial_access",
            "techniques": ["T1078.001"],
            "flags": []
        },
        # 3. Human cadence commands
        {
            "ts": "2026-10-31T10:00:08.000Z",
            "source": "cowrie",
            "sensor": "db-prod-02",
            "zone": "deception",
            "session_id": "s1",
            "src_ip": "203.0.113.50",
            "action": "command",
            "cmd": "whoami",
            "stage": "discovery",
            "techniques": ["T1033"],
            "flags": []
        },
        {
            "ts": "2026-10-31T10:00:10.000Z",
            "source": "cowrie",
            "sensor": "db-prod-02",
            "zone": "deception",
            "session_id": "s1",
            "src_ip": "203.0.113.50",
            "action": "command",
            "cmd": "ls /srv/backups",
            "stage": "discovery",
            "techniques": ["T1083"],
            "flags": []
        },
        {
            "ts": "2026-10-31T10:00:14.200Z",
            "source": "cowrie",
            "sensor": "db-prod-02",
            "zone": "deception",
            "session_id": "s1",
            "src_ip": "203.0.113.50",
            "action": "command",
            "cmd": "cat /srv/backups/customer_data_2026.csv",
            "stage": "collection",
            "techniques": ["T1005"],
            "flags": ["crown_jewel"]
        },
        # 4. Portal download with honeytoken
        {
            "ts": "2026-10-31T10:00:20.000Z",
            "source": "portal",
            "sensor": "customer-portal",
            "zone": "deception",
            "src_ip": "203.0.113.50",
            "dst_service": "web",
            "action": "download",
            "outcome": "success",
            "stage": "exfiltration",
            "honeytoken_id": "HT-CUST-001",
            "file": {"name": "customer_data_2026.csv", "sha256": "abc"},
            "techniques": ["T1005", "T1041"],
            "flags": ["crown_jewel", "honeytoken"]
        },
        # 5. Prod touch (firewall allow and auth fail with honeytoken user)
        {
            "ts": "2026-10-31T10:00:25.000Z",
            "source": "prod",
            "sensor": "prod-web-01",
            "zone": "production",
            "src_ip": "203.0.113.50",
            "dst_service": "prod-fw",
            "action": "firewall",
            "outcome": "allow",
            "stage": "lateral_movement",
            "techniques": []
        },
        {
            "ts": "2026-10-31T10:00:27.000Z",
            "source": "prod",
            "sensor": "prod-web-01",
            "zone": "production",
            "src_ip": "203.0.113.50",
            "dst_service": "prod-ssh",
            "action": "auth",
            "outcome": "failure",
            "user": "svc_backup",
            "stage": "lateral_movement",
            "techniques": ["T1078", "T1021.004"],
            "flags": ["honeytoken_use"]
        }
    ]
    inc = evaluate("203.0.113.50", events)
    assert inc["score"] == 100
    assert inc["severity"] == "critical"
    assert inc["verdict"] == "targeted"
    assert inc["real_asset_touched"] is True
    assert inc["honeytoken_hit"] is True
    assert len(inc["real_asset_events"]) == 2
    assert inc["profile"]["cadence"] == "human"

def test_override_rule_critical():
    # Only recon + honeytoken use should trigger critical even with lower raw score
    events = [
        {
            "ts": "2026-10-31T10:00:00Z",
            "source": "prod",
            "sensor": "prod-web-01",
            "zone": "production",
            "src_ip": "203.0.113.99",
            "action": "auth",
            "stage": "recon",
            "flags": ["honeytoken_use"]
        }
    ]
    inc = evaluate("203.0.113.99", events)
    assert inc["severity"] == "critical"

def test_cadence_bot_vs_human():
    # Bot: 0.1s gaps
    bot_cmds = [
        {"ts": f"2026-10-31T10:00:00.{i*100:03d}Z", "action": "command", "cmd": f"cmd_{i}"}
        for i in range(5)
    ]
    cad_bot, _ = cadence(bot_cmds)
    assert cad_bot == "bot"

    # Human: 2-4s variable gaps
    human_cmds = [
        {"ts": "2026-10-31T10:00:01.000Z", "action": "command", "cmd": "whoami"},
        {"ts": "2026-10-31T10:00:03.000Z", "action": "command", "cmd": "ls"},
        {"ts": "2026-10-31T10:00:07.200Z", "action": "command", "cmd": "cat notes.txt"}
    ]
    cad_human, _ = cadence(human_cmds)
    assert cad_human == "human"

def test_cadence_does_not_mix_sessions():
    commands = [
        {"ts": "2026-10-31T10:00:00Z", "action": "command", "cmd": "a", "session_id": "bot"},
        {"ts": "2026-10-31T10:00:00.100Z", "action": "command", "cmd": "b", "session_id": "bot"},
        {"ts": "2026-10-31T10:00:00.200Z", "action": "command", "cmd": "c", "session_id": "bot"},
        {"ts": "2026-10-31T10:01:00Z", "action": "command", "cmd": "a", "session_id": "human"},
        {"ts": "2026-10-31T10:01:02Z", "action": "command", "cmd": "b", "session_id": "human"},
        {"ts": "2026-10-31T10:01:06Z", "action": "command", "cmd": "c", "session_id": "human"},
    ]
    assert cadence(commands) == ("human", 3.0)

def test_cadence_splits_sessions_without_ids_after_idle_gap():
    commands = [
        {"ts": "2026-10-31T10:00:00Z", "action": "command", "cmd": "a", "sensor": "db-prod-02"},
        {"ts": "2026-10-31T10:00:03Z", "action": "command", "cmd": "b", "sensor": "db-prod-02"},
        {"ts": "2026-10-31T10:11:00Z", "action": "command", "cmd": "c", "sensor": "db-prod-02"},
        {"ts": "2026-10-31T10:11:03Z", "action": "command", "cmd": "d", "sensor": "db-prod-02"},
    ]
    assert cadence(commands) == ("unknown", None)

def test_password_spray_correlation():
    events = [
        {
            "ts": f"2026-10-31T10:00:{i:02d}Z",
            "source": "cowrie",
            "sensor": "db-prod-02",
            "zone": "deception",
            "src_ip": "203.0.113.70",
            "action": "auth",
            "outcome": "failure",
            "user": f"user{i % 3}",
            "stage": "credential_attack",
            "techniques": ["T1110.001"]
        }
        for i in range(5)
    ]
    incident = evaluate("203.0.113.70", events)
    assert "T1110.003" in {tech["id"] for tech in incident["techniques"]}
    assert any("Password spray pattern" in factor["label"] for factor in incident["factors"])
    assert next(f["points"] for f in incident["factors"] if "Password spray pattern" in f["label"]) == 0

def test_password_spray_requires_five_failures_and_three_users():
    events = [
        {
            "ts": f"2026-10-31T10:00:{i:02d}Z",
            "source": "cowrie",
            "sensor": "db-prod-02",
            "zone": "deception",
            "src_ip": "203.0.113.71",
            "action": "auth",
            "outcome": "failure",
            "user": f"user{i % 2}",
            "stage": "credential_attack",
            "techniques": ["T1110.001"]
        }
        for i in range(5)
    ]
    incident = evaluate("203.0.113.71", events)
    assert "T1110.003" not in {tech["id"] for tech in incident["techniques"]}

def test_evaluate_ignores_events_from_other_source_ips():
    events = [{
        "ts": "2026-10-31T10:00:00Z",
        "zone": "production",
        "src_ip": "203.0.113.72",
        "action": "auth",
        "stage": "lateral_movement",
        "techniques": ["T1021.004"]
    }]
    assert evaluate("203.0.113.73", events) == {}

def test_performance_1000_events():
    events = []
    base_ts = "2026-10-31T10:00:00.000Z"
    for i in range(1000):
        events.append({
            "ts": f"2026-10-31T10:0{i//600}:{(i%600)//10:02d}.{i%10:03d}Z",
            "source": "cowrie",
            "sensor": "db-prod-02",
            "zone": "deception",
            "src_ip": "203.0.113.50",
            "action": "command" if i % 2 == 0 else "auth",
            "cmd": f"ls /path/{i}",
            "stage": "discovery",
            "techniques": ["T1083"]
        })

    t0 = time.perf_counter()
    inc = evaluate("203.0.113.50", events)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    print(f"\n[Performance] 1,000 events evaluated in {elapsed_ms:.2f} ms")
    assert elapsed_ms < 50.0
    assert inc["score"] > 0
