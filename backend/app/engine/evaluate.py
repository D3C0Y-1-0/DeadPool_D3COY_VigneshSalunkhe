import statistics
import datetime as dt
from collections import Counter
from typing import Optional
from .classify import TECH, ORDER

STAGE_POINTS = {
    "recon": 10,
    "credential_attack": 25,
    "initial_access": 45,
    "execution": 50,
    "discovery": 60,
    "collection": 75,
    "exfiltration": 85,
    "persistence": 85,
    "lateral_movement": 90,
    "impact": 80
}

COMMON_PW = {
    "root", "toor", "admin", "123456", "password", "admin123", "passw0rd",
    "12345", "qwerty", "test", "guest", "ubuntu"
}

def _parse_ts(s: str) -> dt.datetime:
    clean = s.replace("Z", "+00:00")
    return dt.datetime.fromisoformat(clean)

def cadence(cmd_events: list[dict]) -> tuple[str, Optional[float]]:
    if not cmd_events or len(cmd_events) < 3:
        return "unknown", None
    try:
        sessions = {}
        ungrouped = []
        for event in cmd_events:
            session_id = event.get("session_id")
            group_key = (
                event.get("sensor") or event.get("source") or "unknown",
                session_id
            )
            if session_id:
                sessions.setdefault(group_key, []).append(event)
            else:
                ungrouped.append(event)

        # Without a session ID, split each sensor's commands after a 10-minute idle gap.
        by_sensor = {}
        for event in ungrouped:
            sensor = event.get("sensor") or event.get("source") or "unknown"
            by_sensor.setdefault(sensor, []).append(event)
        for sensor, events in by_sensor.items():
            ordered = sorted(events, key=lambda e: _parse_ts(e["ts"]))
            segment = []
            previous = None
            for event in ordered:
                timestamp = _parse_ts(event["ts"])
                if previous is not None and (timestamp - previous).total_seconds() > 600:
                    sessions[(sensor, len(sessions))] = segment
                    segment = []
                segment.append(event)
                previous = timestamp
            if segment:
                sessions[(sensor, len(sessions))] = segment

        measurements = []
        for session_events in sessions.values():
            if len(session_events) < 3:
                continue
            timestamps = sorted(_parse_ts(event["ts"]) for event in session_events)
            gaps = [(b - a).total_seconds() for a, b in zip(timestamps, timestamps[1:])]
            if not gaps:
                continue
            med = statistics.median(gaps)
            mean = statistics.mean(gaps)
            cv = (statistics.pstdev(gaps) / mean) if mean > 0 else 0
            if med < 0.6:
                classification = "bot"
            elif med >= 1.5 and cv >= 0.3:
                classification = "human"
            else:
                classification = "scripted"
            measurements.append((max(timestamps), classification, round(med, 2)))

        if not measurements:
            return "unknown", None
        _, classification, med = max(measurements, key=lambda item: item[0])
        return classification, med
    except (KeyError, TypeError, ValueError):
        return "unknown", None

def summarize(e: dict) -> str:
    a = e.get("action", "")
    dst_svc = e.get("dst_service", "service")
    if a == "auth":
        u = e.get("user") or "unknown"
        p = e.get("password") or "***"
        return f"{e.get('outcome', 'unknown')} login {u}:{p} on {dst_svc}"
    if a == "command":
        return f"$ {e.get('cmd', '')}"
    if a == "download":
        f_name = (e.get("file") or {}).get("name", "file")
        return f"downloaded {f_name}"
    if a == "scan":
        flags = e.get("flags") or []
        return "port scan: " + ", ".join(flags)
    if a == "firewall":
        return f"prod firewall {e.get('outcome', 'allow')} :{e.get('dst_port', '')}"
    return f"{a} on {dst_svc}"

def narrative(ip: str, evs: list[dict], stage: str, real: bool, token: bool, verdict: str) -> str:
    parts = [f"{ip} ({verdict}) progressed to '{stage}' on the deception fabric"]
    if any(e.get("action") == "scan" for e in evs):
        parts.append("after scanning multiple decoy ports")
    if any(e.get("action") == "auth" and e.get("outcome") == "success" and e.get("zone") == "deception" for e in evs):
        parts.append("logged in using default credentials")
    if any("crown_jewel" in (e.get("flags") or []) for e in evs):
        parts.append("and accessed the decoy customer data archive")
    s = " ".join(parts) + "."
    if token:
        s += " A planted honeytoken credential was subsequently attempted against a real production asset: confirmed hostile lateral movement."
    elif real:
        s += " The same source IP was also observed probing real production assets."
    return s

def techniques_detail(ids: list[str]) -> list[dict]:
    return [
        {
            "id": i,
            "name": TECH.get(i, {}).get("name", "Unknown Technique"),
            "tactic": TECH.get(i, {}).get("tactic", "Unknown Tactic")
        }
        for i in sorted(ids)
    ]

def evaluate(src_ip: str, events: list[dict]) -> dict:
    if not events:
        return {}

    source_events = [e for e in events if e.get("src_ip") == src_ip]
    if not source_events:
        return {}

    dec = [e for e in source_events if e.get("zone") == "deception"]
    prod = [e for e in source_events if e.get("zone") == "production"]
    if not dec and not prod:
        return {}

    all_ev = sorted(dec + prod, key=lambda e: e.get("ts", ""))
    stages = [e.get("stage") for e in all_ev if e.get("stage") and e.get("stage") in ORDER]
    max_stage = max(stages, key=ORDER.index) if stages else "recon"

    techs = sorted({t for e in all_ev for t in e.get("techniques", [])})
    failed_auth = [
        e for e in dec
        if e.get("action") == "auth" and e.get("outcome") == "failure"
    ]
    distinct_failed_users = {
        e.get("user", "").strip().lower()
        for e in failed_auth
        if isinstance(e.get("user"), str) and e.get("user", "").strip()
    }
    password_spray = len(failed_auth) >= 5 and len(distinct_failed_users) >= 3
    if password_spray:
        techs = sorted(set(techs) | {"T1110.003"})
    flags = Counter(f for e in all_ev for f in e.get("flags", []))
    sensors = {e.get("sensor") for e in dec if e.get("sensor") and e.get("sensor") != "scan-detector"}
    sessions = {e.get("session_id") for e in dec if e.get("session_id")}
    cmds = [e for e in dec if e.get("action") == "command"]
    cad, med = cadence(cmds)

    passwords = [e.get("password") for e in dec if e.get("action") == "auth"]
    pw_all_common = bool(passwords) and all((p or "").lower() in COMMON_PW for p in passwords)

    real_touch = [e for e in prod if e.get("src_ip") == src_ip]
    honeytoken = (flags.get("honeytoken", 0) + flags.get("honeytoken_use", 0)) > 0
    crown = flags.get("crown_jewel", 0) > 0

    try:
        duration = (_parse_ts(all_ev[-1]["ts"]) - _parse_ts(all_ev[0]["ts"])).total_seconds()
    except Exception:
        duration = 0.0

    factors = [dict(label=f"Stage reached: {max_stage}", points=STAGE_POINTS.get(max_stage, 10))]
    if password_spray:
        factors.append(dict(
            label="Password spray pattern: >=5 failed logins across >=3 usernames",
            points=0
        ))
    tgt = 0
    noise = 0

    def add_factor(label: str, pts: int, t_weight: int = 0, n_weight: int = 0):
        nonlocal tgt, noise
        factors.append(dict(label=label, points=pts))
        tgt += t_weight
        noise += n_weight

    if cad == "human":
        add_factor("Human typing cadence", 10, t_weight=2)
    elif cad == "bot":
        add_factor("Machine-speed command cadence", -10, n_weight=2)

    if len(sensors) >= 2:
        add_factor(f"Touched {len(sensors)} different decoys", 10, t_weight=1)

    if crown:
        add_factor("Accessed crown-jewel decoy data", 10, t_weight=2)

    if real_touch:
        add_factor("Same source touched REAL asset", 25, t_weight=3)

    if honeytoken:
        add_factor("Honeytoken used / triggered", 30, t_weight=3)

    if len(sessions) >= 2 and duration > 600:
        add_factor("Returned in a later session", 5, t_weight=1)

    if pw_all_common and not cmds:
        add_factor("Only common wordlist credentials", -15, n_weight=2)

    if duration < 5 and not cmds:
        add_factor("Drive-by: <5s, no commands", -10, n_weight=1)

    raw_sum = sum(f["points"] for f in factors)
    score = max(0, min(100, raw_sum))

    if score >= 85:
        sev = "critical"
    elif score >= 60:
        sev = "high"
    elif score >= 30:
        sev = "medium"
    else:
        sev = "low"

    # Critical override rule: Honeytoken use OR real-asset touch => always critical
    if honeytoken or real_touch:
        sev = "critical"

    verdict = "targeted" if (tgt >= 3 and tgt > noise) else "opportunistic"

    # Profile credentials tried
    creds_tried = sorted({
        f"{e.get('user') or ''}:{e.get('password') or ''}"
        for e in dec if e.get("action") == "auth"
    })[:25]

    ssh_client = next(((e.get("ssh") or {}).get("client") for e in dec if (e.get("ssh") or {}).get("client")), None)
    hassh = next(((e.get("ssh") or {}).get("hassh") for e in dec if (e.get("ssh") or {}).get("hassh")), None)

    return {
        "src_ip": src_ip,
        "first_seen": all_ev[0]["ts"],
        "last_seen": all_ev[-1]["ts"],
        "duration_s": int(duration),
        "score": score,
        "severity": sev,
        "verdict": verdict,
        "stage": max_stage,
        "techniques": techniques_detail(techs),
        "factors": factors,
        "real_asset_touched": bool(real_touch),
        "honeytoken_hit": honeytoken,
        "real_asset_events": [e for e in real_touch][:20],
        "profile": {
            "cadence": cad,
            "median_gap_s": med,
            "sensors": sorted(list(sensors)),
            "sessions": len(sessions),
            "creds_tried": creds_tried,
            "ssh_client": ssh_client,
            "hassh": hassh
        },
        "timeline": [
            {
                "ts": e.get("ts"),
                "sensor": e.get("sensor"),
                "zone": e.get("zone"),
                "action": e.get("action"),
                "outcome": e.get("outcome"),
                "summary": summarize(e),
                "stage": e.get("stage"),
                "techniques": e.get("techniques", [])
            }
            for e in all_ev if e.get("action") not in ("fingerprint",)
        ],
        "transcript": [
            {"ts": e.get("ts"), "cmd": e.get("cmd")}
            for e in cmds if e.get("cmd")
        ],
        "files": [e.get("file") for e in dec if e.get("file")],
        "narrative": narrative(src_ip, all_ev, max_stage, bool(real_touch), honeytoken, verdict)
    }
