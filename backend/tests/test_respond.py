import os
import tempfile
import pytest
from app.engine.respond import recommend, execute, ALLOWLIST
from app.engine.stix import bundle, csv_iocs

def test_recommendations():
    inc_crit = {
        "src_ip": "203.0.113.50",
        "severity": "critical",
        "real_asset_touched": True,
        "honeytoken_hit": True
    }
    actions = recommend(inc_crit)
    types = [a["type"] for a in actions]
    assert "block_source" in types
    assert "isolate_host" in types
    assert "hunt" in types
    assert "rotate_credentials" in types
    assert "export_iocs" in types

    inc_low = {
        "src_ip": "198.51.100.2",
        "severity": "low",
        "real_asset_touched": False,
        "honeytoken_hit": False
    }
    actions_low = recommend(inc_low)
    types_low = [a["type"] for a in actions_low]
    assert "monitor" in types_low
    assert "block_source" not in types_low

def test_execute_block_and_dryrun():
    with tempfile.NamedTemporaryFile("w+", delete=False) as f:
        tmp_blocklist = f.name

    try:
        act = {
            "type": "block_source",
            "params": {"ip": "203.0.113.50", "raw_ips": ["172.28.0.50", "172.29.0.50"]}
        }

        # 1. Dry run
        dry_res = execute(act, dry_run=True, blocklist_path=tmp_blocklist)
        assert "DRY-RUN:" in dry_res
        assert os.path.getsize(tmp_blocklist) == 0

        # 2. Approved execution
        exec_res = execute(act, dry_run=False, blocklist_path=tmp_blocklist)
        assert "Blocklist updated" in exec_res
        with open(tmp_blocklist, "r") as f:
            lines = {line.strip() for line in f if line.strip()}
        assert "172.28.0.50" in lines
        assert "172.29.0.50" in lines
        assert "203.0.113.50" in lines

        # 3. Idempotent check
        execute(act, dry_run=False, blocklist_path=tmp_blocklist)
        with open(tmp_blocklist, "r") as f:
            lines_after = [line.strip() for line in f if line.strip()]
        # No duplicates
        assert len(lines_after) == len(lines)
    finally:
        if os.path.exists(tmp_blocklist):
            os.remove(tmp_blocklist)

def test_invalid_ip_rejection():
    act_bad = {"type": "block_source", "params": {"ip": "1.2.3.4; rm -rf /"}}
    with pytest.raises(ValueError):
        execute(act_bad, dry_run=True)

def test_allowlist_protection():
    ALLOWLIST.add("10.0.0.0/8")
    try:
        act = {"type": "block_source", "params": {"ip": "10.0.1.5"}}
        with pytest.raises(PermissionError):
            execute(act, dry_run=False)
    finally:
        ALLOWLIST.clear()

def test_stix_bundle_and_csv():
    inc = {
        "src_ip": "203.0.113.50",
        "narrative": "Hostile adversary pivoted to prod",
        "files": [{"name": "customer_data_2026.csv", "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}],
        "techniques": [{"id": "T1046", "name": "Network Service Discovery", "tactic": "Discovery"}]
    }
    b = bundle(inc)
    assert b["type"] == "bundle"
    assert len(b["objects"]) >= 3
    types = [o["type"] for o in b["objects"]]
    assert "indicator" in types
    assert "attack-pattern" in types

    csv_data = csv_iocs(inc)
    assert "203.0.113.50" in csv_data
    assert "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" in csv_data
