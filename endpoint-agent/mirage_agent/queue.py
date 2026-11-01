import json
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator


class EventQueue:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        with self._connect() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.execute(
                """
                CREATE TABLE IF NOT EXISTS queued_events (
                    event_id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            db.execute(
                """
                CREATE TABLE IF NOT EXISTS collection_cursors (
                    source TEXT PRIMARY KEY,
                    cursor TEXT NOT NULL
                )
                """
            )

    def enqueue(self, event: dict[str, Any]) -> bool:
        event_id = event.get("eventId")
        if not isinstance(event_id, str) or not event_id:
            raise ValueError("queued events require a non-empty eventId")
        payload = json.dumps(event, separators=(",", ":"), ensure_ascii=True)
        with self._lock, self._connect() as db:
            cursor = db.execute(
                "INSERT OR IGNORE INTO queued_events (event_id, payload) VALUES (?, ?)",
                (event_id, payload),
            )
            return cursor.rowcount == 1

    def commit_collection(
        self,
        events: list[dict[str, Any]],
        cursors: dict[str, str],
    ) -> int:
        rows = []
        for event in events:
            event_id = event.get("eventId")
            if not isinstance(event_id, str) or not event_id:
                raise ValueError("queued events require a non-empty eventId")
            rows.append((
                event_id,
                json.dumps(event, separators=(",", ":"), ensure_ascii=True),
            ))
        with self._lock, self._connect() as db:
            inserted = 0
            if rows:
                before = db.total_changes
                db.executemany(
                    "INSERT OR IGNORE INTO queued_events (event_id, payload) VALUES (?, ?)",
                    rows,
                )
                inserted = db.total_changes - before
            for source, cursor in cursors.items():
                db.execute(
                    """
                    INSERT INTO collection_cursors (source, cursor) VALUES (?, ?)
                    ON CONFLICT(source) DO UPDATE SET cursor = excluded.cursor
                    """,
                    (source, cursor),
                )
            return inserted

    def batch(self, limit: int = 100) -> list[dict[str, Any]]:
        if limit < 1:
            raise ValueError("batch limit must be positive")
        with self._lock, self._connect() as db:
            rows = db.execute(
                "SELECT payload FROM queued_events ORDER BY created_at, event_id LIMIT ?",
                (limit,),
            ).fetchall()
        return [json.loads(row[0]) for row in rows]

    def acknowledge(self, event_ids: list[str]) -> int:
        if not event_ids:
            return 0
        placeholders = ",".join("?" for _ in event_ids)
        with self._lock, self._connect() as db:
            result = db.execute(
                f"DELETE FROM queued_events WHERE event_id IN ({placeholders})",
                event_ids,
            )
            return result.rowcount

    def pending_count(self) -> int:
        with self._lock, self._connect() as db:
            return db.execute("SELECT COUNT(*) FROM queued_events").fetchone()[0]

    def get_cursor(self, source: str) -> str | None:
        with self._lock, self._connect() as db:
            row = db.execute(
                "SELECT cursor FROM collection_cursors WHERE source = ?",
                (source,),
            ).fetchone()
        return row[0] if row else None

    def set_cursor(self, source: str, cursor: str) -> None:
        with self._lock, self._connect() as db:
            db.execute(
                """
                INSERT INTO collection_cursors (source, cursor) VALUES (?, ?)
                ON CONFLICT(source) DO UPDATE SET cursor = excluded.cursor
                """,
                (source, cursor),
            )

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.path, timeout=10)
        connection.execute("PRAGMA busy_timeout = 10000")
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()
