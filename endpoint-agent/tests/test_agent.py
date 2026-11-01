import json
import sys
from pathlib import Path
from urllib.error import URLError

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from mirage_agent import client as client_module
from mirage_agent.collectors import linux as linux_collector
from mirage_agent.client import MirageClient
from mirage_agent.config import AgentConfig
from mirage_agent.normalizer import normalize_linux_log, normalize_windows_event
from mirage_agent.queue import EventQueue


def test_queue_deduplicates_and_persists_cursor_atomically(tmp_path):
    queue = EventQueue(tmp_path / "queue.sqlite")
    event = {"eventId": "evt-1", "eventType": "ssh_login_failed"}

    assert queue.commit_collection([event, event], {"auth-log": "123"}) == 1
    assert queue.pending_count() == 1
    assert queue.get_cursor("auth-log") == "123"
    assert queue.batch(1) == [event]
    assert queue.acknowledge(["evt-1"]) == 1
    assert queue.pending_count() == 0


def test_windows_event_normalization_filters_and_redacts():
    event = normalize_windows_event({
        "event_id": 4625,
        "record_id": 123,
        "timestamp": "2026-11-01T01:00:00Z",
        "provider": "Microsoft-Windows-Security-Auditing",
        "computer": "workstation-01",
        "data": {
            "IpAddress": "192.0.2.15",
            "TargetUserName": "alice",
            "Password": "must-not-leak",
        },
    })

    assert event is not None
    assert event["eventType"] == "windows_logon_failure"
    assert event["severity"] == "medium"
    assert event["sourceIp"] == "192.0.2.15"
    assert event["raw"]["eventData"] == {
        "IpAddress": "192.0.2.15",
        "TargetUserName": "alice",
    }
    assert normalize_windows_event({
        "event_id": 9999,
        "record_id": 124,
        "timestamp": "2026-11-01T01:00:00Z",
    }) is None


def test_linux_auth_normalization_omits_raw_log_secrets():
    event = normalize_linux_log(
        "sshd",
        "2026-11-01T01:00:00+00:00",
        "Failed password for invalid user alice from 198.51.100.8 port 22 password=hunter2",
        "cursor-1",
    )

    assert event is not None
    assert event["eventType"] == "ssh_login_failed"
    assert event["sourceIp"] == "198.51.100.8"
    assert "alice" in event["message"]
    assert "hunter2" not in json.dumps(event)
    assert normalize_linux_log(
        "sshd",
        "2026-11-01T01:00:00+00:00",
        "debug noise without a supported security event",
        "cursor-2",
    ) is None


def test_linux_journal_queue_and_cursor_commit_in_one_batch(monkeypatch):
    class MemoryQueue:
        def __init__(self):
            self.cursors = {}
            self.events = []

        def get_cursor(self, source):
            return self.cursors.get(source)

        def commit_collection(self, events, cursors):
            self.events.extend(events)
            self.cursors.update(cursors)
            return len(events)

    record = {
        "__CURSOR__": "journal-cursor-1",
        "__REALTIME_TIMESTAMP": "1793500000000000",
        "SYSLOG_IDENTIFIER": "sshd",
        "MESSAGE": "Failed password for alice from 203.0.113.8 port 22",
    }

    facilities = []

    def fake_run(command, **_kwargs):
        from subprocess import CompletedProcess

        facility = next(arg.removeprefix("--facility=") for arg in command if arg.startswith("--facility="))
        facilities.append(facility)
        output = json.dumps(record) if facility == "auth" else ""
        return CompletedProcess(command, 0, output, "")

    monkeypatch.setattr(linux_collector.subprocess, "run", fake_run)
    queue = MemoryQueue()

    events = linux_collector._collect_journal(queue)

    assert len(events) == 1
    assert events[0]["eventType"] == "ssh_login_failed"
    assert queue.cursors["linux-journal-auth"] == "journal-cursor-1"
    assert facilities == ["auth", "authpriv"]
    assert queue.events == events


def test_agent_config_requires_https_for_remote_backend(tmp_path):
    config_file = tmp_path / "config.json"
    config_file.write_text(json.dumps({
        "backend_url": "http://192.0.2.20:8000",
        "credential": "x" * 40,
    }), encoding="utf-8")
    with pytest.raises(ValueError, match="require HTTPS"):
        AgentConfig.from_file(config_file)


def test_delivery_retries_and_only_acknowledges_after_server_ack(monkeypatch, tmp_path):
    config = AgentConfig(
        backend_url="https://mirage-vpn.example",
        credential="x" * 40,
        queue_path=tmp_path / "queue.sqlite",
        batch_size=10,
    )
    queue = EventQueue(config.queue_path)
    event = {"eventId": "evt-retry", "eventType": "ssh_login_failed"}
    queue.enqueue(event)
    attempts = 0

    class Response:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def read(self, _limit):
            return json.dumps({"ok": True, "received": 1, "inserted": 1}).encode("utf-8")

    def fake_urlopen(*_args, **_kwargs):
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            raise URLError("temporary network failure")
        return Response()

    monkeypatch.setattr(client_module, "urlopen", fake_urlopen)
    monkeypatch.setattr(client_module.time, "sleep", lambda _delay: None)
    client = MirageClient(config, queue)

    assert client.deliver_pending() == 1
    assert attempts == 3
    assert queue.pending_count() == 0
