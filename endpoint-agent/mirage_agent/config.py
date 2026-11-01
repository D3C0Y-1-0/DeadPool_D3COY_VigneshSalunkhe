import json
import os
import socket
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse


@dataclass(frozen=True)
class AgentConfig:
    backend_url: str
    credential: str
    queue_path: Path
    poll_interval_seconds: int = 2
    heartbeat_interval_seconds: int = 60
    batch_size: int = 100
    request_timeout_seconds: int = 15

    @classmethod
    def from_file(cls, path: str | Path) -> "AgentConfig":
        config_path = Path(path)
        with config_path.open("r", encoding="utf-8") as config_file:
            data = json.load(config_file)
        if not isinstance(data, dict):
            raise ValueError("Agent config must be a JSON object")

        backend_url = str(data.get("backend_url") or data.get("server_url") or "").strip().rstrip("/")
        credential = os.environ.get(
            "MIRAGE_AGENT_CREDENTIAL",
            str(data.get("credential") or data.get("token") or ""),
        ).strip()
        queue_path = Path(data.get("queue_path", "mirage-agent.sqlite")).expanduser()

        config = cls(
            backend_url=backend_url,
            credential=credential,
            queue_path=queue_path,
            poll_interval_seconds=_positive_int(data, "poll_interval_seconds", 2),
            heartbeat_interval_seconds=_positive_int(data, "heartbeat_interval_seconds", 60),
            batch_size=_positive_int(data, "batch_size", 100),
            request_timeout_seconds=_positive_int(data, "request_timeout_seconds", 15),
        )
        config.validate()
        return config

    def validate(self) -> None:
        parsed = urlparse(self.backend_url)
        if parsed.scheme not in {"https", "http"} or not parsed.hostname:
            raise ValueError("backend_url must be an absolute URL")
        if parsed.scheme != "https" and not _is_loopback(parsed.hostname):
            raise ValueError("Non-loopback endpoint connections require HTTPS")
        if len(self.credential) < 32:
            raise ValueError("credential must contain at least 32 characters")
        if self.batch_size > 100:
            raise ValueError("batch_size cannot exceed the API limit of 100")


def _positive_int(data: dict, key: str, default: int) -> int:
    value = data.get(key, default)
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise ValueError(f"{key} must be a positive integer")
    return value


def _is_loopback(hostname: str) -> bool:
    if hostname.lower() in ("localhost", "127.0.0.1", "::1"):
        return True
    try:
        return socket.gethostbyname(hostname).startswith("127.")
    except OSError:
        return False
