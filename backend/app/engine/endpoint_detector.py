import datetime as dt
import uuid
from typing import Any
from sqlalchemy import select, func

from ..db import (
    SessionLocal,
    EndpointAgentRow,
    EndpointSecurityEventRow,
    IncidentRow,
    EventRow,
    IncidentEventRow,
    ActionRow,
    AttackTechniqueRow,
)

# Correlation Window: 10 minutes
CORRELATION_WINDOW_MINUTES = 10

def correlate_endpoint_events(db, agent: EndpointAgentRow, new_events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Correlates newly ingested endpoint security events against:
    1. Historical host activity (brute-force threshold, account creation, privilege escalation).
    2. Honeypot deception telemetry (cross-referencing source IPs against Cowrie SSH, Web Portal, OpenCanary).
    Produces explainable security alerts and feeds into the MIRAGE Incident Command Center.
    """
    alerts_produced: list[dict[str, Any]] = []
    now = dt.datetime.now(dt.timezone.utc)
    cutoff = (now - dt.timedelta(minutes=CORRELATION_WINDOW_MINUTES)).isoformat()

    # Query recent events for this specific agent
    recent_agent_events = db.execute(
        select(EndpointSecurityEventRow)
        .where(
            EndpointSecurityEventRow.agent_id == agent.id,
            EndpointSecurityEventRow.timestamp >= cutoff
        )
        .order_by(EndpointSecurityEventRow.timestamp.desc())
    ).scalars().all()

    # Rule 1: Brute-Force Authentication Surge (Windows Event 4625 or Linux ssh_login_failed)
    failed_logons = [
        e for e in recent_agent_events
        if e.event_type in ("windows_logon_failure", "ssh_login_failed", "linux_auth_failure")
    ]
    if len(failed_logons) >= 3:
        src_ip = failed_logons[0].source_ip or "192.168.1.100"
        alert = _create_or_escalate_incident(
            db=db,
            agent=agent,
            title=f"Host Brute-Force Attack on {agent.hostname}",
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
                f"Source address: {src_ip}."
            ),
            score=75 if len(failed_logons) < 10 else 90,
            factors=[
                {"label": "Host logon failure surge (>= 3 attempts)", "points": 35},
                {"label": "Direct endpoint OS target", "points": 25},
                {"label": "Rapid credential spray cadence", "points": 15},
            ]
        )
        alerts_produced.append(alert)

    # Rule 2: Suspicious Account Creation (Windows Event 4720 or Linux useradd)
    account_created_events = [
        e for e in recent_agent_events
        if e.event_type in ("windows_account_created", "linux_account_created")
    ]
    if account_created_events:
        evt = account_created_events[0]
        alert = _create_or_escalate_incident(
            db=db,
            agent=agent,
            title=f"Unauthorized Account Creation on {agent.hostname}",
            severity="critical",
            stage="persistence",
            src_ip=evt.source_ip or "127.0.0.1",
            techniques=[
                {"id": "T1136.001", "name": "Local Account Creation", "tactic": "Persistence"},
                {"id": "T1078", "name": "Valid Accounts", "tactic": "Defense Evasion"},
            ],
            narrative=(
                f"Suspicious account creation detected on endpoint {agent.hostname}. "
                f"Event: {evt.message}."
            ),
            score=88,
            factors=[
                {"label": "Local user account creation without change ticket", "points": 45},
                {"label": "Persistence vector on monitored host", "points": 30},
                {"label": "Elevated administrator impact", "points": 13},
            ]
        )
        alerts_produced.append(alert)

    # Rule 3: Honeypot-to-Endpoint Cross-Correlation (Pivot Detection)
    # Check if any incoming endpoint event's source_ip matches an IP trapped in a honeypot decoy!
    for e in new_events:
        ip = e.get("source_ip") or e.get("sourceIp")
        if ip and ip not in ("127.0.0.1", "0.0.0.0", None):
            ip_str = str(ip)
            # Query if this IP touched deception honeypots
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

    # Sync recommended actions
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
                params={"agent_id": agent.id, "hostname": agent.hostname},
                result=act["description"]
            ))

    db.commit()
    return incident_dict
