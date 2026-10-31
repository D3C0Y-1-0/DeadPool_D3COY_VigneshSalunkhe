# 04 — Tech Stack & Research Notes

## 1. Selection principles
1. **Buildable in 24h** by a small team → prefer mature components over custom.
2. **Realism** → use real honeypot engines (judges can verify).
3. **Offline-capable** → demo must not depend on internet or paid APIs.
4. **Explainable** → rules over ML.
5. **One command to run** → Docker Compose.

## 2. Final stack

| Layer | Choice | Why | Alternative / fallback |
|---|---|---|---|
| SSH/Telnet honeypot | **Cowrie** (medium-interaction, emulated shell + fake FS, JSON logs) | Industry-standard, logs logins/commands/downloads/HASSH, easy Docker | Custom `asyncssh` honeypot (fallback if Cowrie config blocks you) |
| Multi-service decoys | **OpenCanary** (MySQL, FTP, HTTP, SMB… with JSON logs) | Many services, one config, login capture | Custom Python socket decoys |
| Web decoy | **Custom Flask "Customer Data Portal"** | Full control: login, fake download, honeytoken IDs, SQLi/path-traversal detection | Static OpenCanary HTTP skin |
| Prod simulation | **Python `prod-sim`** (TCP listeners + log generator) | Controllable firewall/auth logs, honeytoken verification | Real small sshd + nginx containers |
| Collector | **Python asyncio tailers** | Zero infra, ~100 lines | Filebeat/Vector → Redis |
| Backend/API | **FastAPI + SQLAlchemy + WebSockets** | Fast to write, typed, auto Swagger docs (nice for judges) | Node/Express |
| Database | **PostgreSQL 16** (JSONB for raw event data) | Robust, SQL for correlation queries | SQLite (fastest to start) |
| Engine | **Pure Python modules** (rules in YAML) | Explainable, hot-reloadable | — |
| Frontend | **React + Vite + TypeScript + Tailwind** | Fast, great ecosystem | — |
| UI libs | **shadcn/ui** or Radix, **Recharts**, **React Flow** (attack chain), **xterm.js** (replay), **react-simple-maps / d3-geo** (offline threat map), **lucide-react** icons, **framer-motion** | Polished with little effort | — |
| Threat intel | **STIX 2.1 (hand-built JSON or `stix2` lib)**, CSV, blocklist | Standard sharing format | MISP JSON |
| Geo/ASN | **GeoLite2 (if DB available)** else bundled static mapping for demo IPs | Offline | ip-api (online only) |
| Orchestration | **Docker Compose** | One-command demo | — |
| Notifications | **Discord/Slack webhook** (optional) | Visible real-time alert on a phone | Skip |
| Docs/diagrams | **Mermaid** | Version-controlled diagrams | draw.io |
| Simulator | **Python + Paramiko + sockets + PyMySQL (optional)** | Easy scripted attacks, human-like typing delays | — |

## 3. Research notes (what we learned & how it shaped the design)

### 3.1 Cowrie
- Emulates an SSH/Telnet server, logs brute-force attempts and the attacker's shell interaction, JSON log (`cowrie.json`).
- Useful event IDs: `cowrie.session.connect`, `cowrie.login.failed`, `cowrie.login.success`, `cowrie.command.input`, `cowrie.session.file_download`, `cowrie.session.file_upload`, `cowrie.client.version`, `cowrie.client.kex` (carries HASSH), `cowrie.session.closed`.
- Customizable fake filesystem (`honeyfs`) and command outputs (`txtcmds`) → we plant lure files (`/srv/backups/customer_data_2026.csv`, `~/notes.txt` with bait credentials).
- Accepts any/some credentials depending on config (`userdb.txt`) → we allow `root/root`, `admin/admin123` to simulate default creds.
- **Caveat:** outbound `wget/curl` from attacker are fetched by Cowrie from the real network unless egress is blocked → we run it in an **internal Docker network (no internet)**. The URL is still logged (an IOC), the fetch simply fails. This is both a safety control and a feature.
- **Design implication:** treat reads of "crown-jewel" lure paths (`cat`, `less`, `tar`, `base64`, `scp`) as the **Collection/Exfil signal**, because Cowrie's explicit download events cover attacker-initiated downloads *into* the honeypot. Our custom portal produces explicit **download-out** events with honeytoken IDs.

### 3.2 OpenCanary
- Python daemon with many modules (HTTP, FTP, MySQL, MSSQL, Telnet, SMB, Redis, VNC…), writes JSON event logs with numeric `logtype` codes (e.g., 8001 = MySQL login attempt, 2000 = FTP login attempt, 3001 = HTTP login attempt). **Verify codes against the version you install** (`opencanary/logger.py`).
- Port-scan detection relies on firewall (iptables) log rules and special privileges → **not required**. Our own "connect-burst" heuristic (≥N distinct ports from one IP in T seconds) generates the scan event.

### 3.3 MITRE ATT&CK (current state matters)
- ATT&CK v19 (Apr 2026) **deprecated Defense Evasion (TA0005)** and replaced it with two tactics (**Stealth** and **Impair Defenses**). Reports indicate **v20 (Oct 2026)** added AI-related techniques.
- **Decision:** the mapper loads `attack_map.yaml`; each entry has `technique_id`, `name`, `tactic`. Technique IDs like T1110.001 are stable; tactic labels are data. If unsure at demo time, tactic labels can be adjusted in one file. Add `attack_version` constant displayed in the UI footer.
- For the ATT&CK heatmap use a **reduced matrix** (only tactics/techniques we can observe) — more readable than the full 200+ technique grid.

### 3.4 Kill chain
- Use a **simplified 7-stage chain** for the progress bar: `Recon → Initial Access → Execution → Discovery → Credential/Collection → Exfiltration/Impact → Lateral/Persistence`. Map each ATT&CK tactic to one stage (table in file 07).

### 3.5 SIEM-style schema
- Use **ECS-lite** field naming (`@timestamp`, `source.ip`, `event.category`, `event.action`, `event.outcome`, `user.name`, `process.command_line`, `file.hash.sha256`) so output is ingestable by Elastic/Splunk (CIM-ish) later. We expose `GET /api/export/ecs.ndjson` → shows SIEM-readiness.

### 3.6 Deception best practices adopted
- Decoys must have **no legitimate use** → alert fidelity.
- Make decoys **believable** (hostnames, banners, plausible file names, realistic timestamps/ownership).
- **Honeytokens** are cheap and high-fidelity; plant in real systems.
- **Never** let decoys reach production (segmentation, egress control, hardened containers).
- Treat captured malware **as hostile** (never executed; stored hashed, in a no-exec volume).

## 4. Repo layout (monorepo)

```
mirage/
├─ docker-compose.yml
├─ honeypots/
│  ├─ cowrie/ (cowrie.cfg, userdb.txt, honeyfs/, txtcmds/)
│  ├─ portal/ (Flask app, Dockerfile)
│  └─ opencanary/ (Dockerfile, opencanary.conf)
├─ prod-sim/ (server.py, Dockerfile)
├─ backend/
│  ├─ app/ main.py, db.py, models.py, schemas.py
│  ├─ collector/ tail.py, parsers/{cowrie,opencanary,portal,prod}.py
│  ├─ engine/ sessionize.py, classify.py, attack_map.yaml, score.py, correlate.py, profile.py, respond.py, stix.py
│  ├─ api/ routes_*.py, ws.py
│  └─ Dockerfile, requirements.txt
├─ frontend/ (Vite React TS app)
├─ sim/ (attacker.py, noise.py, scenarios/, Dockerfile)
├─ docs/ (this pack, diagrams exported)
└─ scripts/ (seed_demo.py, reset.sh)
```

## 5. Dependency list

**backend/requirements.txt**
```
fastapi
uvicorn[standard]
sqlalchemy>=2
psycopg[binary]
pydantic>=2
pyyaml
python-dateutil
stix2          # optional, or hand-build JSON
geoip2         # optional
```
**frontend (npm):** `react react-dom react-router-dom @tanstack/react-query tailwindcss recharts reactflow xterm framer-motion lucide-react d3-geo topojson-client world-atlas`

**sim:** `paramiko requests pymysql`

## 6. Why not X?
| Rejected | Reason |
|---|---|
| Full T-Pot | Heavy (many containers, ELK), long setup, hard to customize in 24h |
| Elasticsearch/Kibana as the dashboard | Not "analyst-actionable"; no custom attack-chain UX; resource heavy |
| ML anomaly detection | Unreliable on tiny data; unexplainable |
| Kubernetes | Overkill |
| Real internet-exposed honeypot as demo | Unpredictable traffic, risk, unneeded; keep optional stretch |
