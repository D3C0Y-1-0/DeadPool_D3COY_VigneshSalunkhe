from pydantic import BaseModel, Field
from typing import Optional, Any
import uuid

class NormalizedEvent(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    ts: str                         # ISO8601 UTC
    source: str                     # cowrie | portal | opencanary | tripwire | prod
    sensor: str                     # db-prod-02 | customer-portal | fileserv-01 | prod-web-01 | tripwire-01 | scan-detector
    zone: str                       # deception | production
    session_id: Optional[str] = None
    src_ip: str                     # display IP (after alias map)
    raw_src_ip: str
    dst_service: str                # ssh | web | mysql | ftp | tripwire | prod-ssh | prod-http | prod-fw | multi
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
