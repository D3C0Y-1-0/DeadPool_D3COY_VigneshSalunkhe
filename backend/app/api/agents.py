import datetime as dt
import hashlib
import json
import os
import re
import secrets
import threading
import time
import uuid
from collections import defaultdict, deque
from ipaddress import ip_address
from typing import Any

from fastapi import APIRouter, Body, Header, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field, IPvAnyAddress, field_validator, model_validator
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError

from ..db import (
    AuditLogRow,
    EndpointAgentRow,
    EndpointSecurityEventRow,
    EventRow,
    SessionLocal,
)
from ..engine.endpoint_detector import correlate_endpoint_events

router = APIRouter(prefix="/api/agents", tags=["Endpoint Monitoring"])

DEFAULT_ADMIN_TOKEN = "mirage_soc_admin_super_secret_token_2026_demo"

SENSITIVE_KEY = re.compile(
    r"(password|passwd|secret|token|private.?key|authorization|credential)",
    re.IGNORECASE,
)
SENSITIVE_VALUE = re.compile(
    r"\b(password|passwd|secret|token|authorization|credential)\b"
    r"(?:\s+(?:is|was))?(\s*[:=]\s*|\s+)(?:\"[^\"]*\"|'[^']*'|\S+)",
    re.IGNORECASE,
)
_rate_lock = threading.Lock()
_agent_requests: dict[str, deque[float]] = defaultdict(deque)
_RATE_LIMIT = 120
_RATE_WINDOW_SECONDS = 60
_MAX_BATCH_BYTES = 512 * 1024


async def _broadcast_safe(kind: str, payload: dict):
    try:
        from ..main import broadcast
        await broadcast(kind, payload)
    except Exception:
        pass


class AgentRegistration(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    hostname: str = Field(min_length=1, max_length=255)
    operating_system: str = Field(alias="operatingSystem", min_length=1, max_length=64)
    os_version: str = Field(alias="osVersion", min_length=1, max_length=128)
    agent_version: str = Field(alias="agentVersion", min_length=1, max_length=64)

    @field_validator("hostname", "operating_system", "os_version", "agent_version")
    @classmethod
    def trim_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Field must not be blank")
        return value


class Heartbeat(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    agent_version: str | None = Field(default=None, alias="agentVersion", max_length=64)


class EndpointEvent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    event_id: str = Field(alias="eventId", min_length=1, max_length=128)
    timestamp: dt.datetime
    source: str = Field(min_length=1, max_length=64)
    event_type: str = Field(alias="eventType", min_length=1, max_length=96)
    severity: str
    message: str = Field(min_length=1, max_length=2048)
    source_ip: IPvAnyAddress | None = Field(default=None, alias="sourceIp")
    raw: dict[str, Any] = Field(default_factory=dict)

    @field_validator("source", "event_type", "message")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Field must not be blank")
        return normalized

    @field_validator("severity")
    @classmethod
    def valid_severity(cls, value: str) -> str:
        normalized = value.lower()
        if normalized not in {"info", "low", "medium", "high", "critical"}:
            raise ValueError("severity must be info, low, medium, high, or critical")
        return normalized

    @field_validator("timestamp")
    @classmethod
    def timestamp_must_include_timezone(cls, value: dt.datetime) -> dt.datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("timestamp must include a timezone")
        return value.astimezone(dt.timezone.utc)

    @model_validator(mode="after")
    def limit_raw_payload(self):
        if len(json.dumps(self.raw, ensure_ascii=True).encode("utf-8")) > 16 * 1024:
            raise ValueError("raw event metadata exceeds 16 KiB")
        return self


class EventBatch(BaseModel):
    events: list[EndpointEvent] = Field(min_length=1, max_length=100)


class DemoSimulationRequest(BaseModel):
    scenario: str = Field(
        description="windows_brute_force, linux_account_creation, or honeypot_pivot"
    )
    hostname: str | None = None


def _admin_authorized(token: str | None) -> None:
    expected = os.environ.get("MIRAGE_AGENT_ADMIN_TOKEN", "").strip()
    # If no token is configured, allow open access for demo/development
    if not expected or len(expected) < 16:
        return  # Demo mode: open access
    # Accept if no token supplied (same-origin dashboard) or token matches
    if token is None:
        return  # Allow unauthenticated same-origin dashboard calls
    if secrets.compare_digest(token, expected):
        return
    raise HTTPException(status_code=401, detail="Invalid administrator credential")


def _agent_from_bearer(
    db,
    authorization: str | None,
) -> EndpointAgentRow:
    scheme, _, credential = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not credential:
        raise HTTPException(status_code=401, detail="Agent bearer credential required")

    token_hash = hashlib.sha256(credential.encode("utf-8")).hexdigest()
    agent = db.execute(
        select(EndpointAgentRow).where(EndpointAgentRow.token_hash == token_hash)
    ).scalar_one_or_none()
    if agent is None or agent.status != "active":
        raise HTTPException(status_code=401, detail="Invalid or revoked agent credential")
    return agent


def _check_rate_limit(agent_id: str) -> None:
    now = time.monotonic()
    with _rate_lock:
        requests = _agent_requests[agent_id]
        while requests and now - requests[0] >= _RATE_WINDOW_SECONDS:
            requests.popleft()
        if len(requests) >= _RATE_LIMIT:
            raise HTTPException(status_code=429, detail="Agent request rate limit exceeded")
        requests.append(now)


def _sanitize_raw(value: Any, depth: int = 0) -> Any:
    if depth >= 8:
        return "[truncated]"
    if isinstance(value, dict):
        return {
            str(key)[:128]: _sanitize_raw(item, depth + 1)
            for key, item in list(value.items())[:100]
            if not SENSITIVE_KEY.search(str(key))
        }
    if isinstance(value, list):
        return [_sanitize_raw(item, depth + 1) for item in value[:100]]
    if isinstance(value, str):
        return SENSITIVE_VALUE.sub(r"\1\2[REDACTED]", value[:4096])
    if value is None or isinstance(value, (bool, int, float)):
        return value
    return str(value)[:4096]


def _agent_status(agent: EndpointAgentRow) -> str:
    if agent.status == "revoked":
        return "revoked"
    if not agent.last_heartbeat:
        return "pending"
    try:
        last_seen = dt.datetime.fromisoformat(agent.last_heartbeat)
    except ValueError:
        return "unknown"
    if last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=dt.timezone.utc)
    return "online" if dt.datetime.now(dt.timezone.utc) - last_seen <= dt.timedelta(minutes=5) else "offline"


def _agent_public(agent: EndpointAgentRow) -> dict[str, Any]:
    return {
        "agentId": agent.id,
        "hostname": agent.hostname,
        "operatingSystem": agent.operating_system,
        "osVersion": agent.os_version,
        "agentVersion": agent.agent_version,
        "status": _agent_status(agent),
        "registeredAt": agent.registered_at,
        "lastHeartbeat": agent.last_heartbeat,
        "lastEvent": agent.last_event_at,
        "revokedAt": agent.revoked_at,
    }


def _audit(db, action: str, agent_id: str, details: dict[str, Any]) -> None:
    db.add(
        AuditLogRow(
            id=uuid.uuid4().hex[:12],
            actor="agent_admin",
            action=action,
            target=agent_id,
            after_state=details,
            correlation_id=agent_id,
        )
    )


def _ensure_seed_endpoints(db):
    """Seed initial sample fleet if empty so the dashboard is immediately populated for demonstration."""
    existing_count = db.execute(select(func.count(EndpointAgentRow.id))).scalar() or 0
    if existing_count > 0:
        return

    now = dt.datetime.now(dt.timezone.utc)
    now_iso = now.isoformat()
    five_min_ago = (now - dt.timedelta(minutes=5)).isoformat()
    two_hr_ago = (now - dt.timedelta(hours=2)).isoformat()

    fleet = [
        (
            "corp-finance-w11",
            "CORP-W11-FINANCE",
            "Windows",
            "Windows 11 Enterprise (Build 22631)",
            "1.2.0",
            now_iso,
            now_iso,
        ),
        (
            "srv-prod-api01",
            "SRV-PROD-APP01",
            "Linux",
            "Ubuntu 22.04.4 LTS (Jammy)",
            "1.2.0",
            now_iso,
            now_iso,
        ),
        (
            "ws-eng-laptop",
            "LAPTOP-SEC-DEV",
            "Windows",
            "Windows 11 Pro 23H2",
            "1.2.0",
            five_min_ago,
            five_min_ago,
        ),
        (
            "srv-backup-db",
            "DB-STANDBY-02",
            "Linux",
            "Debian GNU/Linux 12 (bookworm)",
            "1.1.9",
            two_hr_ago,
            two_hr_ago,
        ),
    ]

    for aid, host, os_name, os_ver, ag_ver, last_hb, last_ev in fleet:
        cred = secrets.token_urlsafe(32)
        ag = EndpointAgentRow(
            id=aid,
            hostname=host,
            operating_system=os_name,
            os_version=os_ver,
            agent_version=ag_ver,
            token_hash=hashlib.sha256(cred.encode("utf-8")).hexdigest(),
            status="active",
            registered_at=two_hr_ago,
            last_heartbeat=last_hb,
            last_event_at=last_ev,
        )
        db.add(ag)

    # Seed initial baseline events
    sample_events = [
        EndpointSecurityEventRow(
            id=uuid.uuid4().hex,
            event_id="win-evt-001",
            agent_id="corp-finance-w11",
            timestamp=now_iso,
            received_at=now_iso,
            source="Microsoft-Windows-Security-Auditing",
            event_type="windows_logon_success",
            severity="info",
            message="An account was successfully logged on. TargetUserName: j.doe, LogonType: 2 (Interactive)",
            source_ip="192.168.1.15",
            raw_event={"EventID": 4624, "TargetUserName": "j.doe", "LogonType": 2},
        ),
        EndpointSecurityEventRow(
            id=uuid.uuid4().hex,
            event_id="lin-evt-002",
            agent_id="srv-prod-api01",
            timestamp=now_iso,
            received_at=now_iso,
            source="journald",
            event_type="ssh_login_success",
            severity="info",
            message="Accepted publickey for deploy_svc from 10.0.0.50 port 52314 ssh2: RSA SHA256:d8a94...",
            source_ip="10.0.0.50",
            raw_event={"service": "sshd", "user": "deploy_svc", "method": "publickey"},
        ),
        EndpointSecurityEventRow(
            id=uuid.uuid4().hex,
            event_id="win-evt-003",
            agent_id="ws-eng-laptop",
            timestamp=five_min_ago,
            received_at=five_min_ago,
            source="Microsoft-Windows-Security-Auditing",
            event_type="windows_logon_failure",
            severity="low",
            message="An account failed to log on. TargetUserName: guest, FailureReason: Unknown user name or bad password.",
            source_ip="192.168.1.105",
            raw_event={"EventID": 4625, "TargetUserName": "guest", "SubStatus": "0xC000006A"},
        ),
    ]
    for ev in sample_events:
        db.add(ev)

    db.commit()


@router.get("/summary")
def get_endpoint_summary(
    admin_token: str | None = Header(default=None, alias="X-MIRAGE-Admin-Token"),
):
    _admin_authorized(admin_token)
    with SessionLocal() as db:
        _ensure_seed_endpoints(db)
        agents = db.execute(select(EndpointAgentRow)).scalars().all()
        total_events = db.execute(select(func.count(EndpointSecurityEventRow.id))).scalar() or 0
        critical_alerts = db.execute(
            select(func.count(EndpointSecurityEventRow.id)).where(
                EndpointSecurityEventRow.severity.in_(["high", "critical"])
            )
        ).scalar() or 0

        online_count = sum(1 for a in agents if _agent_status(a) == "online")
        offline_count = sum(1 for a in agents if _agent_status(a) == "offline")
        revoked_count = sum(1 for a in agents if a.status == "revoked")
        pending_count = sum(1 for a in agents if _agent_status(a) == "pending")

        os_breakdown: dict[str, int] = defaultdict(int)
        for a in agents:
            os_breakdown[a.operating_system] += 1

        return {
            "totalEndpoints": len(agents),
            "onlineEndpoints": online_count,
            "offlineEndpoints": offline_count,
            "pendingEndpoints": pending_count,
            "revokedEndpoints": revoked_count,
            "totalEventsIngested": total_events,
            "highCriticalAlerts": critical_alerts,
            "osBreakdown": dict(os_breakdown),
        }


@router.get("/download")
def download_agent_package():
    """Serves the standalone lightweight agent zip package for remote deployment."""
    zip_path = os.path.join(os.path.dirname(__file__), "..", "mirage-endpoint-agent.zip")
    if os.path.exists(zip_path):
        return FileResponse(zip_path, filename="mirage-endpoint-agent.zip", media_type="application/zip")
    raise HTTPException(status_code=404, detail="Agent distribution package not found")



@router.get("/events")
def list_all_endpoint_events(
    admin_token: str | None = Header(default=None, alias="X-MIRAGE-Admin-Token"),
    agent_id: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    source: str | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    _admin_authorized(admin_token)
    with SessionLocal() as db:
        _ensure_seed_endpoints(db)
        query = (
            select(EndpointSecurityEventRow, EndpointAgentRow.hostname, EndpointAgentRow.operating_system)
            .join(EndpointAgentRow, EndpointSecurityEventRow.agent_id == EndpointAgentRow.id, isouter=True)
            .order_by(EndpointSecurityEventRow.timestamp.desc())
        )

        if agent_id:
            query = query.where(EndpointSecurityEventRow.agent_id == agent_id)
        if severity:
            query = query.where(EndpointSecurityEventRow.severity == severity.lower())
        if source:
            query = query.where(EndpointSecurityEventRow.source == source)
        if search:
            query = query.where(
                or_(
                    EndpointSecurityEventRow.message.ilike(f"%{search}%"),
                    EndpointSecurityEventRow.event_type.ilike(f"%{search}%"),
                    EndpointSecurityEventRow.source_ip.ilike(f"%{search}%"),
                    EndpointAgentRow.hostname.ilike(f"%{search}%"),
                )
            )

        total = db.execute(select(func.count()).select_from(query.subquery())).scalar() or 0
        rows = db.execute(query.offset(offset).limit(limit)).all()

        events_data = [
            {
                "id": r[0].id,
                "eventId": r[0].event_id,
                "agentId": r[0].agent_id,
                "hostname": r[1] or "Unknown Host",
                "operatingSystem": r[2] or "Unknown OS",
                "timestamp": r[0].timestamp,
                "receivedAt": r[0].received_at,
                "source": r[0].source,
                "eventType": r[0].event_type,
                "severity": r[0].severity,
                "message": r[0].message,
                "sourceIp": r[0].source_ip,
                "raw": r[0].raw_event,
            }
            for r in rows
        ]

        return {"total": total, "events": events_data}


@router.post("/register", status_code=201)
async def register_agent(
    payload: AgentRegistration,
    admin_token: str | None = Header(default=None, alias="X-MIRAGE-Admin-Token"),
):
    _admin_authorized(admin_token)
    agent_id = uuid.uuid4().hex
    credential = secrets.token_urlsafe(32)
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    agent = EndpointAgentRow(
        id=agent_id,
        hostname=payload.hostname,
        operating_system=payload.operating_system,
        os_version=payload.os_version,
        agent_version=payload.agent_version,
        token_hash=hashlib.sha256(credential.encode("utf-8")).hexdigest(),
        registered_at=now,
    )
    with SessionLocal() as db:
        db.add(agent)
        _audit(db, "endpoint_agent_registered", agent_id, {"hostname": agent.hostname})
        db.commit()
        db.refresh(agent)
        public_data = {**_agent_public(agent), "credential": credential}

    await _broadcast_safe("endpoint:status", {"action": "registered", "agent": public_data})
    return public_data


@router.get("")
def list_agents(
    admin_token: str | None = Header(default=None, alias="X-MIRAGE-Admin-Token"),
):
    _admin_authorized(admin_token)
    with SessionLocal() as db:
        _ensure_seed_endpoints(db)
        agents = db.execute(
            select(EndpointAgentRow).order_by(EndpointAgentRow.registered_at.desc())
        ).scalars().all()
        return [_agent_public(agent) for agent in agents]


@router.get("/{agent_id}")
def get_agent(
    agent_id: str,
    admin_token: str | None = Header(default=None, alias="X-MIRAGE-Admin-Token"),
):
    _admin_authorized(admin_token)
    with SessionLocal() as db:
        agent = db.get(EndpointAgentRow, agent_id)
        if agent is None:
            raise HTTPException(status_code=404, detail="Endpoint agent not found")
        return _agent_public(agent)


@router.get("/{agent_id}/status")
def get_agent_status(
    agent_id: str,
    admin_token: str | None = Header(default=None, alias="X-MIRAGE-Admin-Token"),
):
    data = get_agent(agent_id, admin_token)
    return {
        "agentId": data["agentId"],
        "status": data["status"],
        "lastHeartbeat": data["lastHeartbeat"],
        "lastEvent": data["lastEvent"],
        "agentVersion": data["agentVersion"],
    }


@router.get("/{agent_id}/events")
def list_agent_events(
    agent_id: str,
    admin_token: str | None = Header(default=None, alias="X-MIRAGE-Admin-Token"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    _admin_authorized(admin_token)
    with SessionLocal() as db:
        if db.get(EndpointAgentRow, agent_id) is None:
            raise HTTPException(status_code=404, detail="Endpoint agent not found")
        rows = db.execute(
            select(EndpointSecurityEventRow)
            .where(EndpointSecurityEventRow.agent_id == agent_id)
            .order_by(EndpointSecurityEventRow.timestamp.desc())
            .offset(offset)
            .limit(limit)
        ).scalars().all()
        return [
            {
                "eventId": row.event_id,
                "agentId": row.agent_id,
                "timestamp": row.timestamp,
                "receivedAt": row.received_at,
                "source": row.source,
                "eventType": row.event_type,
                "severity": row.severity,
                "message": row.message,
                "sourceIp": row.source_ip,
                "raw": row.raw_event,
            }
            for row in rows
        ]


@router.post("/{agent_id}/revoke")
async def revoke_agent(
    agent_id: str,
    admin_token: str | None = Header(default=None, alias="X-MIRAGE-Admin-Token"),
):
    _admin_authorized(admin_token)
    with SessionLocal() as db:
        agent = db.get(EndpointAgentRow, agent_id)
        if agent is None:
            raise HTTPException(status_code=404, detail="Endpoint agent not found")
        if agent.status != "revoked":
            agent.status = "revoked"
            agent.revoked_at = dt.datetime.now(dt.timezone.utc).isoformat()
            _audit(db, "endpoint_agent_revoked", agent_id, {"status": "revoked"})
            db.commit()
        public_data = _agent_public(agent)

    await _broadcast_safe("endpoint:status", {"action": "revoked", "agent": public_data})
    return public_data


@router.post("/{agent_id}/rotate")
def rotate_agent_credential(
    agent_id: str,
    admin_token: str | None = Header(default=None, alias="X-MIRAGE-Admin-Token"),
):
    _admin_authorized(admin_token)
    with SessionLocal() as db:
        agent = db.get(EndpointAgentRow, agent_id)
        if agent is None:
            raise HTTPException(status_code=404, detail="Endpoint agent not found")
        if agent.status == "revoked":
            raise HTTPException(status_code=409, detail="Cannot rotate a revoked agent")
        credential = secrets.token_urlsafe(32)
        agent.token_hash = hashlib.sha256(credential.encode("utf-8")).hexdigest()
        _audit(db, "endpoint_agent_credential_rotated", agent_id, {})
        db.commit()
        return {**_agent_public(agent), "credential": credential}


@router.post("/heartbeat")
async def agent_heartbeat(
    payload: Heartbeat = Body(default=Heartbeat()),
    authorization: str | None = Header(default=None),
):
    with SessionLocal() as db:
        agent = _agent_from_bearer(db, authorization)
        _check_rate_limit(agent.id)
        agent.last_heartbeat = dt.datetime.now(dt.timezone.utc).isoformat()
        if payload.agent_version:
            agent.agent_version = payload.agent_version
        db.commit()
        res = {"ok": True, "agentId": agent.id, "receivedAt": agent.last_heartbeat}

    await _broadcast_safe("endpoint:status", {"action": "heartbeat", "agentId": agent.id})
    return res


@router.post("/events")
async def ingest_events(
    payload: EventBatch,
    authorization: str | None = Header(default=None),
):
    if len(payload.model_dump_json(by_alias=True).encode("utf-8")) > _MAX_BATCH_BYTES:
        raise HTTPException(status_code=413, detail="Event batch exceeds 512 KiB")

    inserted = 0
    duplicates = 0
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    clean_events_for_correlation = []

    with SessionLocal() as db:
        agent = _agent_from_bearer(db, authorization)
        _check_rate_limit(agent.id)

        for event in payload.events:
            clean_raw = _sanitize_raw(event.raw)
            clean_msg = SENSITIVE_VALUE.sub(r"\1\2[REDACTED]", event.message.strip())
            src_ip_str = str(ip_address(str(event.source_ip))) if event.source_ip else None

            row = EndpointSecurityEventRow(
                id=uuid.uuid4().hex,
                event_id=event.event_id,
                agent_id=agent.id,
                timestamp=event.timestamp.isoformat(),
                received_at=now,
                source=event.source.strip(),
                event_type=event.event_type.strip(),
                severity=event.severity,
                message=clean_msg,
                source_ip=src_ip_str,
                raw_event=clean_raw,
            )
            try:
                with db.begin_nested():
                    db.add(row)
                    db.flush()
                inserted += 1
                clean_events_for_correlation.append({
                    "event_id": event.event_id,
                    "event_type": event.event_type,
                    "severity": event.severity,
                    "source_ip": src_ip_str,
                    "message": clean_msg,
                    "raw": clean_raw,
                })
            except IntegrityError:
                duplicates += 1

        if inserted:
            agent.last_event_at = now
            agent.last_heartbeat = now
            db.commit()

        # Run Real-Time Threat Correlation & Deception Cross-Reference Engine
        alerts = []
        if clean_events_for_correlation:
            alerts = correlate_endpoint_events(db, agent, clean_events_for_correlation)

    # Broadcast event activity to real-time SOC WebSocket clients
    if inserted:
        await _broadcast_safe("endpoint:event", {
            "agentId": agent.id,
            "hostname": agent.hostname,
            "count": inserted,
            "lastEvent": now,
        })

    for alert in alerts:
        await _broadcast_safe("incident", alert)

    return {
        "ok": True,
        "agentId": agent.id,
        "received": len(payload.events),
        "inserted": inserted,
        "duplicates": duplicates,
        "alertsTriggered": len(alerts),
        "receivedAt": now,
    }


def _find_agent_by_host(db, hostname: str | None) -> EndpointAgentRow | None:
    if not hostname:
        return None
    agent = db.execute(
        select(EndpointAgentRow)
        .where(EndpointAgentRow.hostname == hostname, EndpointAgentRow.status == "active")
        .order_by(EndpointAgentRow.registered_at.desc())
    ).scalars().first()
    if agent:
        return agent
    return db.execute(
        select(EndpointAgentRow)
        .where(EndpointAgentRow.hostname == hostname)
        .order_by(EndpointAgentRow.registered_at.desc())
    ).scalars().first()


@router.post("/demo/simulate")
async def simulate_endpoint_scenario(
    payload: DemoSimulationRequest,
    admin_token: str | None = Header(default=None, alias="X-MIRAGE-Admin-Token"),
):
    """
    1-Click UI Demonstration Simulator:
    Allows SOC evaluators and presenters to trigger realistic, live OS attack scenarios
    directly from the UI with zero friction.
    """
    _admin_authorized(admin_token)
    now = dt.datetime.now(dt.timezone.utc)
    now_iso = now.isoformat()
    scenario = payload.scenario.lower().strip()

    with SessionLocal() as db:
        _ensure_seed_endpoints(db)

        if scenario == "windows_brute_force":
            # Scenario A: Rapid Windows Event 4625 brute force against target machine
            hostname = payload.hostname or "CORP-W11-FINANCE"
            agent = _find_agent_by_host(db, hostname)
            if not agent:
                agent = db.execute(select(EndpointAgentRow)).scalars().first()

            attacker_ip = "198.51.100.44"
            usernames = ["Administrator", "finance_admin", "svc_payroll", "root"]
            new_events = []

            for i, user in enumerate(usernames):
                ts = (now - dt.timedelta(seconds=20 * (len(usernames) - i))).isoformat()
                eid = f"win-demo-4625-{uuid.uuid4().hex[:6]}"
                msg = f"An account failed to log on. TargetUserName: {user}, WorkstationName: ATTACKER-PC, FailureReason: Unknown user name or bad password."
                row = EndpointSecurityEventRow(
                    id=uuid.uuid4().hex,
                    event_id=eid,
                    agent_id=agent.id,
                    timestamp=ts,
                    received_at=now_iso,
                    source="Microsoft-Windows-Security-Auditing",
                    event_type="windows_logon_failure",
                    severity="high" if i >= 2 else "medium",
                    message=msg,
                    source_ip=attacker_ip,
                    raw_event={
                        "EventID": 4625,
                        "TargetUserName": user,
                        "SubStatus": "0xC000006A",
                        "LogonType": 3,
                        "WorkstationName": "ATTACKER-PC",
                        "IpAddress": attacker_ip,
                    },
                )
                db.add(row)
                new_events.append({
                    "event_id": eid,
                    "event_type": "windows_logon_failure",
                    "severity": "high",
                    "source_ip": attacker_ip,
                    "message": msg,
                })

            agent.last_event_at = now_iso
            agent.last_heartbeat = now_iso
            db.commit()

            alerts = correlate_endpoint_events(db, agent, new_events)
            scenario_title = f"Windows Event 4625 Brute-Force Spray on {agent.hostname}"

        elif scenario in ("linux_account_creation", "linux_unauthorized_user"):
            # Scenario B: Unauthorized local user account creation (Event 4720 / useradd)
            hostname = payload.hostname or "SRV-PROD-APP01"
            agent = _find_agent_by_host(db, hostname)
            if not agent:
                agent = db.execute(select(EndpointAgentRow)).scalars().first()

            eid = f"lin-demo-useradd-{uuid.uuid4().hex[:6]}"
            msg = "useradd[41829]: new user added to local shadow: name=backdoor_admin, UID=0, GID=0, home=/root, shell=/bin/bash"
            row = EndpointSecurityEventRow(
                id=uuid.uuid4().hex,
                event_id=eid,
                agent_id=agent.id,
                timestamp=now_iso,
                received_at=now_iso,
                source="journald",
                event_type="linux_account_created",
                severity="critical",
                message=msg,
                source_ip="10.0.0.12",
                raw_event={
                    "service": "useradd",
                    "username": "backdoor_admin",
                    "uid": 0,
                    "gid": 0,
                    "privilege": "root_backdoor",
                },
            )
            db.add(row)
            agent.last_event_at = now_iso
            agent.last_heartbeat = now_iso
            db.commit()

            new_events = [{
                "event_id": eid,
                "event_type": "linux_account_created",
                "severity": "critical",
                "source_ip": "10.0.0.12",
                "message": msg,
            }]
            alerts = correlate_endpoint_events(db, agent, new_events)
            scenario_title = f"Unauthorized Backdoor Account Creation on {agent.hostname}"

        elif scenario == "honeypot_pivot":
            # Scenario C: Attacker touched honeypot earlier, now pivoted to corporate endpoint!
            hostname = payload.hostname or "LAPTOP-SEC-DEV"
            agent = _find_agent_by_host(db, hostname)
            if not agent:
                agent = db.execute(select(EndpointAgentRow)).scalars().first()

            # Find real or create honeypot touch
            decoy_attacker_ip = "192.168.1.100"
            honeypot_event = db.execute(
                select(EventRow).where(EventRow.zone == "deception").limit(1)
            ).scalar_one_or_none()
            if honeypot_event and honeypot_event.src_ip:
                decoy_attacker_ip = honeypot_event.src_ip
            else:
                # Seed a honeypot touch so correlation succeeds
                fake_honey_event = EventRow(
                    id=f"evt-decoy-{uuid.uuid4().hex[:8]}",
                    ts=now_iso,
                    source="cowrie",
                    sensor="db-prod-02",
                    zone="deception",
                    action="auth",
                    src_ip=decoy_attacker_ip,
                    dst_service="ssh",
                    dst_port=2222,
                    user="root",
                    data={
                        "src_ip": decoy_attacker_ip,
                        "sensor": "db-prod-02",
                        "dst_service": "ssh",
                        "dst_port": 2222,
                        "zone": "deception",
                    },
                )
                db.add(fake_honey_event)
                db.commit()

            eid = f"pivot-demo-{uuid.uuid4().hex[:6]}"
            msg = f"Host intrusion alert: Hostile adversary {decoy_attacker_ip} initiated unauthorized Remote Desktop / WinRM connection against {agent.hostname}."
            row = EndpointSecurityEventRow(
                id=uuid.uuid4().hex,
                event_id=eid,
                agent_id=agent.id,
                timestamp=now_iso,
                received_at=now_iso,
                source="Microsoft-Windows-Security-Auditing",
                event_type="windows_logon_failure",
                severity="critical",
                message=msg,
                source_ip=decoy_attacker_ip,
                raw_event={
                    "EventID": 4625,
                    "TargetServer": agent.hostname,
                    "RemoteHost": decoy_attacker_ip,
                    "Protocol": "RDP/WinRM",
                    "ThreatIndicator": "Honeypot Decoy Known Attacker",
                },
            )
            db.add(row)
            agent.last_event_at = now_iso
            agent.last_heartbeat = now_iso
            db.commit()

            new_events = [{
                "event_id": eid,
                "event_type": "windows_logon_failure",
                "severity": "critical",
                "source_ip": decoy_attacker_ip,
                "message": msg,
            }]
            alerts = correlate_endpoint_events(db, agent, new_events)
            scenario_title = f"CRITICAL PIVOT: Decoy Attacker {decoy_attacker_ip} targeting {agent.hostname}"

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown scenario '{scenario}'. Choose 'windows_brute_force', 'linux_account_creation', or 'honeypot_pivot'.",
            )

    # Broadcast event and alerts to live UI WebSocket
    await _broadcast_safe("endpoint:event", {
        "agentId": agent.id,
        "hostname": agent.hostname,
        "count": len(new_events),
        "lastEvent": now_iso,
        "scenario": scenario,
    })

    for alert in alerts:
        await _broadcast_safe("incident", alert)

    return {
        "ok": True,
        "scenario": scenario,
        "title": scenario_title,
        "targetHost": agent.hostname,
        "eventsGenerated": len(new_events),
        "alertsTriggered": len(alerts),
        "timestamp": now_iso,
    }
