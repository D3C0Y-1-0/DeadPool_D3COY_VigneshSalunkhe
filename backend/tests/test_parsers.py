import json
import pytest
from app.collector import (
    parse_cowrie, parse_portal, parse_opencanary, parse_tripwire, parse_prod, scan_event, _recent_connections, _scan_flagged
)
from app.schema import NormalizedEvent

def test_cowrie_parser():
    # Connect
    line_connect = {"eventid": "cowrie.session.connect", "src_ip": "172.28.0.50", "session": "s1", "timestamp": "2026-10-31T10:00:00Z"}
    ev = parse_cowrie(line_connect)
    assert ev is not None
    assert ev["action"] == "connect"
    assert ev["src_ip"] == "203.0.113.50"
    assert ev["raw_src_ip"] == "172.28.0.50"

    # Login failed
    line_fail = {"eventid": "cowrie.login.failed", "src_ip": "172.28.0.50", "session": "s1", "username": "admin", "password": "123", "timestamp": "2026-10-31T10:00:01Z"}
    ev_fail = parse_cowrie(line_fail)
    assert ev_fail["action"] == "auth"
    assert ev_fail["outcome"] == "failure"
    assert ev_fail["user"] == "admin"
    assert ev_fail["password"] == "123"

    # Command
    line_cmd = {"eventid": "cowrie.command.input", "src_ip": "172.28.0.50", "session": "s1", "input": "cat /srv/backups/customer_data_2026.csv", "timestamp": "2026-10-31T10:00:02Z"}
    ev_cmd = parse_cowrie(line_cmd)
    assert ev_cmd["action"] == "command"
    assert "customer_data_2026.csv" in ev_cmd["cmd"]

    # Malformed / missing ip
    assert parse_cowrie({"eventid": "cowrie.login.failed"}) is None

def test_portal_parser():
    line_login = {"action": "login", "user": "admin", "password": "' OR 1=1 --", "outcome": "failure", "flags": ["sqli"], "path": "/login", "ts": "2026-10-31T10:05:00.100Z", "src_ip": "172.28.0.50"}
    ev = parse_portal(line_login)
    assert ev["action"] == "auth"
    assert ev["outcome"] == "failure"
    assert "sqli" in ev["flags"]
    assert ev["src_ip"] == "203.0.113.50"

    line_dl = {"action": "download", "path": "/download/customer_data_2026.csv", "honeytoken_id": "HT-CUST-001", "file": {"name": "customer_data_2026.csv", "size": 100, "sha256": "abc"}, "ts": "2026-10-31T10:05:05.500Z", "src_ip": "172.28.0.50"}
    ev_dl = parse_portal(line_dl)
    assert ev_dl["action"] == "download"
    assert ev_dl["honeytoken_id"] == "HT-CUST-001"
    assert ev_dl["file"]["name"] == "customer_data_2026.csv"

def test_opencanary_parser():
    line_mysql = {"dst_port": 3306, "logdata": {"PASSWORD": "pass", "USERNAME": "root"}, "logtype": 8001, "src_host": "172.28.0.50", "utc_time": "2026-10-31 10:10:00.123"}
    ev = parse_opencanary(line_mysql)
    assert ev["action"] == "auth"
    assert ev["dst_service"] == "mysql"
    assert ev["user"] == "root"
    assert ev["dst_port"] == 3306

def test_tripwire_parser():
    line = {"action": "connect", "src_ip": "172.28.0.50", "dst_port": 2323, "service": "telnet", "ts": "2026-10-31T10:15:00.000Z"}
    ev = parse_tripwire(line)
    assert ev["action"] == "connect"
    assert ev["dst_port"] == 2323
    assert ev["dst_service"] == "telnet"

def test_prod_parser():
    line_auth = {"type": "auth", "src_ip": "172.29.0.50", "user": "svc_backup", "outcome": "failure", "honeytoken": True, "ts": "2026-10-31T10:20:00Z"}
    ev = parse_prod(line_auth)
    assert ev["action"] == "auth"
    assert "honeytoken_use" in ev["flags"]
    assert ev["src_ip"] == "203.0.113.50"

def test_scan_detector():
    _recent_connections.clear()
    _scan_flagged.clear()

    ip = "198.51.100.9"
    # 3 distinct ports should NOT trigger scan
    for p in [2323, 4445, 3390]:
        ev = {"action": "connect", "src_ip": ip, "raw_src_ip": "172.28.0.108", "dst_port": p, "zone": "deception", "ts": "2026-10-31T10:00:00Z"}
        assert scan_event(ev) is None

    # Repeated port connection still does NOT trigger
    ev_repeat = {"action": "connect", "src_ip": ip, "raw_src_ip": "172.28.0.108", "dst_port": 2323, "zone": "deception", "ts": "2026-10-31T10:00:01Z"}
    assert scan_event(ev_repeat) is None

    # 4th distinct port DOES trigger scan
    ev_fourth = {"action": "connect", "src_ip": ip, "raw_src_ip": "172.28.0.108", "dst_port": 5901, "zone": "deception", "ts": "2026-10-31T10:00:02Z"}
    scan_ev = scan_event(ev_fourth)
    assert scan_ev is not None
    assert scan_ev["action"] == "scan"
    assert scan_ev["sensor"] == "scan-detector"
    assert "ports:[2323, 3390, 4445, 5901]" in scan_ev["flags"][0]
