import os
import datetime as dt
from sqlalchemy import (
    create_engine, Column, String, Integer, Boolean, JSON, Text, ForeignKey,
    UniqueConstraint
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

Base = declarative_base()

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///mirage.db")
DB_URL = DATABASE_URL

# SQLite doesn't support pool_pre_ping in the same way or requires check_same_thread=False
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

def _utcnow_iso():
    return dt.datetime.now(dt.timezone.utc).isoformat()

class EventRow(Base):
    __tablename__ = "events"
    id = Column(String, primary_key=True)               # UUID or event_id
    event_id = Column(String, index=True, nullable=True) # Canonical v1 alias
    ts = Column(String, index=True)                     # ISO8601 UTC timestamp
    source = Column(String)                             # cowrie | portal | opencanary | tripwire | prod
    sensor = Column(String, index=True, nullable=True)
    zone = Column(String, index=True)                   # deception | production
    src_ip = Column(String, index=True)
    session_id = Column(String, index=True, nullable=True)
    action = Column(String)                             # connect|auth|command|etc.
    event_type = Column(String, nullable=True)          # v1 alias for action
    outcome = Column(String, default="unknown")
    dst_service = Column(String, nullable=True)
    dst_port = Column(Integer, nullable=True)
    destination_asset = Column(String, nullable=True)
    destination_port = Column(Integer, nullable=True)
    user = Column(String, nullable=True)
    username = Column(String, nullable=True)
    cmd = Column(String, nullable=True)
    command = Column(String, nullable=True)
    request_path = Column(String, nullable=True)
    severity = Column(String, nullable=True)
    tags = Column(JSON, nullable=True)
    scenario_id = Column(String, nullable=True)
    data = Column(JSON)                                 # full NormalizedEvent dict
    raw_event = Column(JSON, nullable=True)
    created_at = Column(String, default=_utcnow_iso)

class IncidentRow(Base):
    __tablename__ = "incidents"
    id = Column(String, primary_key=True)               # "INC-" + src_ip
    incident_key = Column(String, index=True, nullable=True)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    src_ip = Column(String, index=True)
    first_seen = Column(String)
    last_seen = Column(String)
    score = Column(Integer, default=0)
    risk_score = Column(Integer, default=0)
    confidence_score = Column(Integer, default=100)
    severity = Column(String)                           # low | medium | high | critical
    verdict = Column(String)                            # targeted | opportunistic
    stage = Column(String)                              # recon ... lateral_movement
    status = Column(String, default="open")             # open | investigating | contained | resolved | false_positive
    event_count = Column(Integer, default=0)
    attacker_id = Column(String, nullable=True)
    scenario_id = Column(String, nullable=True)
    real_asset_touched = Column(Boolean, default=False)
    honeytoken_hit = Column(Boolean, default=False)
    body = Column(JSON)                                 # full evaluated incident dict
    created_at = Column(String, default=_utcnow_iso)
    updated_at = Column(String, default=_utcnow_iso)
    resolved_at = Column(String, nullable=True)

class IncidentEventRow(Base):
    __tablename__ = "incident_events"
    id = Column(String, primary_key=True)
    incident_id = Column(String, ForeignKey("incidents.id"), index=True)
    event_id = Column(String, ForeignKey("events.id"), index=True)
    correlation_reason = Column(String, nullable=True)
    created_at = Column(String, default=_utcnow_iso)

class AttackerRow(Base):
    __tablename__ = "attackers"
    id = Column(String, primary_key=True)               # IP or synthetic ID
    source_ip = Column(String, unique=True, index=True)
    display_identity = Column(String, nullable=True)
    first_seen = Column(String)
    last_seen = Column(String)
    total_events = Column(Integer, default=0)
    total_incidents = Column(Integer, default=0)
    observed_sensors = Column(JSON, default=list)
    observed_usernames = Column(JSON, default=list)
    fingerprint = Column(JSON, default=dict)
    risk_level = Column(String, default="low")          # low | medium | high | critical
    created_at = Column(String, default=_utcnow_iso)
    updated_at = Column(String, default=_utcnow_iso)

class ActionRow(Base):
    __tablename__ = "actions"
    id = Column(String, primary_key=True)
    incident_id = Column(String, ForeignKey("incidents.id"), index=True)
    type = Column(String)                               # block_source | isolate_host | hunt | etc.
    action_type = Column(String, nullable=True)
    target = Column(String, nullable=True)
    params = Column(JSON)
    status = Column(String, default="recommended")       # recommended | dry_run | approved | executed | rejected
    requested_by = Column(String, default="detection_engine")
    approved_by = Column(String, nullable=True)
    approval_timestamp = Column(String, nullable=True)
    execution_timestamp = Column(String, nullable=True)
    result = Column(Text, nullable=True)
    result_data = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(String, default=_utcnow_iso)

class AttackTechniqueRow(Base):
    __tablename__ = "attack_techniques"
    id = Column(String, primary_key=True)
    technique_id = Column(String, index=True)           # e.g. T1078.001
    name = Column(String)
    tactic = Column(String, index=True)
    description = Column(Text, nullable=True)
    evidence_count = Column(Integer, default=1)
    confidence = Column(Integer, default=100)
    source_incident_id = Column(String, index=True, nullable=True)
    created_at = Column(String, default=_utcnow_iso)

class AuditLogRow(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True)
    actor = Column(String)                              # analyst name or system
    action = Column(String)                             # e.g. action_approved, blocklist_updated
    target = Column(String, nullable=True)
    before_state = Column(JSON, nullable=True)
    after_state = Column(JSON, nullable=True)
    timestamp = Column(String, default=_utcnow_iso)
    correlation_id = Column(String, nullable=True)

class EndpointAgentRow(Base):
    __tablename__ = "endpoint_agents"

    id = Column(String, primary_key=True)
    hostname = Column(String, nullable=False, index=True)
    operating_system = Column(String, nullable=False)
    os_version = Column(String, nullable=False)
    agent_version = Column(String, nullable=False)
    token_hash = Column(String, nullable=False, unique=True, index=True)
    status = Column(String, nullable=False, default="active", index=True)
    registered_at = Column(String, nullable=False, default=_utcnow_iso)
    last_heartbeat = Column(String, nullable=True, index=True)
    last_event_at = Column(String, nullable=True)
    revoked_at = Column(String, nullable=True)

class EndpointSecurityEventRow(Base):
    __tablename__ = "endpoint_security_events"
    __table_args__ = (
        UniqueConstraint("agent_id", "event_id", name="uq_endpoint_event_agent_event"),
    )

    id = Column(String, primary_key=True)
    event_id = Column(String, nullable=False, index=True)
    agent_id = Column(String, ForeignKey("endpoint_agents.id"), nullable=False, index=True)
    timestamp = Column(String, nullable=False, index=True)
    received_at = Column(String, nullable=False, default=_utcnow_iso, index=True)
    source = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)
    severity = Column(String, nullable=False, index=True)
    message = Column(Text, nullable=False)
    source_ip = Column(String, nullable=True, index=True)
    raw_event = Column(JSON, nullable=False, default=dict)

def init_db():
    Base.metadata.create_all(engine)

# Note: Table initialization is invoked at application startup in main.py
