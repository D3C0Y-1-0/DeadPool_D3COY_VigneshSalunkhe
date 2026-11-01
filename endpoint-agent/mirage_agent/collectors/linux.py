import json
import logging
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol

from ..normalizer import normalize_linux_log

LOG = logging.getLogger(__name__)
AUTH_LOG_PATHS = (Path("/var/log/auth.log"), Path("/var/log/secure"))
MAX_FILE_BYTES_PER_POLL = 1024 * 1024


class CursorStore(Protocol):
    def get_cursor(self, source: str) -> str | None: ...

    def set_cursor(self, source: str, cursor: str) -> None: ...


def collect(queue: CursorStore) -> list[dict]:
    try:
        return _collect_journal(queue)
    except FileNotFoundError:
        LOG.info("journalctl not found; falling back to supported auth log files")
    except subprocess.TimeoutExpired:
        LOG.warning("journalctl collection timed out; leaving its cursor unchanged")
        return []
    return _collect_auth_files(queue)


def _collect_journal(queue: CursorStore) -> list[dict]:
    events: list[dict] = []
    cursor_updates: dict[str, str] = {}
    for facility in ("auth", "authpriv"):
        source_key = f"linux-journal-{facility}"
        previous_cursor = queue.get_cursor(source_key)
        command = ["journalctl", "--no-pager", "--output=json", f"--facility={facility}"]
        if previous_cursor:
            command.append(f"--after-cursor={previous_cursor}")
        result = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=15,
        )
        if result.returncode != 0:
            detail = result.stderr.strip().splitlines()
            LOG.warning("journalctl (%s) returned %s: %s", facility, result.returncode, detail[-1] if detail else "no detail")
            continue

        latest_cursor = previous_cursor
        for line in result.stdout.splitlines():
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                LOG.warning("Ignoring malformed journald JSON record")
                continue
            cursor = row.get("__CURSOR__")
            if cursor:
                latest_cursor = str(cursor)
            message = row.get("MESSAGE")
            timestamp = row.get("__REALTIME_TIMESTAMP")
            if not isinstance(message, str) or not timestamp:
                continue
            try:
                timestamp_iso = _journal_timestamp(str(timestamp))
            except (TypeError, ValueError, OverflowError):
                LOG.warning("Ignoring journald record with invalid timestamp")
                continue
            source = str(row.get("SYSLOG_IDENTIFIER") or row.get("_COMM") or "linux-auth")
            normalized = normalize_linux_log(source, timestamp_iso, message, cursor)
            if normalized:
                events.append(normalized)
        if latest_cursor and latest_cursor != previous_cursor:
            cursor_updates[source_key] = latest_cursor

    if events or cursor_updates:
        queue.commit_collection(events, cursor_updates)
    return events


def _journal_timestamp(value: str) -> str:
    micros = int(value)
    return datetime.fromtimestamp(micros / 1_000_000, timezone.utc).isoformat()


def _collect_auth_files(queue: CursorStore) -> list[dict]:
    events: list[dict] = []
    cursors: dict[str, str] = {}
    for path in AUTH_LOG_PATHS:
        if not path.exists():
            continue
        file_events, cursor = _collect_auth_file(queue, path)
        events.extend(file_events)
        if cursor is not None:
            cursors[f"linux-auth-file:{path}"] = cursor
    if events or cursors:
        queue.commit_collection(events, cursors)
    return events


def _collect_auth_file(queue: CursorStore, path: Path) -> tuple[list[dict], str | None]:
    source_key = f"linux-auth-file:{path}"
    saved = queue.get_cursor(source_key)
    try:
        offset = max(0, int(saved or "0"))
        with path.open("rb") as log_file:
            size = os.fstat(log_file.fileno()).st_size
            if offset > size:
                offset = 0
            log_file.seek(offset)
            content = log_file.read(MAX_FILE_BYTES_PER_POLL)
            complete_size = content.rfind(b"\n") + 1
            if complete_size <= 0:
                return [], None
            lines = content[:complete_size].decode("utf-8", errors="replace").splitlines()
            next_offset = offset + complete_size
    except PermissionError:
        LOG.warning("Permission denied reading approved auth log %s", path)
        return [], None
    except OSError as error:
        LOG.warning("Could not read auth log %s: %s", path, error)
        return [], None

    events: list[dict] = []
    for index, line in enumerate(lines):
        parsed = _parse_syslog_line(line, path.name)
        if parsed is None:
            continue
        timestamp, message = parsed
        source_match = re.match(r"^([A-Za-z0-9_.-]+)(?:\[\d+\])?:", message)
        source = source_match.group(1) if source_match else path.name
        normalized = normalize_linux_log(
            source,
            timestamp,
            message,
            f"{next_offset}:{index}",
        )
        if normalized:
            events.append(normalized)

    return events, str(next_offset)


def _parse_syslog_line(line: str, source: str) -> tuple[str, str] | None:
    parts = line.split(maxsplit=4)
    if len(parts) < 5:
        return None
    timestamp = " ".join(parts[:3])
    message = parts[4]
    try:
        parsed = datetime.strptime(timestamp, "%b %d %H:%M:%S")
        current = datetime.now(timezone.utc)
        parsed = parsed.replace(year=current.year, tzinfo=timezone.utc)
        return parsed.isoformat(), message
    except ValueError:
        LOG.debug("Skipping malformed %s record", source)
        return None
