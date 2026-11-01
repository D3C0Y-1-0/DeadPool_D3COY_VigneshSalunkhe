import json
import logging
import ssl
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .config import AgentConfig
from .queue import EventQueue

LOG = logging.getLogger(__name__)


class MirageClient:
    def __init__(self, config: AgentConfig, queue: EventQueue):
        config.validate()
        self.config = config
        self.queue = queue
        self._ssl_context = ssl.create_default_context()

    def heartbeat(self, agent_version: str) -> None:
        self._request(
            "/api/agents/heartbeat",
            {"agentVersion": agent_version},
        )

    def deliver_pending(self) -> int:
        acknowledged = 0
        while True:
            batch = self.queue.batch(self.config.batch_size)
            if not batch:
                return acknowledged
            response = self._request("/api/agents/events", {"events": batch})
            if (
                response.get("ok") is not True
                or response.get("received") != len(batch)
            ):
                raise RuntimeError("Backend did not acknowledge the complete event batch")
            acknowledged += self.queue.acknowledge([event["eventId"] for event in batch])

    def _request(self, path: str, payload: dict) -> dict:
        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
        request = Request(
            f"{self.config.backend_url}{path}",
            data=body,
            headers={
                "Authorization": f"Bearer {self.config.credential}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "mirage-agent/1.0",
                "ngrok-skip-browser-warning": "true",
            },
        )
        for attempt in range(1, 4):
            try:
                with urlopen(
                    request,
                    timeout=self.config.request_timeout_seconds,
                    context=self._ssl_context if request.type == "https" else None,
                ) as response:
                    return json.loads(response.read(65536).decode("utf-8"))
            except HTTPError as error:
                error_body = error.read().decode("utf-8", errors="replace")
                raise RuntimeError(f"Server returned HTTP {error.code}: {error_body}") from error
            except URLError as error:
                if attempt >= 3:
                    raise RuntimeError(f"Connection failed to {self.config.backend_url}: {error.reason}") from error
                time.sleep(attempt)
        raise RuntimeError("Request failed after retries")
