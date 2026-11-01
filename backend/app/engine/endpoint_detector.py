import datetime as dt
import uuid
from typing import Any
from sqlalchemy import select, func, or_

from ..db import (
    SessionLocal,
    EndpointAgentRow,
    EndpointSecurityEventRow,
    IncidentRow,
    EventRow,
    IncidentEventRow,
    ActionRow,
    AuditLogRow,
)

# Correlation Window: 15 minutes
CORRELATION_WINDOW_MINUTES = 15

SUSPICIOUS_CMD_PATTERNS = [
    "whoami /priv",
    "net user",
    "powershell -enc",
    "powershell -encodedcommand",
    "vssadmin delete shadows",
    "mimikatz",
    "certutil -urlcache",
    "curl | bash",
    "curl | sh",
    "nc -e",
    "ncat -e",
    "/bin/bash -i",
    "chmod +x /tmp",
    "cat /etc/shadow",
    "sudoers",
]


def correlate_endpoint_events(db, agent: EndpointAgentRow, new_events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Real-Time Endpoint Behavioral Correlation Engine:
    Correlates newly ingested endpoint telemetry against:
    1. Brute-force & credential spray bursts.
    2. Unauthorized local account creation & persistence.
    3. Privilege escalation & administrative token abuse.
    4. Defense evasion & security protection disablement (Defender/Logs).
    5. Suspicious process executions & command patterns.
    6. Cross-network honeypot deception pivots (Lateral Movement).
    """
    alerts_produced: list[dict[str, Any]] = []
    now = dt.datetime.now(dt.timezone.utc)
    cutoff = (now - dt.timedelta(minutes=CORRELATION_WINDOW_MINUTES)).isoformat()

    # Query recent events for this specific host
    recent_agent_events = db.execute(
        select(EndpointSecurityEventRow)
        .where(
            EndpointSecurityEventRow.agent_id == agent.id,
            EndpointSecurityEventRow.timestamp >= cutoff
        )
        .order_by(EndpointSecurityEventRow.timestamp.desc())
    ).scalars().all()

    # ── Rule 1: Brute-Force Authentication Surge ──────────────────────
    failed_logons = [
        e for e in recent_agent_events
        if e.event_type in ("windows_logon_failure", "ssh_login_failed", "linux_auth_failure")
    ]
    if len(failed_logons) >= 3:
        src_ip = failed_logons[0].source_ip or "192.168.1.100"
        alert = _create_or_escalate_incident(
            db=db,
            agent=agent,
            title=f"Host Brute-Force Spray on {agent.hostname}",
            severity="high" if len(failed_logons) < 10 else "critical",
            stage="credential_attack",
            src_ip=src_ip,
            techniques=[
                {"id": "T1110.001", "name": "Password Guessing", "tactic": "Credential Access"},
                {"id": "T1078.001", "name": "Default Accounts", "tactic": "Initial Access"},
            ],
            narrative=(
                f"Adversary triggered {len(failed_logons)} failed logon attempts on endpoint {agent.hostname} "
                f"({agent.operating_system} {agent.os_version}) within {CORRELATION_WINDOW_MINUTES} minutes. "
                f"Originating Source IP: {src_ip}."
            ),
            score=75 if len(failed_logons) < 10 else 90,
            factors=[
                {"label": f"Host logon failure surge ({len(failed_logons)} attempts in {CORRELATION_WINDOW_MINUTES}m)", "points": 35},
                {"label": "Direct endpoint OS target", "points": 25},
                {"label": "Rapid credential spray cadence", "points": 15},
            ]
        )
        alerts_produced.append(alert)

    # ── Rule 2: Suspicious Account Creation & Persistence ─────────────
    account_created_events = [
        e for e in recent_agent_events
        if e.event_type in ("windows_account_created", "linux_account_created")
    ]
    if account_created_events:
        evt = account_created_events[0]
        alert = _create_or_escalate_incident(
            db=db,
            agent=agent,
            title=f"Unauthorized Backdoor Account Created on {agent.hostname}",
            severity="critical",
            stage="persistence",
            src_ip=evt.source_ip or "127.0.0.1",
            techniques=[
                {"id": "T1136.001", "name": "Local Account Creation", "tactic": "Persistence"},
                {"id": "T1078", "name": "Valid Accounts", "tactic": "Defense Evasion"},
            ],
            narrative=(
                f"Unauthorized local account creation detected on endpoint {agent.hostname}. "
                f"Telemetry payload: {evt.message}."
            ),
            score=88,
            factors=[
                {"label": "Local user account created outside scheduled window", "points": 45},
                {"label": "High-risk persistence vector on monitored host", "points": 30},
                {"label": "Elevated administrator impact", "points": 13},
            ]
        )
        alerts_produced.append(alert)

    # ── Rule 3: Privilege Escalation & Special Token Abuse ───────────
    priv_events = [
        e for e in recent_agent_events
        if e.event_type in ("windows_special_privileges", "windows_explicit_credentials", "linux_sudo_abuse")
    ]
    if priv_events:
        pevt = priv_events[0]
        alert = _create_or_escalate_incident(
            db=db,
            agent=agent,
            title=f"Privilege Escalation & Token Abuse on {agent.hostname}",
            severity="high",
            stage="privilege_escalation",
            src_ip=pevt.source_ip or "127.0.0.1",
            techniques=[
                {"id": "T1078.003", "name": "Local Accounts", "tactic": "Privilege Escalation"},
                {"id": "T1548", "name": "Abuse Elevation Control Mechanism", "tactic": "Privilege Escalation"},
            ],
            narrative=(
                f"Special administrative privileges or explicit credentials assigned on endpoint {agent.hostname}. "
                f"Detail: {pevt.message}."
            ),
            score=84,
            factors=[
                {"label": "Administrative privilege assignment detected", "points": 35},
                {"label": "Potential elevation from unprivileged context", "points": 25},
                {"label": "Critical system security token abuse", "points": 24},
            ]
        )
        alerts_produced.append(alert)

    # ── Rule 4: Defense Evasion & Security Protection Tampering ────────
    tamper_events = [
        e for e in recent_agent_events
        if e.event_type in ("defender_protection_disabled", "windows_log_cleared", "defender_malware_detected")
    ]
    if tamper_events:
        tevt = tamper_events[0]
        alert = _create_or_escalate_incident(
            db=db,
            agent=agent,
            title=f"Host Defense Tampering / Security Evasion on {agent.hostname}",
            severity="critical",
            stage="defense_evasion",
            src_ip=tevt.source_ip or "127.0.0.1",
            techniques=[
                {"id": "T1562.001", "name": "Disable or Modify Tools", "tactic": "Defense Evasion"},
                {"id": "T1070", "name": "Indicator Removal on Host", "tactic": "Defense Evasion"},
            ],
            narrative=(
                f"CRITICAL DEFENSE TAMPERING: Anti-malware or security auditing tampered with on {agent.hostname}. "
                f"Event: {tevt.message}."
            ),
            score=95,
            factors=[
                {"label": "Endpoint real-time security protection disabled or log cleared", "points": 50},
                {"label": "Host defense evasion behavior confirmed", "points": 30},
                {"label": "Active adversary evasion indicator", "points": 15},
            ]
        )
        alerts_produced.append(alert)

    # ── Rule 5: Suspicious Process & Command-Line Execution ───────────
    suspicious_procs = []
    for e in recent_agent_events:
        if e.event_type in ("windows_process_created", "process_created"):
            msg_lower = (e.message or "").lower()
            if any(pat in msg_lower for pat in SUSPICIOUS_CMD_PATTERNS):
                suspicious_procs.append(e)

    if suspicious_procs:
        spevt = suspicious_procs[0]
        alert = _create_or_escalate_incident(
            db=db,
            agent=agent,
            title=f"Hostile Process / Living-off-the-Land Command on {agent.hostname}",
            severity="high",
            stage="execution",
            src_ip=spevt.source_ip or "127.0.0.1",
            techniques=[
                {"id": "T1059.001", "name": "PowerShell", "tactic": "Execution"},
                {"id": "T1087", "name": "Account Discovery", "tactic": "Discovery"},
            ],
            narrative=(
                f"Suspicious command execution flagged on {agent.hostname}. "
                f"Command: {spevt.message}."
            ),
            score=82,
            factors=[
                {"label": "Anomalous command execution pattern detected", "points": 40},
                {"label": "Living-off-the-Land binary invocation", "points": 25},
                {"label": "Endpoint process anomaly signature", "points": 17},
            ]
        )
        alerts_produced.append(alert)

    # ── Rule 6: Honeypot-to-Endpoint Cross-Correlation (Pivot Detection) ─
    for e in new_events:
        ip = e.get("source_ip") or e.get("sourceIp")
        if ip and str(ip) not in ("127.0.0.1", "0.0.0.0", "None"):
            ip_str = str(ip)
            honeypot_hit = db.execute(
                select(EventRow)
                .where(EventRow.src_ip == ip_str, EventRow.zone == "deception")
                .limit(1)
            ).scalar_one_or_none()

            if honeypot_hit:
                alert = _create_or_escalate_incident(
                    db=db,
                    agent=agent,
                    title=f"CRITICAL PIVOT: Honeypot Attacker {ip_str} Targeting {agent.hostname}",
                    severity="critical",
                    stage="lateral_movement",
                    src_ip=ip_str,
                    techniques=[
                        {"id": "T1021", "name": "Remote Services", "tactic": "Lateral Movement"},
                        {"id": "T1110", "name": "Brute Force", "tactic": "Credential Access"},
                    ],
                    narrative=(
                        f"HIGH-CONFIDENCE DECEPTION CORRELATION: Attacker IP {ip_str} was captured probing "
                        f"deception honeypot {honeypot_hit.sensor} ({honeypot_hit.dst_service}:{honeypot_hit.dst_port}) "
                        f"and has now attempted an intrusion on real authorized endpoint {agent.hostname}!"
                    ),
                    score=98,
                    real_asset_touched=True,
                    honeytoken_hit=True,
                    factors=[
                        {"label": "Honeypot Decoy Trap touch confirmed", "points": 30},
                        {"label": "Real remote employee endpoint touched", "points": 25},
                        {"label": "Cross-network lateral movement attempt", "points": 25},
                        {"label": "Targeted APT profile correlation", "points": 18},
                    ]
                )
                alerts_produced.append(alert)
                break

    return alerts_produced


def analyze_fleet_behavior(db) -> list[dict[str, Any]]:
    """
    Fleet-Wide Endpoint Behavioral Analysis Engine:
    Computes real-time behavioral profiles, anomaly scores, and SOAR response readiness
    for every connected host in the organization.
    """
    agents = db.execute(
        select(EndpointAgentRow)
        .order_by(EndpointAgentRow.registered_at.desc())
    ).scalars().all()

    now = dt.datetime.now(dt.timezone.utc)
    cutoff = (now - dt.timedelta(hours=24)).isoformat()
    profiles: list[dict[str, Any]] = []

    for ag in agents:
        # Query recent events for this host
        events = db.execute(
            select(EndpointSecurityEventRow)
            .where(
                EndpointSecurityEventRow.agent_id == ag.id,
                EndpointSecurityEventRow.timestamp >= cutoff
            )
            .order_by(EndpointSecurityEventRow.timestamp.desc())
        ).scalars().all()

        failed_logons = sum(1 for e in events if e.event_type in ("windows_logon_failure", "ssh_login_failed", "linux_auth_failure"))
        success_logons = sum(1 for e in events if e.event_type in ("windows_logon_success", "ssh_login_success"))
        privilege_events = sum(1 for e in events if e.event_type in ("windows_special_privileges", "windows_explicit_credentials", "linux_sudo_abuse"))
        persistence_events = sum(1 for e in events if e.event_type in ("windows_account_created", "linux_account_created", "windows_service_installed"))
        tampering_events = sum(1 for e in events if e.event_type in ("defender_protection_disabled", "windows_log_cleared"))
        suspicious_cmd_count = sum(
            1 for e in events
            if e.event_type in ("windows_process_created", "process_created")
            and any(pat in (e.message or "").lower() for pat in SUSPICIOUS_CMD_PATTERNS)
        )

        # Cross-reference honeypot pivots
        source_ips = {e.source_ip for e in events if e.source_ip and e.source_ip not in ("127.0.0.1", "0.0.0.0")}
        honeypot_pivots = 0
        if source_ips:
            honeypot_pivots = db.execute(
                select(func.count(EventRow.id))
                .where(EventRow.src_ip.in_(list(source_ips)), EventRow.zone == "deception")
            ).scalar() or 0

        # Calculate host risk score (0-100)
        risk_score = 10  # Baseline normal workstation activity
        if failed_logons >= 3:
            risk_score += min(45, failed_logons * 8)
        if privilege_events > 0:
            risk_score += min(25, privilege_events * 15)
        if persistence_events > 0:
            risk_score += min(35, persistence_events * 25)
        if tampering_events > 0:
            risk_score += min(45, tampering_events * 35)
        if suspicious_cmd_count > 0:
            risk_score += min(30, suspicious_cmd_count * 15)
        if honeypot_pivots > 0:
            risk_score += 45

        risk_score = min(100, risk_score)

        # Threat State Classification
        if risk_score >= 75:
            threat_state = "CRITICAL_COMPROMISE"
            threat_label = "Host Compromise / Active Intrusion"
        elif risk_score >= 40:
            threat_state = "ELEVATED_ANOMALY"
            threat_label = "Elevated Behavioral Anomaly"
        else:
            threat_state = "NORMAL_CLEAN"
            threat_label = "Normal Behavioral Baseline"

        # Cadence profiling
        cadence = "idle"
        if len(events) >= 10:
            cadence = "burst_spray" if failed_logons > 5 else "human_interactive"
        elif len(events) > 0:
            cadence = "low_volume"

        # Look up active incident for this endpoint
        iid = f"INC-ENDPOINT-{ag.hostname}"
        inc = db.get(IncidentRow, iid)

        # Fetch associated actions
        actions = []
        if inc:
            act_rows = db.execute(
                select(ActionRow).where(ActionRow.incident_id == iid)
            ).scalars().all()
            actions = [
                {
                    "id": a.id,
                    "type": a.type,
                    "target": a.target,
                    "status": a.status,
                    "result": a.result,
                }
                for a in act_rows
            ]

        profiles.append({
            "agentId": ag.id,
            "hostname": ag.hostname,
            "operatingSystem": ag.operating_system,
            "osVersion": ag.os_version,
            "agentVersion": ag.agent_version,
            "status": ag.status,
            "lastSeen": ag.last_heartbeat or ag.last_event_at or ag.registered_at,
            "riskScore": risk_score,
            "threatState": threat_state,
            "threatLabel": threat_label,
            "cadence": cadence,
            "metrics": {
                "totalEvents": len(events),
                "failedLogons": failed_logons,
                "successLogons": success_logons,
                "privilegeEvents": privilege_events,
                "persistenceEvents": persistence_events,
                "tamperingEvents": tampering_events,
                "suspiciousCommands": suspicious_cmd_count,
                "honeypotPivots": honeypot_pivots,
            },
            "incidentId": iid if inc else None,
            "incidentSeverity": inc.severity if inc else None,
            "actions": actions,
        })

    return profiles


def _create_or_escalate_incident(
    db,
    agent: EndpointAgentRow,
    title: str,
    severity: str,
    stage: str,
    src_ip: str,
    techniques: list[dict[str, str]],
    narrative: str,
    score: int,
    factors: list[dict[str, Any]],
    real_asset_touched: bool = False,
    honeytoken_hit: bool = False,
) -> dict[str, Any]:
    iid = f"INC-ENDPOINT-{agent.hostname}"
    now_iso = dt.datetime.now(dt.timezone.utc).isoformat()
    row = db.get(IncidentRow, iid)

    incident_dict = {
        "id": iid,
        "incident_key": iid,
        "src_ip": src_ip,
        "first_seen": row.first_seen if row else now_iso,
        "last_seen": now_iso,
        "score": score,
        "severity": severity,
        "verdict": "targeted",
        "stage": stage,
        "status": row.status if row else "open",
        "country": "Remote Endpoint",
        "asn": f"Host: {agent.hostname} ({agent.operating_system})",
        "narrative": narrative,
        "techniques": techniques,
        "factors": factors,
        "real_asset_touched": real_asset_touched,
        "honeytoken_hit": honeytoken_hit,
        "actions": [
            {
                "id": "quarantine_endpoint_src",
                "type": "block_source",
                "target": src_ip,
                "status": "recommended",
                "description": f"Enforce perimeter firewall block for hostile IP {src_ip}"
            },
            {
                "id": "isolate_endpoint_host",
                "type": "isolate_host",
                "target": agent.hostname,
                "status": "recommended",
                "description": f"Isolate endpoint {agent.hostname} from corporate subnets pending EDR triage"
            },
            {
                "id": "rotate_endpoint_credentials",
                "type": "rotate_credentials",
                "target": agent.hostname,
                "status": "recommended",
                "description": f"Force credential rotation for compromised accounts on {agent.hostname}"
            }
        ],
        "timeline": [
            {"ts": now_iso, "summary": f"{title} on {agent.hostname}", "stage": stage}
        ]
    }

    if not row:
        row = IncidentRow(
            id=iid,
            incident_key=iid,
            src_ip=src_ip,
            first_seen=now_iso,
            last_seen=now_iso,
            title=title,
            description=narrative,
            score=score,
            risk_score=score,
            severity=severity,
            verdict="targeted",
            stage=stage,
            status="open",
            real_asset_touched=real_asset_touched,
            honeytoken_hit=honeytoken_hit,
            event_count=1,
            body=incident_dict,
        )
        db.add(row)
    else:
        row.last_seen = now_iso
        row.title = title
        row.description = narrative
        row.score = max(row.score, score)
        row.risk_score = max(row.risk_score, score)
        row.severity = severity
        row.real_asset_touched = real_asset_touched or row.real_asset_touched
        row.honeytoken_hit = honeytoken_hit or row.honeytoken_hit
        row.event_count = (row.event_count or 0) + 1
        row.body = incident_dict

    # Sync recommended actions in ActionRow
    for act in incident_dict["actions"]:
        aid = f"{iid}-{act['id']}"
        existing_act = db.get(ActionRow, aid)
        if not existing_act:
            db.add(ActionRow(
                id=aid,
                incident_id=iid,
                type=act["type"],
                target=act["target"],
                status="recommended",
                params={"agent_id": agent.id, "hostname": agent.hostname, "ip": src_ip},
                result=act["description"]
            ))

    db.commit()
    return incident_dict
