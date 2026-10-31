import asyncio
import json
import os
import time
import re
from collections import defaultdict, deque
from .schema import NormalizedEvent
from .geo import display_ip

SENSORS = {
    "cowrie": ("db-prod-02", "deception"),
    "portal": ("customer-portal", "deception"),
    "opencanary": ("fileserv-01", "deception"),
    "tripwire": ("tripwire-01", "deception"),
    "prod": ("prod-web-01", "production")
}

CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

def _clean_str(val: str, max_len: int = 1024) -> str:
    if not val:
        return ""
    cleaned = CONTROL_CHAR_RE.sub("", str(val))
    return cleaned[:max_len]

# ---------- parsers: raw dict -> NormalizedEvent dict | None ----------

def parse_cowrie(r: dict) -> dict | None:
    eid = r.get("eventid", "")
    ip = r.get("src_ip")
    if not ip:
        return None
    disp_ip = display_ip(ip)
    ts = r.get("timestamp") or time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    session_id = _clean_str(r.get("session") or "", 64)

    base = {
        "ts": ts,
        "source": "cowrie",
        "session_id": session_id,
        "raw_src_ip": ip,
        "src_ip": disp_ip,
        "dst_service": "ssh",
        "dst_port": 2222,
        "raw": r
    }

    if eid == "cowrie.session.connect":
        return {**base, "action": "connect", "outcome": "allow"}
    if eid == "cowrie.login.failed":
        return {
            **base,
            "action": "auth",
            "outcome": "failure",
            "user": _clean_str(r.get("username") or "", 128),
            "password": _clean_str(r.get("password") or "", 128)
        }
    if eid == "cowrie.login.success":
        return {
            **base,
            "action": "auth",
            "outcome": "success",
            "user": _clean_str(r.get("username") or "", 128),
            "password": _clean_str(r.get("password") or "", 128)
        }
    if eid == "cowrie.command.input":
        return {
            **base,
            "action": "command",
            "cmd": _clean_str(r.get("input") or "", 1024),
            "outcome": "success"
        }
    if eid == "cowrie.session.file_download":
        return {
            **base,
            "action": "download",
            "file": {
                "url": _clean_str(r.get("url") or "", 256),
                "sha256": _clean_str(r.get("shasum") or "", 64),
                "name": _clean_str(r.get("outfile") or "downloaded_file", 128)
            },
            "outcome": "success"
        }
    if eid == "cowrie.session.file_upload":
        return {
            **base,
            "action": "upload",
            "file": {
                "sha256": _clean_str(r.get("shasum") or "", 64),
                "name": _clean_str(r.get("filename") or "uploaded_file", 128)
            },
            "outcome": "success"
        }
    if eid == "cowrie.client.version":
        return {
            **base,
            "action": "fingerprint",
            "ssh": {"client": _clean_str(r.get("version") or "", 128)}
        }
    if eid == "cowrie.client.kex":
        return {
            **base,
            "action": "fingerprint",
            "ssh": {"hassh": _clean_str(r.get("hassh") or "", 64)}
        }
    return None

def parse_portal(r: dict) -> dict | None:
    ip = r.get("src_ip")
    if not ip:
        return None
    disp_ip = display_ip(ip)
    ts = r.get("ts") or time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    flags = [_clean_str(f, 64) for f in r.get("flags") or []]

    base = {
        "ts": ts,
        "source": "portal",
        "raw_src_ip": ip,
        "src_ip": disp_ip,
        "dst_service": "web",
        "dst_port": 8080,
        "flags": flags,
        "raw": r
    }

    action = r.get("action")
    if action == "login":
        return {
            **base,
            "action": "auth",
            "outcome": r.get("outcome", "failure"),
            "user": _clean_str(r.get("user") or "", 128),
            "password": _clean_str(r.get("password") or "", 128)
        }
    if action == "download":
        f = r.get("file") or {}
        return {
            **base,
            "action": "download",
            "file": {
                "name": _clean_str(f.get("name") or "customer_data_2026.csv", 128),
                "size": int(f.get("size") or 0),
                "sha256": _clean_str(f.get("sha256") or "", 64)
            },
            "honeytoken_id": _clean_str(r.get("honeytoken_id") or "HT-CUST-001", 64),
            "outcome": "success"
        }
    return {
        **base,
        "action": "web_request",
        "cmd": _clean_str(r.get("path") or "/", 256),
        "outcome": "allow" if r.get("status", 200) < 400 else "drop"
    }

def parse_opencanary(r: dict) -> dict | None:
    ip = r.get("src_host")
    lt = r.get("logtype")
    if not ip or not lt:
        return None

    svc_map = {8001: ("mysql", 3306), 2000: ("ftp", 21)}
    svc_info = svc_map.get(lt)
    if not svc_info:
        return None
    svc_name, default_port = svc_info

    d = r.get("logdata") or {}
    ts = r.get("utc_time", "")
    if ts:
        ts = ts.replace(" ", "T") + "Z" if not ts.endswith("Z") else ts
    else:
        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    disp_ip = display_ip(ip)
    return {
        "ts": ts,
        "source": "opencanary",
        "raw_src_ip": ip,
        "src_ip": disp_ip,
        "dst_service": svc_name,
        "dst_port": r.get("dst_port") or default_port,
        "action": "auth",
        "outcome": "failure",
        "user": _clean_str(d.get("USERNAME") or "", 128),
        "password": _clean_str(d.get("PASSWORD") or "", 128),
        "raw": r
    }

def parse_tripwire(r: dict) -> dict | None:
    ip = r.get("src_ip")
    if not ip:
        return None
    disp_ip = display_ip(ip)
    ts = r.get("ts") or time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())

    return {
        "ts": ts,
        "source": "tripwire",
        "raw_src_ip": ip,
        "src_ip": disp_ip,
        "dst_service": r.get("service") or "tripwire",
        "dst_port": r.get("dst_port"),
        "action": "connect",
        "outcome": "allow",
        "raw": r
    }

def parse_prod(r: dict) -> dict | None:
    ip = r.get("src_ip")
    if not ip:
        return None
    disp_ip = display_ip(ip)
    ts = r.get("ts") or time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())

    base = {
        "ts": ts,
        "source": "prod",
        "raw_src_ip": ip,
        "src_ip": disp_ip,
        "raw": r
    }

    ev_type = r.get("type")
    if ev_type == "firewall":
        return {
            **base,
            "dst_service": "prod-fw",
            "dst_port": r.get("dst_port"),
            "action": "firewall",
            "outcome": r.get("action", "allow")
        }
    if ev_type == "auth":
        flags = ["honeytoken_use"] if r.get("honeytoken") else []
        return {
            **base,
            "dst_service": "prod-ssh",
            "dst_port": 22,
            "action": "auth",
            "outcome": r.get("outcome", "failure"),
            "user": _clean_str(r.get("user") or "", 128),
            "flags": flags
        }
    return None

PARSERS = {
    "cowrie": (os.environ.get("COWRIE_LOG_PATH", "/in/cowrie/cowrie.json"), parse_cowrie),
    "portal": (os.environ.get("PORTAL_LOG_PATH", "/in/portal/portal.json"), parse_portal),
    "opencanary": (os.environ.get("CANARY_LOG_PATH", "/in/canary/opencanary.log"), parse_opencanary),
    "tripwire": (os.environ.get("TRIPWIRE_LOG_PATH", "/in/tripwire/tripwire.json"), parse_tripwire),
    "prod": (os.environ.get("PROD_LOG_PATH", "/in/prod/prod.json"), parse_prod)
}

# ---------- scan detector: >=4 distinct dst ports in 10s from one IP ----------
_recent_connections = defaultdict(lambda: deque(maxlen=50))
_scan_flagged = {}

def reset_scan_detector():
    _recent_connections.clear()
    _scan_flagged.clear()

def scan_event(ev: dict) -> dict | None:
    act = ev.get("action")
    zone = ev.get("zone")
    if act != "connect" and not (act == "firewall" and zone == "deception"):
        return None

    src_ip = ev.get("src_ip")
    dst_port = ev.get("dst_port")
    if not src_ip or not dst_port:
        return None

    now = time.time()
    q = _recent_connections[src_ip]
    q.append((now, dst_port))

    # Keep only connections within the last 10 seconds
    ports = {p for t, p in q if (now - t) <= 10 and p is not None}
    last_flagged = _scan_flagged.get(src_ip, 0)

    if len(ports) >= 4 and (now - last_flagged) > 300:
        _scan_flagged[src_ip] = now
        port_list = sorted(list(ports))
        return {
            "ts": ev.get("ts"),
            "source": "tripwire",
            "sensor": "scan-detector",
            "zone": "deception",
            "raw_src_ip": ev.get("raw_src_ip", src_ip),
            "src_ip": src_ip,
            "dst_service": "multi",
            "action": "scan",
            "outcome": "success",
            "flags": [f"ports:{port_list}"],
            "raw": {}
        }
    return None

# ---------- tailer with offsets and partial-line safety ----------
async def tail(name: str, path: str, parser_func, on_event_cb):
    pos = 0
    buf = ""
    while True:
        try:
            if os.path.exists(path):
                file_size = os.path.getsize(path)
                if file_size < pos:
                    # File was truncated/rotated
                    pos = 0
                    buf = ""

                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    f.seek(pos)
                    chunk = f.read()
                    pos = f.tell()

                if chunk:
                    buf += chunk
                    *lines, buf = buf.split("\n")
                    for line in lines:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            raw_rec = json.loads(line)
                        except json.JSONDecodeError:
                            continue

                        parsed = parser_func(raw_rec)
                        if not parsed:
                            continue

                        sensor_name, zone = SENSORS.get(name, ("generic", "deception"))
                        parsed["sensor"] = sensor_name
                        parsed["zone"] = zone

                        norm = NormalizedEvent(**parsed)
                        await on_event_cb(norm.model_dump())

                        s_ev = scan_event(parsed)
                        if s_ev:
                            norm_scan = NormalizedEvent(**s_ev)
                            await on_event_cb(norm_scan.model_dump())
        except Exception as e:
            # Keep tailer resilient
            pass
        await asyncio.sleep(0.4)

async def start(on_event_cb):
    for name, (path, parser_func) in PARSERS.items():
        asyncio.create_task(tail(name, path, parser_func, on_event_cb))
