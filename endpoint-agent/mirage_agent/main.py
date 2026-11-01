import argparse
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import platform
import signal
import threading
import time
import uuid

from . import __version__
from .client import MirageClient
from .config import AgentConfig
from .identity import device_metadata
from .queue import EventQueue

LOG = logging.getLogger("mirage_agent")


def _collector():
    if platform.system() == "Windows":
        from .collectors.windows import collect
        return collect
    if platform.system() == "Linux":
        from .collectors.linux import collect
        return collect
    raise RuntimeError(f"Unsupported operating system: {platform.system()}")


def run(config: AgentConfig, stop: threading.Event) -> None:
    queue = EventQueue(config.queue_path)
    client = MirageClient(config, queue)
    collect = _collector()
    next_heartbeat = 0.0
    LOG.info("MIRAGE agent %s started; queued events=%s", __version__, queue.pending_count())

    while not stop.is_set():
        try:
            collected = collect(queue)
            if collected:
                LOG.info("Collected %s approved security events", len(collected))
        except Exception as error:
            LOG.error("Local event collection failed; its cursor is retained: %s", error)
        try:
            delivered = client.deliver_pending()
            if delivered:
                LOG.info("MIRAGE acknowledged %s queued events", delivered)
            if time.monotonic() >= next_heartbeat:
                client.heartbeat(__version__)
                next_heartbeat = time.monotonic() + config.heartbeat_interval_seconds
        except Exception as error:
            LOG.error("Agent cycle failed; queued data will be retried: %s", error)
        stop.wait(config.poll_interval_seconds)

    LOG.info("MIRAGE agent stopped; pending events retained=%s", queue.pending_count())


def main() -> None:
    parser = argparse.ArgumentParser(description="Read-only MIRAGE endpoint monitoring agent")
    parser.add_argument("command", nargs="?", default="run", help="Optional command (run)")
    parser.add_argument("--config", default="mirage-agent.json", help="Path to protected agent config JSON")
    parser.add_argument("--server", help="MIRAGE Central API URL (e.g. https://... or http://...)")
    parser.add_argument("--token", help="Bearer authorization credential for this agent")
    parser.add_argument("--identity", action="store_true", help="Print host metadata for administrator enrollment")
    parser.add_argument("--test", action="store_true", help="Emit a test security event to verify end-to-end pipeline")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    if args.identity:
        print(json.dumps(device_metadata(), indent=2))
        return

    try:
        if args.server and args.token:
            config = AgentConfig(
                backend_url=args.server.strip().rstrip("/"),
                credential=args.token.strip(),
                queue_path=Path("mirage-agent.sqlite"),
            )
            config.validate()
        else:
            config = AgentConfig.from_file(args.config)
        _collector()
    except (OSError, ValueError, RuntimeError) as error:
        parser.error(str(error))

    if args.test:
        queue = EventQueue(config.queue_path)
        client = MirageClient(config, queue)
        now_iso = datetime.now(timezone.utc).isoformat()
        test_event = {
            "eventId": f"test-evt-{uuid.uuid4().hex[:8]}",
            "timestamp": now_iso,
            "source": "Microsoft-Windows-Security-Auditing",
            "eventType": "windows_logon_failure",
            "severity": "high",
            "message": "An account failed to log on. TargetUserName: Administrator, WorkstationName: ATTACKER-PC, FailureReason: Unknown user name or bad password.",
            "sourceIp": "198.51.100.99",
            "raw": {
                "EventID": 4625,
                "TargetUserName": "Administrator",
                "SubStatus": "0xC000006A",
                "LogonType": 3,
                "WorkstationName": "ATTACKER-PC",
                "IpAddress": "198.51.100.99",
            },
        }
        queue.enqueue(test_event)
        delivered = client.deliver_pending()
        client.heartbeat(__version__)
        print(f"[+] Successfully sent test security event to {config.backend_url} (delivered={delivered})!")
        print("[+] Check your MIRAGE SOC Dashboard at /dashboard/endpoint under 'Live Security Log Stream'!")
        return

    stop = threading.Event()
    for signum in (signal.SIGINT, signal.SIGTERM):
        signal.signal(signum, lambda _signum, _frame: stop.set())
    run(config, stop)


if __name__ == "__main__":
    main()
