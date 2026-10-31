from pydantic import BaseModel, Field, model_validator
from typing import Optional, Any
import uuid

class NormalizedEvent(BaseModel):
    # Core frozen identifiers (interoperable across PS04 frozen contract and Master Prompt)
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    ts: str                         # ISO8601 UTC
    source: str                     # cowrie | portal | opencanary | tripwire | prod
    sensor: str                     # db-prod-02 | customer-portal | fileserv-01 | prod-web-01 | tripwire-01 | scan-detector
    zone: str = "deception"         # deception | production
    session_id: Optional[str] = None
    src_ip: str                     # display IP (after alias map)
    raw_src_ip: Optional[str] = None
    dst_service: str = "generic"    # ssh | web | mysql | ftp | tripwire | prod-ssh | prod-http | prod-fw | multi
    dst_port: Optional[int] = None
    action: str                     # connect|auth|command|download|upload|scan|web_request|firewall|fingerprint
    outcome: str = "unknown"        # success|failure|allow|drop|unknown
    user: Optional[str] = None
    password: Optional[str] = None
    cmd: Optional[str] = None
    file: Optional[dict] = None     # {name, sha256, size, url}
    honeytoken_id: Optional[str] = None
    ssh: Optional[dict] = None      # {client, hassh}
    flags: list[str] = Field(default_factory=list)
    techniques: list[str] = Field(default_factory=list)
    stage: Optional[str] = None
    category: Optional[str] = None
    raw: dict[str, Any] = Field(default_factory=dict)

    # Master prompt extensions
    scenario_id: Optional[str] = None
    request_path: Optional[str] = None
    severity: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def reconcile_contract_fields(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values

        # Alias resolution for Master Prompt fields -> Frozen Schema
        if "event_id" in values and "id" not in values:
            values["id"] = values["event_id"]
        if "timestamp" in values and "ts" not in values:
            values["ts"] = values["timestamp"]
        if "event_type" in values and "action" not in values:
            values["action"] = values["event_type"]
        if "destination_asset" in values:
            if "sensor" not in values:
                values["sensor"] = values["destination_asset"]
            if "dst_service" not in values:
                values["dst_service"] = values["destination_asset"]
        if "destination_port" in values and "dst_port" not in values:
            values["dst_port"] = values["destination_port"]
        if "username" in values and "user" not in values:
            values["user"] = values["username"]
        if "command" in values and "cmd" not in values:
            values["cmd"] = values["command"]
        if "raw_event" in values and "raw" not in values:
            values["raw"] = values["raw_event"]
        if "tags" in values and "flags" not in values:
            values["flags"] = values["tags"]
        if "raw_src_ip" not in values and "source_ip" in values:
            values["raw_src_ip"] = values["source_ip"]
        if "src_ip" not in values and "source_ip" in values:
            values["src_ip"] = values["source_ip"]
        if "source" not in values and "sensor" in values:
            values["source"] = values["sensor"]

        return values

    def to_v1_dict(self) -> dict[str, Any]:
        """Returns Master Prompt canonical v1 representation."""
        return {
            "event_id": self.id,
            "timestamp": self.ts,
            "sensor": self.sensor,
            "event_type": self.action,
            "source_ip": self.src_ip,
            "source_port": None,
            "destination_asset": self.sensor,
            "destination_port": self.dst_port,
            "session_id": self.session_id,
            "username": self.user,
            "command": self.cmd,
            "request_path": self.request_path,
            "severity": self.severity or self.stage or "medium",
            "raw_event": self.raw,
            "tags": self.flags,
            "scenario_id": self.scenario_id,
            "techniques": self.techniques,
            "zone": self.zone
        }
