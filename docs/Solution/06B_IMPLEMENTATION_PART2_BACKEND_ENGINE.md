# 06B — Implementation Guide, Part 2: Pipeline, Detection Engine, API, Response

> Covers Phases 2, 3, 5. Design choice for 24h: **the engine re-evaluates an attacker's recent events from scratch on every new event** (pure function, trivial at demo scale). No incremental state bugs.

## 1. Backend layout
```
backend/
├─ Dockerfile
├─ requirements.txt
└─ app/
   ├─ main.py            # FastAPI, startup, WS, routes
   ├─ db.py              # engine, session, models
   ├─ schema.py          # NormalizedEvent
   ├─ collector.py       # tailers + parsers + alias map + scan detector
   ├─ engine/
   │  ├─ attack_map.yaml
   │  ├─ classify.py     # per-event rules -> techniques, stage
   │  ├─ evaluate.py     # events -> incident (score, verdict, correlation)
   │  ├─ respond.py      # recommendations + execution
   │  └─ stix.py         # IOC exports
   └─ geo.py             # alias -> display IP, country, ASN (static table)
```
`Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 2. Normalized event schema (FREEZE THIS IN HOUR 0)

`app/schema.py`
```python
from pydantic import BaseModel, Field
from typing import Optional, Any
import uuid

class NormalizedEvent(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    ts: str                         # ISO8601 UTC
    source: str                     # cowrie | portal | opencanary | tripwire | prod
    sensor: str                     # db-prod-02 | customer-portal | fileserv-01 | prod-web-01
    zone: str                       # deception | production
    session_id: Optional[str] = None
    src_ip: str                     # display IP (after alias map)
    raw_src_ip: str
    dst_service: str                # ssh | web | mysql | ftp | tripwire | prod-ssh | prod-http
    dst_port: Optional[int] = None
    action: str                     # connect|auth|command|download|upload|scan|web_request|token_use|firewall
    outcome: str = "unknown"        # success|failure|allow|drop|unknown
    user: Optional[str] = None
    password: Optional[str] = None
    cmd: Optional[str] = None
    file: Optional[dict] = None     # {name, sha256, size, url}
    honeytoken_id: Optional[str] = None
    ssh: Optional[dict] = None      # {client, hassh}
    flags: list[str] = []
    # filled by classify:
    techniques: list[str] = []
    stage: Optional[str] = None
    category: Optional[str] = None
    raw: dict[str, Any] = {}
```
ECS-lite export mapping: `ts→@timestamp`, `src_ip→source.ip`, `action→event.action`, `outcome→event.outcome`, `user→user.name`, `cmd→process.command_line`, `file.sha256→file.hash.sha256`.

## 3. DB models (`app/db.py`)
```python
import os
from sqlalchemy import create_engine, Column, String, Integer, Boolean, JSON, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker
Base = declarative_base()
engine = create_engine(os.environ.get("DATABASE_URL", "sqlite:///mirage.db"), pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

class EventRow(Base):
    __tablename__ = "events"
    id = Column(String, primary_key=True)
    ts = Column(String, index=True)
    source = Column(String); zone = Column(String, index=True)
    src_ip = Column(String, index=True); session_id = Column(String, index=True)
    action = Column(String); outcome = Column(String)
    data = Column(JSON)                      # full NormalizedEvent dict

class IncidentRow(Base):
    __tablename__ = "incidents"
    id = Column(String, primary_key=True)    # "INC-" + src_ip
    src_ip = Column(String, index=True)
    first_seen = Column(String); last_seen = Column(String)
    score = Column(Integer); severity = Column(String); verdict = Column(String)
    stage = Column(String); status = Column(String, default="open")   # open|contained|closed
    real_asset_touched = Column(Boolean, default=False)
    honeytoken_hit = Column(Boolean, default=False)
    body = Column(JSON)                      # full evaluated incident (factors, techniques, timeline, profile)

class ActionRow(Base):
    __tablename__ = "actions"
    id = Column(String, primary_key=True)
    incident_id = Column(String, index=True)
    type = Column(String); params = Column(JSON)
    status = Column(String, default="recommended")   # recommended|approved|executed|dry_run
    result = Column(Text)

Base.metadata.create_all(engine)
```

## 4. Collector: tail → parse → alias → store → engine → WebSocket

`app/geo.py` (static for demo; swap for GeoLite2 if available)
```python
ALIAS = {"172.28.0.50": "203.0.113.50", "172.29.0.50": "203.0.113.50"}
GEO = {"203.0.113.50": ("RU", "AS64500 ExampleNet"), }
NOISE_COUNTRIES = [("CN","AS64501"),("BR","AS64502"),("US","AS64503"),("IN","AS64504"),("VN","AS64505"),("DE","AS64506")]
def display_ip(raw):
    if raw in ALIAS: return ALIAS[raw]
    if raw.startswith("172.28.0.") and int(raw.split(".")[-1]) >= 100:
        return f"198.51.100.{int(raw.split('.')[-1]) - 99}"
    return raw
def geo(ip):
    if ip in GEO: return GEO[ip]
    n = int(ip.split(".")[-1]) if ip.split(".")[-1].isdigit() else 0
    c, asn = NOISE_COUNTRIES[n % len(NOISE_COUNTRIES)]
    return (c, asn)
```

`app/collector.py`
```python
import asyncio, json, os, time
from collections import defaultdict, deque
from .schema import NormalizedEvent
from .geo import display_ip

SENSORS = {"cowrie": ("db-prod-02", "deception"), "portal": ("customer-portal", "deception"),
           "opencanary": ("fileserv-01", "deception"), "tripwire": ("tripwire-01", "deception"),
           "prod": ("prod-web-01", "production")}

# ---------- parsers: raw dict -> NormalizedEvent | None ----------
def parse_cowrie(r):
    eid = r.get("eventid", ""); ip = r.get("src_ip")
    if not ip: return None
    base = dict(ts=r["timestamp"], source="cowrie", session_id=r.get("session"), raw_src_ip=ip, src_ip=display_ip(ip),
                dst_service="ssh", dst_port=22, raw=r)
    if eid == "cowrie.session.connect":    return dict(base, action="connect")
    if eid == "cowrie.login.failed":       return dict(base, action="auth", outcome="failure", user=r.get("username"), password=r.get("password"))
    if eid == "cowrie.login.success":      return dict(base, action="auth", outcome="success", user=r.get("username"), password=r.get("password"))
    if eid == "cowrie.command.input":      return dict(base, action="command", cmd=r.get("input"))
    if eid == "cowrie.session.file_download":
        return dict(base, action="download", file={"url": r.get("url"), "sha256": r.get("shasum"), "name": r.get("outfile")})
    if eid == "cowrie.session.file_upload":
        return dict(base, action="upload", file={"sha256": r.get("shasum"), "name": r.get("filename")})
    if eid == "cowrie.client.version":     return dict(base, action="fingerprint", ssh={"client": r.get("version")})
    if eid == "cowrie.client.kex":         return dict(base, action="fingerprint", ssh={"hassh": r.get("hassh")})
    return None

def parse_portal(r):
    ip = r["src_ip"]
    base = dict(ts=r["ts"], source="portal", raw_src_ip=ip, src_ip=display_ip(ip), dst_service="web", dst_port=8080,
                flags=r.get("flags", []), raw=r)
    a = r.get("action")
    if a == "login":    return dict(base, action="auth", outcome=r["outcome"], user=r.get("user"), password=r.get("password"))
    if a == "download": return dict(base, action="download", file=r.get("file"), honeytoken_id=r.get("honeytoken_id"), outcome="success")
    return dict(base, action="web_request", cmd=r.get("path"))

def parse_opencanary(r):
    ip = r.get("src_host"); lt = r.get("logtype")
    if not ip: return None
    svc = {8001: "mysql", 2000: "ftp"}.get(lt)
    if not svc: return None
    d = r.get("logdata", {})
    ts = r.get("utc_time", "").replace(" ", "T") + "Z" if r.get("utc_time") else time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    return dict(ts=ts, source="opencanary", raw_src_ip=ip, src_ip=display_ip(ip), dst_service=svc, dst_port=r.get("dst_port"),
                action="auth", outcome="failure", user=d.get("USERNAME"), password=d.get("PASSWORD"), raw=r)

def parse_tripwire(r):
    ip = r["src_ip"]
    return dict(ts=r["ts"], source="tripwire", raw_src_ip=ip, src_ip=display_ip(ip), dst_service="tripwire",
                dst_port=r["dst_port"], action="connect", raw=r)

def parse_prod(r):
    ip = r["src_ip"]
    base = dict(ts=r["ts"], source="prod", raw_src_ip=ip, src_ip=display_ip(ip), raw=r)
    if r["type"] == "firewall":
        return dict(base, dst_service="prod-fw", dst_port=r.get("dst_port"), action="firewall", outcome=r["action"])
    if r["type"] == "auth":
        return dict(base, dst_service="prod-ssh", dst_port=22, action="auth", outcome=r["outcome"], user=r.get("user"),
                    flags=["honeytoken_use"] if r.get("honeytoken") else [])
    return None

PARSERS = {"cowrie": ("/in/cowrie/cowrie.json", parse_cowrie), "portal": ("/in/portal/portal.json", parse_portal),
           "opencanary": ("/in/canary/opencanary.log", parse_opencanary), "tripwire": ("/in/tripwire/tripwire.json", parse_tripwire),
           "prod": ("/in/prod/prod.json", parse_prod)}

# ---------- scan detector: >=4 distinct dst ports in 10s from one IP ----------
_recent = defaultdict(lambda: deque(maxlen=50)); _scan_flagged = {}
def scan_event(ev):
    if ev["action"] != "connect" and not (ev["action"] == "firewall" and ev["zone"] == "deception"): return None
    now = time.time(); q = _recent[ev["src_ip"]]; q.append((now, ev.get("dst_port")))
    ports = {p for t, p in q if now - t <= 10 and p}
    if len(ports) >= 4 and now - _scan_flagged.get(ev["src_ip"], 0) > 300:
        _scan_flagged[ev["src_ip"]] = now
        return dict(ts=ev["ts"], source="tripwire", sensor="scan-detector", zone="deception", raw_src_ip=ev["raw_src_ip"], src_ip=ev["src_ip"],
                    dst_service="multi", action="scan", outcome="success", flags=[f"ports:{sorted(ports)}"], raw={})
    return None

# ---------- tailer with offsets and partial-line safety ----------
async def tail(name, path, parser, on_event):
    pos, buf = 0, ""
    while True:
        try:
            if os.path.exists(path):
                with open(path, "r") as f:
                    f.seek(pos); chunk = f.read(); pos = f.tell()
                buf += chunk
                *lines, buf = buf.split("\n")
                for line in lines:
                    if not line.strip(): continue
                    try: r = json.loads(line)
                    except json.JSONDecodeError: continue
                    ev = parser(r)
                    if not ev: continue
                    ev["sensor"], ev["zone"] = SENSORS[name]
                    await on_event(NormalizedEvent(**ev).model_dump())
                    s = scan_event(ev | {"zone": ev["zone"]})
                    if s: await on_event(NormalizedEvent(**s).model_dump())
        except Exception as e:
            print("tail error", name, e)
        await asyncio.sleep(0.4)

async def start(on_event):
    for name, (path, parser) in PARSERS.items():
        asyncio.create_task(tail(name, path, parser, on_event))
```
> OpenCanary's `utc_time` format and `logtype` codes vary by version; print one real line and adjust `parse_opencanary`.

## 5. Detection engine

### 5.1 `engine/attack_map.yaml` (data-driven; edit tactic labels freely)
```yaml
attack_version: "v19 (verify at attack.mitre.org)"
stage_order: [recon, credential_attack, initial_access, execution, discovery, collection, exfiltration, persistence, lateral_movement, impact]
techniques:
  T1046:     {name: Network Service Discovery,        tactic: Discovery}
  T1595.001: {name: Scanning IP Blocks,               tactic: Reconnaissance}
  T1110.001: {name: Password Guessing,                tactic: Credential Access}
  T1110.004: {name: Credential Stuffing,              tactic: Credential Access}
  T1078.001: {name: Default Accounts,                 tactic: Initial Access}
  T1078:     {name: Valid Accounts,                   tactic: Initial Access}
  T1190:     {name: Exploit Public-Facing Application,tactic: Initial Access}
  T1059.004: {name: Unix Shell,                       tactic: Execution}
  T1082:     {name: System Information Discovery,     tactic: Discovery}
  T1033:     {name: System Owner/User Discovery,      tactic: Discovery}
  T1083:     {name: File and Directory Discovery,     tactic: Discovery}
  T1057:     {name: Process Discovery,                tactic: Discovery}
  T1552.001: {name: Credentials In Files,             tactic: Credential Access}
  T1005:     {name: Data from Local System,           tactic: Collection}
  T1560:     {name: Archive Collected Data,           tactic: Collection}
  T1105:     {name: Ingress Tool Transfer,            tactic: Command and Control}
  T1041:     {name: Exfiltration Over C2 Channel,     tactic: Exfiltration}
  T1048:     {name: Exfiltration Over Alternative Protocol, tactic: Exfiltration}
  T1098.004: {name: SSH Authorized Keys,              tactic: Persistence}
  T1053.003: {name: Cron,                             tactic: Persistence}
  T1070.003: {name: Clear Command History,            tactic: Stealth}   # was Defense Evasion before v19
  T1021.004: {name: SSH,                              tactic: Lateral Movement}
  T1496:     {name: Resource Hijacking,               tactic: Impact}
rules:
  - {id: scan,          when: {action: scan},                                  techniques: [T1046, T1595.001], stage: recon,             category: scanning}
  - {id: connect,       when: {action: connect},                               techniques: [],                 stage: recon,             category: scanning}
  - {id: auth_fail,     when: {action: auth, outcome: failure},                techniques: [T1110.001],        stage: credential_attack, category: brute_force}
  - {id: auth_ok,       when: {action: auth, outcome: success},                techniques: [T1078.001],        stage: initial_access,    category: initial_access}
  - {id: web_exploit,   when: {action: auth, flag_any: [sqli, traversal]},     techniques: [T1190],            stage: initial_access,    category: exploitation}
  - {id: shell,         when: {action: command},                               techniques: [T1059.004],        stage: execution,         category: post_compromise}
  - {id: sysinfo,       when: {action: command, regex: '^\s*(uname|hostname|cat\s+/proc/(cpu|mem)info|lscpu|df)\b'}, techniques: [T1082], stage: discovery, category: post_compromise}
  - {id: whoami,        when: {action: command, regex: '^\s*(whoami|id|w|who|last)\b'},                              techniques: [T1033], stage: discovery, category: post_compromise}
  - {id: ls,            when: {action: command, regex: '^\s*(ls|ll|dir|find|locate|tree|pwd)\b'},                    techniques: [T1083], stage: discovery, category: post_compromise}
  - {id: ps,            when: {action: command, regex: '^\s*(ps|top|netstat|ss)\b'},                                  techniques: [T1057], stage: discovery, category: post_compromise}
  - {id: cred_files,    when: {action: command, regex: '(notes\.txt|\.aws/credentials|\.mysql_history|id_rsa|/etc/shadow|\.env)'}, techniques: [T1552.001], stage: collection, category: post_compromise}
  - {id: crown_jewel,   when: {action: command, regex: '(customer_data|/srv/backups|\.sql|\.csv|dump)'},               techniques: [T1005], stage: collection, category: post_compromise, flag: crown_jewel}
  - {id: archive,       when: {action: command, regex: '\b(tar|zip|gzip|7z)\b'},                                      techniques: [T1560], stage: collection, category: post_compromise}
  - {id: tooldl,        when: {action: command, regex: '\b(wget|curl|tftp|scp|sftp|ftp)\b.*(http|ftp|:)'},            techniques: [T1105], stage: execution, category: post_compromise}
  - {id: persist_ssh,   when: {action: command, regex: 'authorized_keys'},                                             techniques: [T1098.004], stage: persistence, category: post_compromise}
  - {id: persist_cron,  when: {action: command, regex: '(crontab|/etc/cron)'},                                         techniques: [T1053.003], stage: persistence, category: post_compromise}
  - {id: clear_hist,    when: {action: command, regex: '(history\s+-c|unset\s+HISTFILE|rm\s+.*bash_history)'},         techniques: [T1070.003], stage: persistence, category: post_compromise}
  - {id: miner,         when: {action: command, regex: '(xmrig|minerd|stratum\+tcp)'},                                techniques: [T1496], stage: impact, category: post_compromise}
  - {id: dl_download,   when: {action: download},                              techniques: [T1005, T1041],     stage: exfiltration,      category: exfiltration, flag: crown_jewel}
  - {id: upload,        when: {action: upload},                                techniques: [T1105],            stage: execution,         category: post_compromise}
  - {id: token_use,     when: {action: auth, flag_any: [honeytoken_use]},      techniques: [T1078, T1021.004], stage: lateral_movement,  category: lateral_movement, flag: honeytoken}
```

### 5.2 `engine/classify.py`
```python
import re, yaml, pathlib
MAP = yaml.safe_load(open(pathlib.Path(__file__).with_name("attack_map.yaml")))
TECH = MAP["techniques"]; ORDER = MAP["stage_order"]; RULES = MAP["rules"]

def _match(when, ev):
    for k, v in when.items():
        if k == "regex":
            if not re.search(v, ev.get("cmd") or "", re.I): return False
        elif k == "flag_any":
            if not set(v) & set(ev.get("flags", [])): return False
        elif ev.get(k) != v: return False
    return True

def classify(ev: dict) -> dict:
    techs, stage, cat, flags = set(), None, None, list(ev.get("flags", []))
    for r in RULES:
        if _match(r["when"], ev):
            techs.update(r["techniques"])
            if stage is None or ORDER.index(r["stage"]) >= ORDER.index(stage):
                stage, cat = r["stage"], r["category"]
            if r.get("flag"): flags.append(r["flag"])
    if ev.get("honeytoken_id"): flags.append("honeytoken")
    ev.update(techniques=sorted(techs), stage=stage, category=cat, flags=sorted(set(flags)))
    return ev
```

### 5.3 `engine/evaluate.py` — events → scored incident
```python
import statistics, datetime as dt
from collections import Counter
from .classify import TECH, ORDER

STAGE_POINTS = dict(recon=10, credential_attack=25, initial_access=45, execution=50, discovery=60, collection=75,
                    exfiltration=85, persistence=85, lateral_movement=90, impact=80)
COMMON_PW = {"root","toor","admin","123456","password","admin123","passw0rd","12345","qwerty","test","guest","ubuntu"}
HONEYTOKENS = {"svc_backup": "HT-CRED-001", "HT-CUST-001": "HT-CUST-001"}

def _t(s): return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))

def cadence(cmd_events):
    ts = sorted(_t(e["ts"]) for e in cmd_events)
    if len(ts) < 3: return "unknown", None
    gaps = [(b - a).total_seconds() for a, b in zip(ts, ts[1:])]
    med = statistics.median(gaps); mean = statistics.mean(gaps)
    cv = (statistics.pstdev(gaps) / mean) if mean else 0
    if med < 0.6: return "bot", med
    if med >= 1.5 and cv >= 0.3: return "human", med
    return "scripted", med

def evaluate(src_ip: str, events: list[dict]) -> dict:
    dec = [e for e in events if e["zone"] == "deception"]
    prod = [e for e in events if e["zone"] == "production"]   # every prod event for this IP is a real-asset touch
    if not dec and not prod: return {}
    all_ev = sorted(dec + prod, key=lambda e: e["ts"])
    stages = [e["stage"] for e in all_ev if e.get("stage")]
    max_stage = max(stages, key=ORDER.index) if stages else "recon"
    techs = sorted({t for e in all_ev for t in e.get("techniques", [])})
    flags = Counter(f for e in all_ev for f in e.get("flags", []))
    sensors = {e["sensor"] for e in dec if e["sensor"] != "scan-detector"}
    sessions = {e["session_id"] for e in dec if e.get("session_id")}
    cmds = [e for e in dec if e["action"] == "command"]
    cad, med = cadence(cmds)
    pw_all_common = (lambda a: bool(a) and all((x or "").lower() in COMMON_PW for x in a))([e.get("password") for e in dec if e["action"] == "auth"])
    real_touch = [e for e in prod if e["src_ip"] == src_ip]
    honeytoken = flags.get("honeytoken", 0) + flags.get("honeytoken_use", 0) > 0
    crown = flags.get("crown_jewel", 0) > 0
    duration = (_t(all_ev[-1]["ts"]) - _t(all_ev[0]["ts"])).total_seconds()

    factors = [dict(label=f"Stage reached: {max_stage}", points=STAGE_POINTS[max_stage])]
    tgt = noise = 0
    def add(label, pts, t=0, n=0):
        nonlocal tgt, noise
        factors.append(dict(label=label, points=pts)); tgt += t; noise += n
    if cad == "human":              add("Human typing cadence", 10, t=2)
    if len(sensors) >= 2:           add(f"Touched {len(sensors)} different decoys", 10, t=1)
    if crown:                       add("Accessed crown-jewel decoy data", 10, t=2)
    if real_touch:                  add("Same source touched REAL asset", 25, t=3)
    if honeytoken:                  add("Honeytoken used / triggered", 30, t=3)
    if len(sessions) >= 2 and duration > 600: add("Returned in a later session", 5, t=1)
    if pw_all_common and not cmds:  add("Only common wordlist credentials", -15, n=2)
    if cad == "bot":                add("Machine-speed command cadence", -10, n=2)
    if duration < 5 and not cmds:   add("Drive-by: <5s, no commands", -10, n=1)
    score = max(0, min(100, sum(f["points"] for f in factors)))
    sev = "critical" if score >= 85 else "high" if score >= 60 else "medium" if score >= 30 else "low"
    if honeytoken or real_touch: sev = "critical"
    verdict = "targeted" if tgt >= 3 and tgt > noise else "opportunistic"

    return dict(
        src_ip=src_ip, first_seen=all_ev[0]["ts"], last_seen=all_ev[-1]["ts"], duration_s=int(duration),
        score=score, severity=sev, verdict=verdict, stage=max_stage, techniques=techniques_detail(techs),
        factors=factors, real_asset_touched=bool(real_touch), honeytoken_hit=honeytoken,
        real_asset_events=[e for e in real_touch][:20],
        profile=dict(cadence=cad, median_gap_s=med, sensors=sorted(sensors), sessions=len(sessions),
                     creds_tried=sorted({f"{e.get('user')}:{e.get('password')}" for e in dec if e["action"] == "auth"})[:25],
                     ssh_client=next((e["ssh"].get("client") for e in dec if e.get("ssh") and e["ssh"].get("client")), None),
                     hassh=next((e["ssh"].get("hassh") for e in dec if e.get("ssh") and e["ssh"].get("hassh")), None)),
        timeline=[dict(ts=e["ts"], sensor=e["sensor"], zone=e["zone"], action=e["action"], outcome=e["outcome"],
                       summary=summarize(e), stage=e.get("stage"), techniques=e.get("techniques", [])) for e in all_ev if e["action"] not in ("fingerprint",)],
        transcript=[dict(ts=e["ts"], cmd=e["cmd"]) for e in cmds],
        files=[e["file"] for e in dec if e.get("file")],
        narrative=narrative(src_ip, all_ev, max_stage, bool(real_touch), honeytoken, verdict))

def techniques_detail(ids): return [dict(id=i, **TECH.get(i, dict(name="?", tactic="?"))) for i in ids]

def summarize(e):
    a = e["action"]
    if a == "auth":     return f"{e['outcome']} login {e.get('user')}:{e.get('password') or '***'} on {e['dst_service']}"
    if a == "command":  return f"$ {e.get('cmd')}"
    if a == "download": return f"downloaded {(e.get('file') or {}).get('name')}"
    if a == "scan":     return "port scan: " + ", ".join(e.get("flags", []))
    if a == "firewall": return f"prod firewall {e['outcome']} :{e.get('dst_port')}"
    return f"{a} on {e['dst_service']}"

def narrative(ip, evs, stage, real, token, verdict):
    parts = [f"{ip} ({verdict}) progressed to '{stage}' on the deception fabric"]
    if any(e["action"] == "scan" for e in evs): parts.append("after scanning multiple ports")
    if any(e["action"] == "auth" and e["outcome"] == "success" and e["zone"] == "deception" for e in evs): parts.append("logged in using default credentials")
    if any("crown_jewel" in e.get("flags", []) for e in evs): parts.append("and accessed the decoy customer data")
    s = " ".join(parts) + "."
    if token: s += " A planted honeytoken credential was then used against a real asset: confirmed lateral movement."
    elif real: s += " The same source was also seen against real production assets."
    return s
```

### 5.4 Correlation (inside `evaluate` via event pool)
The API builds the pool for an IP as: **all events (deception + production) with that display IP within the last 30 minutes**. Production events matching the IP automatically populate `real_asset_events`. Benign internal traffic (10.x) never matches an attacker IP, so no false positives.

### 5.5 `engine/respond.py`
```python
import uuid
def recommend(inc: dict) -> list[dict]:
    ip, acts = inc["src_ip"], []
    def a(t, title, why, params, requires_approval=True):
        acts.append(dict(id=uuid.uuid4().hex[:10], type=t, title=title, why=why, params=params,
                         requires_approval=requires_approval, status="recommended"))
    if inc["severity"] in ("high", "critical"):
        a("block_source", f"Block {ip} at the edge", "Confirmed hostile interaction with decoys", {"ip": ip})
    if inc["real_asset_touched"]:
        a("isolate_host", "Isolate prod-web-01 pending review", "Same source touched a real asset", {"host": "prod-web-01"})
        a("hunt", "Hunt this IP in prod logs (24h)", "Find any other real-asset contact",
          {"splunk": f'index=firewall OR index=auth src_ip="{ip}" earliest=-24h | stats count by host, action',
           "kql": f'union Firewall, Auth | where SrcIp == "{ip}" and TimeGenerated > ago(24h) | summarize count() by Host, Action'})
    if inc["honeytoken_hit"]:
        a("rotate_credentials", "Rotate/disable svc_backup and audit where it lives", "Bait credential was used", {"account": "svc_backup"})
    a("export_iocs", "Export IOCs (STIX / CSV / blocklist)", "Share with peers and feed controls", {"ip": ip}, requires_approval=False)
    if inc["severity"] == "low":
        acts[:] = [x for x in acts if x["type"] == "export_iocs"]; a("monitor", "Monitor only", "Opportunistic noise", {"ip": ip}, False)
    return acts

def execute(action: dict, dry_run=False) -> str:
    t, p = action["type"], action["params"]
    if t == "block_source":
        cmd = f"nft add element inet filter blocklist {{ {p['ip']} }}"
        if dry_run: return "DRY-RUN: " + cmd
        with open("/shared/blocklist.txt", "a") as f: f.write(p["ip_raw"] if "ip_raw" in p else p["ip"]); f.write("\n")
        return "Blocklist updated. Equivalent: " + cmd
    if t == "isolate_host":
        return ("DRY-RUN: " if dry_run else "") + f"EDR isolate host={p['host']} (simulated)"
    if t == "rotate_credentials":
        return ("DRY-RUN: " if dry_run else "") + f"Disable account {p['account']} (simulated)"
    return "ok"
```
> **Important:** prod-sim sees the **raw** container IPs (`172.29.0.50`), not the display alias. When blocking, write **all raw IPs mapped to that display IP** (use a reverse alias lookup: `[k for k,v in ALIAS.items() if v == ip]`). Add this in `execute`.

### 5.6 `engine/stix.py`
```python
import json, uuid, datetime as dt
def now(): return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
def bundle(inc: dict) -> dict:
    ts = now(); objs = []
    ind_ids = []
    def ind(name, pattern, desc):
        i = f"indicator--{uuid.uuid4()}"; ind_ids.append(i)
        objs.append(dict(type="indicator", spec_version="2.1", id=i, created=ts, modified=ts, name=name, description=desc,
                         pattern=pattern, pattern_type="stix", valid_from=ts, indicator_types=["malicious-activity"]))
    ind(f"Attacker IP {inc['src_ip']}", f"[ipv4-addr:value = '{inc['src_ip']}']", inc["narrative"])
    for f in inc["files"]:
        if f.get("sha256"): ind(f"File {f.get('name')}", f"[file:hashes.'SHA-256' = '{f['sha256']}']", "File touched on decoy")
    for t in inc["techniques"]:
        objs.append(dict(type="attack-pattern", spec_version="2.1", id=f"attack-pattern--{uuid.uuid4()}", created=ts, modified=ts,
                         name=t["name"], external_references=[dict(source_name="mitre-attack", external_id=t["id"],
                         url=f"https://attack.mitre.org/techniques/{t['id'].replace('.', '/')}/")]))
    return dict(type="bundle", id=f"bundle--{uuid.uuid4()}", objects=objs)
def csv_iocs(inc): return "type,value\nipv4," + inc["src_ip"] + "\n" + "".join(f"sha256,{f['sha256']}\n" for f in inc["files"] if f.get("sha256"))
```

## 6. API + WebSocket (`app/main.py`)
```python
import asyncio, json, uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy import select
import datetime as dt
from .db import SessionLocal, EventRow, IncidentRow, ActionRow
from . import collector
from .engine.classify import classify
from .engine.evaluate import evaluate
from .engine.respond import recommend, execute
from .engine.stix import bundle, csv_iocs
from .geo import geo, ALIAS

app = FastAPI(title="MIRAGE SOC API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
clients: set[WebSocket] = set()

async def broadcast(kind, payload):
    dead = []
    for c in clients:
        try: await c.send_text(json.dumps({"kind": kind, "data": payload}))
        except Exception: dead.append(c)
    for c in dead: clients.discard(c)

def recent_events(db, ip, minutes=30):
    cutoff = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=minutes)).strftime("%Y-%m-%dT%H:%M:%S")
    rows = db.execute(select(EventRow).where(EventRow.src_ip == ip, EventRow.ts >= cutoff).order_by(EventRow.ts)).scalars()
    return [r.data for r in rows]

async def on_event(ev: dict):
    ev = classify(ev)
    with SessionLocal() as db:
        db.add(EventRow(id=ev["id"], ts=ev["ts"], source=ev["source"], zone=ev["zone"], src_ip=ev["src_ip"],
                        session_id=ev.get("session_id"), action=ev["action"], outcome=ev["outcome"], data=ev))
        db.commit()
        is_benign_prod = ev["zone"] == "production" and ev["src_ip"].startswith("10.")
        await broadcast("event", ev)
        if is_benign_prod: return          # internal benign traffic never creates incidents
        inc = evaluate(ev["src_ip"], recent_events(db, ev["src_ip"]))
        if not inc: return
        inc["country"], inc["asn"] = geo(ev["src_ip"])
        iid = "INC-" + ev["src_ip"]
        row = db.get(IncidentRow, iid)
        old_status = row.status if row else "open"
        inc["id"], inc["status"] = iid, old_status
        inc["actions"] = recommend(inc) if not row else (row.body or {}).get("actions") or recommend(inc)
        if not row:
            row = IncidentRow(id=iid, src_ip=ev["src_ip"]); db.add(row)
        row.first_seen, row.last_seen, row.score, row.severity = inc["first_seen"], inc["last_seen"], inc["score"], inc["severity"]
        row.verdict, row.stage, row.status = inc["verdict"], inc["stage"], old_status
        row.real_asset_touched, row.honeytoken_hit, row.body = inc["real_asset_touched"], inc["honeytoken_hit"], inc
        db.commit()
        await broadcast("incident", inc)

@app.on_event("startup")
async def boot(): await collector.start(on_event)

@app.websocket("/ws/live")
async def ws(w: WebSocket):
    await w.accept(); clients.add(w)
    try:
        while True: await w.receive_text()
    except WebSocketDisconnect: clients.discard(w)

@app.get("/api/stats")
def stats():
    with SessionLocal() as db:
        ev = db.query(EventRow).count(); inc = db.query(IncidentRow).all()
        crit = [i for i in inc if i.severity == "critical" and i.status == "open"]
        noise = [i for i in inc if i.verdict == "opportunistic"]
        return dict(raw_events=ev, incidents=len(inc), critical_open=len(crit), opportunistic=len(noise),
                    noise_suppressed_pct=round(100 * (1 - len(inc) / ev), 1) if ev else 0)

@app.get("/api/incidents")
def incidents():
    with SessionLocal() as db:
        order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        rows = sorted(db.query(IncidentRow).all(), key=lambda r: (order[r.severity], -r.score))
        return [dict(id=r.id, src_ip=r.src_ip, severity=r.severity, score=r.score, verdict=r.verdict, stage=r.stage,
                     status=r.status, last_seen=r.last_seen, real_asset_touched=r.real_asset_touched,
                     honeytoken_hit=r.honeytoken_hit, country=(r.body or {}).get("country")) for r in rows]

@app.get("/api/incidents/{iid}")
def incident(iid: str):
    with SessionLocal() as db:
        r = db.get(IncidentRow, iid)
        if not r: raise HTTPException(404)
        return r.body | {"status": r.status}

@app.post("/api/incidents/{iid}/actions/{aid}")
async def act(iid: str, aid: str, mode: str = "approve"):
    with SessionLocal() as db:
        r = db.get(IncidentRow, iid); body = dict(r.body)
        a = next(x for x in body["actions"] if x["id"] == aid)
        if a["type"] == "block_source":
            a["params"]["ip_raw"] = "\n".join(k for k, v in ALIAS.items() if v == r.src_ip) or r.src_ip
        a["result"] = execute(a, dry_run=(mode == "dry_run"))
        a["status"] = "dry_run" if mode == "dry_run" else "executed"
        if mode != "dry_run" and a["type"] == "block_source": r.status = "contained"; body["status"] = "contained"
        r.body = body; db.commit()
        await broadcast("incident", body | {"status": r.status})
        return a

@app.get("/api/incidents/{iid}/export/stix")
def stix_export(iid: str):
    with SessionLocal() as db: return JSONResponse(bundle(db.get(IncidentRow, iid).body))

@app.get("/api/incidents/{iid}/export/csv")
def csv_export(iid: str):
    with SessionLocal() as db: return PlainTextResponse(csv_iocs(db.get(IncidentRow, iid).body))

@app.get("/api/events")
def events(limit: int = 200):
    with SessionLocal() as db:
        rows = db.query(EventRow).order_by(EventRow.ts.desc()).limit(limit).all()
        return [r.data for r in rows]

@app.get("/api/export/ecs.ndjson")
def ecs_export():
    def ecs(e):
        return {"@timestamp": e["ts"], "source": {"ip": e["src_ip"]}, "event": {"action": e["action"], "outcome": e["outcome"],
                "category": e.get("category")}, "user": {"name": e.get("user")}, "process": {"command_line": e.get("cmd")},
                "file": {"hash": {"sha256": (e.get("file") or {}).get("sha256")}}, "host": {"name": e["sensor"]},
                "threat": {"technique": {"id": e.get("techniques", [])}}, "labels": {"zone": e["zone"], "flags": e.get("flags", [])}}
    with SessionLocal() as db:
        lines = "\n".join(json.dumps(ecs(r.data)) for r in db.query(EventRow).order_by(EventRow.ts).all())
    return PlainTextResponse(lines, media_type="application/x-ndjson")

@app.get("/api/attack-matrix")
def matrix():
    with SessionLocal() as db:
        hits = {}
        for r in db.query(IncidentRow).all():
            for t in (r.body or {}).get("techniques", []):
                h = hits.setdefault(t["id"], dict(t, count=0)); h["count"] += 1
        return list(hits.values())

@app.post("/api/demo/{scenario}")      # scenario: targeted | noise
def demo(scenario: str):
    if scenario not in ("targeted", "noise"): raise HTTPException(400)
    open("/sim_cmd/trigger.json", "w").write(json.dumps({"scenario": scenario, "id": uuid.uuid4().hex}))
    return {"ok": True}

@app.post("/api/demo/reset")
def reset():
    with SessionLocal() as db:
        db.query(EventRow).delete(); db.query(IncidentRow).delete(); db.commit()
    open("/shared/blocklist.txt", "w").close()
    return {"ok": True}
```
Gotchas worth knowing now:
- Route order: declare `/api/demo/reset` **before** `/api/demo/{scenario}` or FastAPI will treat "reset" as a scenario.
- The `ts >= cutoff` comparison is string-based; it works because all timestamps are ISO-8601 UTC with the same prefix format. Cowrie timestamps for old log lines on restart will be old; for demo, `reset` truncates DB and you should also truncate log files (`scripts/reset.sh`).
- Collector replays existing log files from offset 0 on API restart → duplicates. Clear logs in `reset.sh` or persist offsets (P2).
- Production events from **benign** internal IPs never create incidents (the `is_benign_prod` guard).
- Production events for the **attacker's IP** call `evaluate()` too, which is how the incident escalates to Critical live.

## 7. `scripts/reset.sh`
```bash
#!/usr/bin/env bash
docker compose exec -T api python - <<'EOF'
import glob, os
for p in glob.glob("/in/*/*"): pass  # logs are read-only mounts; truncate from writers instead
EOF
for s in cowrie portal tripwire opencanary prod-sim; do docker compose restart $s >/dev/null; done
curl -s -X POST localhost:8000/api/demo/reset
```
Simplest robust approach: `docker compose down -v && docker compose up -d` before each take (fresh volumes, 1–2 minutes). Keep that as your reset for recordings, and the API reset for quick re-runs.

## 8. Phase 2/3/5 exit checklist
- [ ] `curl localhost:8000/api/stats` returns counts rising as you poke honeypots
- [ ] `wscat -c ws://localhost:8000/ws/live` prints events live
- [ ] A scripted attack yields one `INC-203.0.113.50` with ≥6 techniques and a factor list
- [ ] Prod events for the attacker IP flip `real_asset_touched` and severity to critical
- [ ] Approve on `block_source` adds IPs to the blocklist and prod-sim drops retries
- [ ] STIX export validates (paste into https://oasis-open.github.io/cti-stix-visualization/ or `stix2` parse)
