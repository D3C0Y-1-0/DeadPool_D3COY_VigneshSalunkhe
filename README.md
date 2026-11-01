<div align="center">

<br/>

```
████████╗██████╗  █████╗ ██████╗ ███╗   ██╗███████╗████████╗
╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗████╗  ██║██╔════╝╚══██╔══╝
   ██║   ██████╔╝███████║██████╔╝██╔██╗ ██║█████╗     ██║
   ██║   ██╔══██╗██╔══██║██╔═══╝ ██║╚██╗██║██╔══╝     ██║
   ██║   ██║  ██║██║  ██║██║     ██║ ╚████║███████╗   ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═══╝╚══════╝   ╚═╝
```

# TrapNet — Deception-Driven SOC Platform

**Every touch is a tell.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![MITRE ATT&CK](https://img.shields.io/badge/MITRE%20ATT%26CK-v19-red?style=flat-square)](https://attack.mitre.org)
[![STIX](https://img.shields.io/badge/STIX-2.1-green?style=flat-square)](https://oasis-open.github.io/cti-documentation/)
[![Docker](https://img.shields.io/badge/Docker-Compose%20v2-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![Tests](https://img.shields.io/badge/Tests-46%20passing-22c55e?style=flat-square)](./backend/tests)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

*Deception-Driven Threat Detection · MITRE ATT&CK Correlation · Human-Approved SOAR · Remote Endpoint Monitoring*

[Quick Start](#-quick-start) · [Architecture](#-architecture) · [Features](#-features) · [API Docs](#-api-reference) · [Demo Guide](#-demo-walkthrough) · [Endpoint Agent](#-remote-endpoint-agent)

---

</div>

## What Is TrapNet?

TrapNet is an open-source **Security Operations Center (SOC) platform** built on deception technology. It deploys a fabric of honeypots, honeytokens, and tripwires that capture attacker activity with near-zero false positives — because nothing legitimate ever touches a decoy.

Every interaction is normalized, correlated across deception and production zones, mapped to **MITRE ATT&CK v19**, scored with a transparent explainable factor model, and surfaced as a single unified incident on the SOC dashboard. Analysts get the complete kill chain, the attacker profile, and one-click response actions — not a pile of raw log lines.

**The problem it solves:**
> A typical SOC faces 4,000–10,000 alerts per day. Over 90% are noise. TrapNet turns honeypot data into a handful of high-confidence incidents with full attack context, so analysts ask *"how urgent?"* instead of *"is this real?"*

---

## ✨ Features

| Category | Capability |
|---|---|
| **Deception Fabric** | Cowrie SSH, Flask Web Portal, OpenCanary MySQL/FTP, TCP Tripwires, Honeytoken files |
| **Detection Engine** | MITRE ATT&CK v19 YAML rules, 10-stage kill-chain, scan detection, cadence profiling |
| **Correlation** | Cross-zone (deception ↔ production) IP correlation, honeytoken tripwire escalation |
| **Explainable Scoring** | 0–100 score with factor list; Targeted vs Opportunistic verdict |
| **Real-time Dashboard** | WebSocket live feed, KPI cards, threat map, attack graph, kill-chain bar |
| **SOAR** | Human-approved Dry-run → Approve workflow; blocklist enforcement |
| **Threat Intel** | STIX 2.1 bundle, CSV IOCs, ECS NDJSON export |
| **Remote Endpoints** | Python agent for Windows (EventLog) + Linux (journald/auth.log) |
| **Endpoint Correlation** | Honeypot-to-endpoint pivot detection; cross-network attacker tracking |
| **Safety** | Internal Docker networks, cap_drop ALL, no internet egress, synthetic data only |

---

## 🏗 Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TRAPNET PLATFORM ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────────────────┘

  THREAT ACTORS                 DECEPTION FABRIC              CORRELATION BRAIN
  ─────────────                 ────────────────              ─────────────────

  Internet /          ───►  ┌──────────────────┐
  Remote IPs                │  Cowrie SSH       │  cowrie_logs/
                            │  db-prod-02:2222  │──────────────┐
                            └──────────────────┘              │
                                                              │
                    ───►  ┌──────────────────┐  portal_logs/ │
                          │  Flask Web Portal │───────────────┤
                          │  :8080            │               │
                          └──────────────────┘               │    ┌──────────────────────┐
                                                              ├───►│  FastAPI Backend     │
                    ───►  ┌──────────────────┐  canary_logs/ │    │                      │
                          │  OpenCanary       │───────────────┤    │  • Collector/Parser  │
                          │  MySQL/FTP        │               │    │  • Normalizer (ECS)  │
                          └──────────────────┘               │    │  • Classifier (YAML) │
                                                              │    │  • Evaluator/Scorer  │
                    ───►  ┌──────────────────┐ tripwire_logs/│    │  • Correlator        │
                          │  Tripwire Ports   │───────────────┤    │  • SOAR Responder    │
                          │  2323,4445,3390.. │               │    └──────────┬───────────┘
                          └──────────────────┘               │               │
                                                              │    ┌──────────▼───────────┐
  Pivots ──────►  ┌──────────────────┐    prod_logs/         │    │  SQLite / PostgreSQL  │
  with stolen     │  Production Sim  │───────────────────────┘    │  • events             │
  credentials     │  prod-web-01     │                            │  • incidents          │
                  └──────────────────┘                            │  • endpoint_agents    │
                                                                  │  • audit_logs         │
  REMOTE ENDPOINTS                                                └──────────┬────────────┘
  ────────────────                                                           │
                                                                  ┌──────────▼────────────┐
  Windows 10/11  ──HTTPS──►  ┌──────────────┐                    │   React SOC Dashboard │
  Windows Server             │ Python Agent │──►/api/agents/events│                       │
                             │  (EventLog)  │                     │  • KPI Command Center │
                             └──────────────┘                     │  • Incident View      │
                                                                  │  • Attack Graph       │
  Ubuntu/Debian  ──HTTPS──►  ┌──────────────┐                    │  • ATT&CK Matrix      │
                             │ Python Agent │──►/api/agents/events│  • Threat Map         │
                             │  (journald)  │                     │  • Response Center    │
                             └──────────────┘  WebSocket          │  • Endpoint Monitor   │
                                               /ws/live  ────────►└───────────────────────┘
```

---

### Docker Network Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│  attacker_net  172.28.0.0/24   [internal: true — NO INTERNET EGRESS]   │
│                                                                          │
│   ┌─────────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────────┐  │
│   │ cowrie SSH  │  │ Flask Portal │  │ OpenCanary│  │  Tripwire    │  │
│   │ .10 :2222   │  │ .20 :8080    │  │ .30 MySQL │  │  .40 :2323+  │  │
│   └──────┬──────┘  └──────┬───────┘  └─────┬─────┘  └──────┬───────┘  │
└──────────┼────────────────┼────────────────┼───────────────┼───────────┘
           │  READ-ONLY LOG VOLUMES           │               │
           └──────────────────┬──────────────┘───────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────────────────┐
│  mgmt_net  [bridge — dashboard & API access only]                      │
│                                                                         │
│   ┌──────────────────────────┐    ┌──────────────────────────────────┐ │
│   │  FastAPI Backend :8000   │◄──►│  Next.js SOC Dashboard :3000     │ │
│   │  + SQLite / PostgreSQL   │    │  WebSocket /ws/live              │ │
│   └──────────────────────────┘    └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
           │  ONE-WAY sim_cmd volume
┌──────────▼──────────────────────────────────────────────────────────────┐
│  prod_net  172.29.0.0/24   [internal: true]                             │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │  prod-web-01 (simulated firewall/SSH/HTTP logs)  :22 :80         │  │
│   │  nftables blocklist enforcement when attack is contained          │  │
│   └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Detection & Scoring Pipeline

```
  Raw Log Line (honeypot / prod / endpoint agent)
          │
          ▼
  ┌───────────────────┐
  │  Parser / Tailer  │  source-specific: cowrie JSON, Flask JSON, auth.log, EventLog
  └────────┬──────────┘
           │  NormalizedEvent (ECS-lite schema)
           ▼
  ┌───────────────────┐
  │  Classifier       │  YAML rules → ATT&CK techniques, kill-chain stage, flags
  └────────┬──────────┘
           │  Enriched event
           ▼
  ┌───────────────────┐
  │  Correlator       │  group by source IP · 30-min window · cross-zone check
  └────────┬──────────┘
           │  Event pool per attacker
           ▼
  ┌───────────────────────────────────────────────────────────────────────┐
  │  Evaluator / Scorer                                                   │
  │                                                                        │
  │  score = Σ stage_base_points + Σ modifiers  (clamped 0–100)           │
  │                                                                        │
  │  Stage Base      Modifiers                                             │
  │  ───────────     ─────────────────────────────────────────────────    │
  │  recon     +10   human cadence         +10   wordlist only      −15   │
  │  cred_atk  +25   ≥2 decoys touched    +10   machine cadence    −10   │
  │  init_acc  +45   crown-jewel access   +10   drive-by <5s       −10   │
  │  execution +50   real asset touched   +25                             │
  │  discovery +60   honeytoken used      +30   CRITICAL OVERRIDE:        │
  │  collection+75   return visit          +5   honeytoken OR             │
  │  exfil     +85                              real-asset → always crit  │
  │  persist   +85                                                         │
  │  lat_move  +90   Verdict: targeted if targeted_pts ≥ 3 AND > noise   │
  │  impact    +80                                                         │
  └────────┬──────────────────────────────────────────────────────────────┘
           │  Incident JSON (score, severity, verdict, techniques, factors)
           ▼
  ┌───────────────────┐    ┌──────────────────────────────────────────────┐
  │  SOAR Responder   │    │  WebSocket Broadcast  /ws/live               │
  │  recommend actions│    │  {"kind":"incident", "data": {...}}          │
  └───────────────────┘    └──────────────────────────────────────────────┘
```

---

### Kill-Chain Stage Progression

```
  RECON → CRED ATTACK → INITIAL ACCESS → EXECUTION → DISCOVERY → COLLECTION → EXFILTRATION
    │                                                                               │
    │  Each step is a real captured event from a honeypot sensor                   │
    │  Every transition increases the incident score and may change severity       │
    │                                                                               │
    └── honeytoken hit OR production asset touched ──► CRITICAL OVERRIDE ──────────┘
```

---

### Endpoint Agent Architecture

```
  REMOTE ENDPOINT (Windows / Linux)
  ──────────────────────────────────────────────────────────────────────────────
                                                                                  
   ┌─────────────────────────────────────────────────────────────────────────┐   
   │                    mirage_agent (Python 3.11)                          │   
   │                                                                         │   
   │  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │   
   │  │  Collector       │  │  Normalizer       │  │  Local SQLite Queue  │  │   
   │  │                  │  │                  │  │                      │  │   
   │  │ Windows:         │  │  • EventID map   │  │  • Persist events    │  │   
   │  │  pywin32         │  │  • IP extraction │  │  • Cursor bookmark   │  │   
   │  │  EventLog 4624   │  │  • Redact secrets│  │  • Retry on failure  │  │   
   │  │  4625 4648 4672  │  │  • UUID stable   │  │  • Deduplication     │  │   
   │  │  4688 4720 4726  │  │    event IDs     │  │                      │  │   
   │  │                  │  └────────┬─────────┘  └──────────┬───────────┘  │   
   │  │ Linux:           │           │                        │              │   
   │  │  journalctl      │           └───────────────────────►│              │   
   │  │  auth.log        │                                     │              │   
   │  │  /var/log/secure │                                     │              │   
   │  └─────────────────┘                                     ▼              │   
   │                                                 ┌──────────────────┐   │   
   │                                                 │  API Client      │   │   
   │                                                 │  POST /api/agents│   │   
   │                                                 │  /events (batch) │   │   
   │                                                 │  + heartbeat     │   │   
   │                                                 │  + exponential   │   │   
   │                                                 │    backoff retry │   │   
   │                                                 └────────┬─────────┘   │   
   └──────────────────────────────────────────────────────────┼─────────────┘   
                                                              │ HTTPS / TLS
                                                              ▼
                                             TrapNet Central Backend :8000
```

---

## 🚀 Quick Start

### Option A — Local Development (Recommended for Demo)

**Requirements:** Python 3.11+, Node.js 20+, pnpm

**Terminal 1 — Backend:**
```powershell
# Windows
cd D3DCOY\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

$env:DATABASE_URL      = "sqlite:///mirage.db"
$env:MIRAGE_AGENT_ADMIN_TOKEN = "mirage_soc_admin_super_secret_token_2026_demo"
$env:SIM_CMD_DIR       = "C:\path\to\D3DCOY\sim"

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

```bash
# Linux / macOS
cd D3DCOY/backend
python3.11 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL="sqlite:///mirage.db"
export MIRAGE_AGENT_ADMIN_TOKEN="mirage_soc_admin_super_secret_token_2026_demo"
export SIM_CMD_DIR="../sim"

uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd D3DCOY/frontend
pnpm install          # or: npm install
pnpm dev              # starts on http://localhost:3000
```

**Verify both are running:**
```bash
curl http://localhost:8000/health   # → {"status":"ok","db":"connected"}
curl http://localhost:3000          # → HTML page
```

---

### Option B — Docker Compose (Full Stack)

```bash
cd D3DCOY
cp .env.example .env          # edit if needed
docker compose up -d --build
```

| Service | URL |
|---|---|
| SOC Dashboard | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |

---

## 📁 Project Structure

```
D3DCOY/
├── backend/                        # Python FastAPI backend
│   ├── app/
│   │   ├── main.py                 # App entry, WebSocket broadcast, event pipeline
│   │   ├── db.py                   # SQLAlchemy models (events, incidents, agents, …)
│   │   ├── schema.py               # Pydantic NormalizedEvent schema
│   │   ├── collector.py            # Async log tailers for all 5 sensors
│   │   ├── geo.py                  # GeoIP / ASN enrichment
│   │   ├── middleware.py           # Request size limiting
│   │   ├── api/
│   │   │   ├── agents.py           # Endpoint agent management + demo simulator
│   │   │   ├── incidents.py        # Incident CRUD + status update
│   │   │   ├── events.py           # Event query + filtering
│   │   │   ├── metrics.py          # Timeline, severity, sensor counts
│   │   │   ├── attackers.py        # Attacker profile aggregation
│   │   │   ├── techniques.py       # ATT&CK matrix endpoint
│   │   │   ├── actions.py          # SOAR action approve/reject
│   │   │   ├── exports.py          # STIX 2.1, CSV, ECS NDJSON
│   │   │   ├── demo.py             # Demo scenario triggers
│   │   │   └── health.py           # Health + sensor status
│   │   └── engine/
│   │       ├── classify.py         # YAML-driven ATT&CK classifier
│   │       ├── evaluate.py         # Scoring, cadence, verdict engine
│   │       ├── respond.py          # Action recommendation + execution
│   │       ├── endpoint_detector.py # Endpoint event correlation + pivot detection
│   │       ├── stix.py             # STIX 2.1 bundle builder
│   │       └── attack_map.yaml     # MITRE ATT&CK v19 rules + technique catalog
│   └── tests/                      # 46 passing unit + integration tests
│
├── frontend/                       # Next.js 16 + TypeScript + Tailwind v4
│   └── src/
│       ├── app/dashboard/          # Next.js App Router pages
│       ├── dashboard-pages/        # Full-page components
│       │   ├── CommandCenter.tsx   # Main SOC dashboard
│       │   ├── IncidentPage.tsx    # Single incident deep-dive
│       │   ├── Attackers.tsx       # Attacker profile view
│       │   ├── AttackMatrix.tsx    # MITRE ATT&CK heatmap
│       │   ├── LiveEvents.tsx      # Real-time event stream
│       │   ├── ResponseCenter.tsx  # SOAR action queue
│       │   ├── EndpointSecurity.tsx # Remote endpoint monitoring
│       │   ├── SiemSearch.tsx      # SIEM event search
│       │   ├── Reports.tsx         # IOC exports + reports
│       │   └── DemoConsole.tsx     # 1-click attack simulator
│       ├── components/             # Reusable UI widgets
│       │   ├── Shell.tsx           # App shell + sidebar + topbar
│       │   ├── KpiCards.tsx        # Metric cards with sparklines
│       │   ├── ThreatMap.tsx       # SVG world attack map
│       │   ├── IncidentAttackGraph.tsx  # React Flow kill-chain graph
│       │   ├── LiveRadarScan.tsx   # Animated radar visualization
│       │   └── …
│       ├── api.ts                  # All typed API client functions
│       ├── useLive.ts              # WebSocket + polling live state
│       └── types.ts                # TypeScript interfaces
│
├── endpoint-agent/                 # Python monitoring agent
│   └── mirage_agent/
│       ├── main.py                 # Agent entry point
│       ├── config.py               # Config loading + validation
│       ├── collectors/
│       │   ├── windows.py          # Windows Event Log (pywin32)
│       │   └── linux.py            # journald + auth.log
│       ├── normalizer.py           # Event normalization (shared schema)
│       ├── client.py               # HTTPS API client + retry
│       ├── queue.py                # SQLite local event queue
│       └── identity.py             # Device metadata / enrollment helper
│
├── honeypots/                      # Honeypot service configurations
├── prod-sim/                       # Simulated production environment
├── sim/                            # Attack simulator trigger files
├── scripts/                        # Utility + isolation test scripts
├── docker-compose.yml              # Full stack compose
├── docker-compose.dev.yml          # Development compose
└── .env.example                    # Environment variable template
```

---

## 🔌 API Reference

All endpoints are served at `http://localhost:8000`. Interactive docs at `/docs`.

### Core SOC APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Platform health check |
| `GET` | `/api/stats` | KPI summary (events, incidents, severity counts) |
| `GET` | `/api/events` | Paginated normalized events |
| `GET` | `/api/incidents` | Incident list with severity/status filters |
| `GET` | `/api/incidents/{id}` | Full incident detail (timeline, factors, transcript) |
| `PATCH` | `/api/v1/incidents/{id}/status` | Update incident status |
| `GET` | `/api/attack-matrix` | Observed MITRE ATT&CK techniques with hit counts |
| `GET` | `/api/v1/metrics/timeline` | Event counts per time bucket (chart data) |
| `GET` | `/api/v1/metrics/severity` | Incident count by severity level |
| `GET` | `/api/v1/health/sensors` | Live sensor fleet status |
| `GET` | `/api/v1/attackers` | Aggregated attacker profiles |

### SOAR & Response

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/incidents/{id}/actions/{aid}?mode=dry_run` | Preview action impact |
| `POST` | `/api/incidents/{id}/actions/{aid}?mode=approve` | Execute containment action |
| `GET` | `/api/v1/actions` | All recommended / executed actions |
| `POST` | `/api/v1/actions/{id}/approve` | Approve action |
| `POST` | `/api/v1/actions/{id}/reject` | Reject action |

### Threat Intelligence Exports

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/incidents/{id}/export/stix` | STIX 2.1 JSON bundle |
| `GET` | `/api/incidents/{id}/export/csv` | CSV IOC list |
| `GET` | `/api/export/ecs.ndjson` | All events in ECS NDJSON format |
| `GET` | `/api/v1/exports/iocs` | All IOCs (IPs + file hashes) |

### Demo Control

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/demo/targeted` | Launch full APT kill-chain simulation |
| `POST` | `/api/demo/noise` | Launch opportunistic scanner simulation |
| `POST` | `/api/demo/reset` | Clear all events, incidents, and blocklist |

### Endpoint Agent APIs

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/agents/register` | Enroll a new remote endpoint |
| `POST` | `/api/agents/heartbeat` | Agent heartbeat (bearer auth) |
| `POST` | `/api/agents/events` | Ingest endpoint security events (bearer auth) |
| `GET` | `/api/agents` | List all enrolled agents |
| `GET` | `/api/agents/{id}` | Agent detail |
| `GET` | `/api/agents/summary` | Fleet overview KPIs |
| `GET` | `/api/agents/events` | All endpoint events (filterable) |
| `POST` | `/api/agents/{id}/revoke` | Revoke agent credential |
| `POST` | `/api/agents/{id}/rotate` | Rotate agent credential |
| `POST` | `/api/agents/demo/simulate` | Trigger scenario (windows_brute_force / linux_account_creation / honeypot_pivot) |

### WebSocket

```
ws://localhost:8000/ws/live
```

Broadcasts real-time messages in the format:
```json
{ "kind": "event" | "incident" | "endpoint:event" | "endpoint:status", "data": { ... } }
```

---

## 🗄 Database Schema

```
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  events              │     │  incidents            │     │  endpoint_agents     │
│──────────────────────│     │──────────────────────│     │──────────────────────│
│  id (PK)             │     │  id (PK)              │     │  id (PK)             │
│  event_id            │     │  src_ip               │     │  hostname            │
│  ts                  │     │  first_seen           │     │  operating_system    │
│  source              │     │  last_seen            │     │  os_version          │
│  sensor              │     │  score (0-100)        │     │  agent_version       │
│  zone                │     │  severity             │     │  token_hash (SHA256) │
│  src_ip              │     │  verdict              │     │  status              │
│  action              │     │  stage                │     │  registered_at       │
│  outcome             │     │  status               │     │  last_heartbeat      │
│  dst_service         │     │  real_asset_touched   │     │  last_event_at       │
│  dst_port            │     │  honeytoken_hit       │     └──────────────────────┘
│  user                │     │  body (full JSON)     │
│  cmd                 │     └──────────────────────┘     ┌──────────────────────┐
│  data (full JSON)    │                                   │ endpoint_security_   │
└──────────────────────┘     ┌──────────────────────┐     │ events               │
                             │  actions             │     │──────────────────────│
┌──────────────────────┐     │──────────────────────│     │  id (PK)             │
│  attackers           │     │  id (PK)             │     │  event_id            │
│──────────────────────│     │  incident_id (FK)    │     │  agent_id (FK)       │
│  id (PK)             │     │  type                │     │  timestamp           │
│  source_ip (unique)  │     │  status              │     │  source              │
│  first_seen          │     │  params              │     │  event_type          │
│  last_seen           │     │  result              │     │  severity            │
│  risk_level          │     └──────────────────────┘     │  message             │
└──────────────────────┘                                   │  source_ip           │
                             ┌──────────────────────┐     │  raw_event           │
                             │  audit_logs          │     └──────────────────────┘
                             │──────────────────────│
                             │  actor               │
                             │  action              │
                             │  target              │
                             │  before/after_state  │
                             └──────────────────────┘
```

---

## 🎬 Demo Walkthrough

This is the exact sequence to use in front of judges or stakeholders. **Total time: ~4 minutes.**

---

### Step 0 — Reset to clean state

Open your browser to **http://localhost:3000/dashboard**

Click **Demo** (top right) → **Reset All Data**

> Dashboard shows: `0 Events · 0 Incidents`

---

### Step 1 — Launch the Targeted APT Attack

Click **Demo** → **Launch Targeted APT Attack** (or navigate to **Demo Console** in sidebar)

> Watch the live feed light up in real time:

```
Live Event Stream:
─────────────────────────────────────────────────────────────────────
  connect   scan-detector    192.168.1.100    multi_sensor_scan
  auth      db-prod-02       192.168.1.100    FAILURE  root:root
  auth      db-prod-02       192.168.1.100    FAILURE  admin:admin
  auth      db-prod-02       192.168.1.100    SUCCESS  root:password  ← initial_access
  command   db-prod-02       192.168.1.100    whoami
  command   db-prod-02       192.168.1.100    ls /srv/backups/
  command   db-prod-02       192.168.1.100    cat notes.txt
  download  db-prod-02       192.168.1.100    customer_data_2026.csv  ← HT-CUST-001 TRIGGER!
  firewall  prod-web-01      192.168.1.100    ssh svc_backup@prod      ← REAL ASSET TOUCHED!
─────────────────────────────────────────────────────────────────────
```

---

### Step 2 — Watch the Incident Appear (CRITICAL)

Within 3–5 seconds the **Command Center** shows:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔴 CRITICAL · Score: 100/100 · Targeted                        │
│  INC-192.168.1.100                                              │
│  Stage: LATERAL_MOVEMENT                                        │
│  ⚠  Real Asset Touched  ⚠  Honeytoken Hit                      │
└─────────────────────────────────────────────────────────────────┘
```

**What to say to judges:**
> *"Because a honeypot has no legitimate users, any interaction is hostile by definition — near-zero false positives. The engine saw 8 separate events, correlated them to one IP, mapped each action to MITRE ATT&CK, computed a score of 100 because the attacker used a planted honeytoken credential on a real production server — that's confirmed lateral movement. No tuning required."*

---

### Step 3 — Open the Incident Deep-Dive

Click the incident → **Incidents** sidebar → click **INC-192.168.1.100**

Point out each section:

| Section | What to say |
|---|---|
| **Kill-chain bar** | *"Every stage is a real event — Recon → Credential Attack → Initial Access → Execution → Collection → Lateral Movement"* |
| **Score factors** | *"+45 initial access, +90 lateral movement, +30 honeytoken, +25 real asset — fully explainable, no black box"* |
| **Narrative** | *"Auto-generated summary any Tier-1 analyst can hand to management in 30 seconds"* |
| **SSH Transcript** | *"Every command the attacker typed, timestamped"* |
| **Techniques tab** | *"T1110.001 Password Guessing, T1078.001 Default Accounts, T1041 Exfiltration — mapped to ATT&CK v19 automatically"* |
| **Actions tab** | *"Recommended: Block Source, Isolate Host, Rotate Credentials — none execute without analyst approval"* |

---

### Step 4 — Execute Dry-Run then Approve

In the **Actions** tab:

1. Click **Dry Run** on "Block Source IP"
   > Shows: `nftables drop rule for 192.168.1.100 — no changes applied yet`

2. Click **Approve & Execute**
   > Incident status changes from **OPEN** → **CONTAINED**
   > Dashboard critical count drops by 1

**What to say:**
> *"The dry-run shows exactly what will happen before anything touches production. Once approved, the blocklist file is atomically updated. The production firewall reads it and drops the attacker. No automation without human sign-off."*

---

### Step 5 — Export Threat Intelligence

Click **Export STIX 2.1** — show the JSON bundle:

```json
{
  "type": "bundle",
  "spec_version": "2.1",
  "objects": [
    { "type": "indicator", "pattern": "[ipv4-addr:value = '192.168.1.100']" },
    { "type": "attack-pattern", "name": "Password Guessing", "external_references": [...] }
  ]
}
```

**What to say:**
> *"One click produces a STIX 2.1 bundle that can be ingested by any commercial SIEM, threat sharing platform, or ISAC feed."*

---

### Step 6 — Remote Endpoint Monitoring

Navigate to **Endpoint Monitoring** in the sidebar.

Click **Simulate Windows 4625** (Windows brute-force):

> Shows in fleet table: `CORP-W11-FINANCE — Windows Event 4625 × 4 — HIGH alert triggered`

Click **Trigger Deception Pivot**:

> Shows: `CRITICAL PIVOT: Decoy attacker 192.168.1.100 targeting LAPTOP-SEC-DEV`
> This incident appears in the main Incidents list — **bridging deception and real endpoints**

**What to say:**
> *"Most deception tools stop at the honeypot boundary. TrapNet correlates honeypot attacker IPs against real Windows and Linux endpoint OS logs. The same IP that touched our SSH decoy just tried to brute-force a real corporate laptop — confirmed campaign, confirmed target. No other open-source tool does this cross-correlation out of the box."*

---

### Step 7 — MITRE ATT&CK Heatmap

Navigate to **MITRE ATT&CK** → show the populated matrix:

> Techniques lit up: T1046, T1110.001, T1078.001, T1059.004, T1083, T1005, T1041, T1021, T1136.001

**What to say:**
> *"Every technique was detected from real honeypot interactions, not simulated labels. This is our coverage map — what we caught, what stage of the kill chain, how many times."*

---

## 🖥 Remote Endpoint Agent

Install and run the lightweight Python agent on any authorized machine.

### Prerequisites

```bash
Python 3.11+
# Windows only:
pip install pywin32>=306
```

### Install

```powershell
# Windows
cd D3DCOY\endpoint-agent
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

```bash
# Linux
cd D3DCOY/endpoint-agent
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### Enroll an Endpoint (Admin Step)

```bash
# 1. Print this machine's metadata
python -m mirage_agent.main --identity

# Output:
# {
#   "hostname": "CORP-LAPTOP-01",
#   "operatingSystem": "Windows",
#   "osVersion": "Windows 11 Enterprise (Build 22631)",
#   ...
# }
```

```bash
# 2. Register it via the backend API
curl -X POST http://localhost:8000/api/agents/register \
  -H "Content-Type: application/json" \
  -H "X-MIRAGE-Admin-Token: mirage_soc_admin_super_secret_token_2026_demo" \
  -d '{"hostname":"CORP-LAPTOP-01","operatingSystem":"Windows","osVersion":"Windows 11 Enterprise","agentVersion":"1.2.0"}'

# Response includes a one-time credential:
# { "agentId": "abc123...", "credential": "eyJhbGc..." }
```

### Configure and Run

```bash
# Create config file
cp config.example.json mirage-agent.json

# Set credential via environment variable (do not write to disk)
export MIRAGE_AGENT_CREDENTIAL="<credential from registration>"   # Linux
$env:MIRAGE_AGENT_CREDENTIAL = "<credential from registration>"   # Windows

# Run agent
python -m mirage_agent.main --config mirage-agent.json
```

**Config example (`mirage-agent.json`):**
```json
{
  "backend_url": "http://localhost:8000",
  "queue_path": "state/mirage-agent.sqlite",
  "poll_interval_seconds": 15,
  "heartbeat_interval_seconds": 60,
  "batch_size": 100,
  "request_timeout_seconds": 15
}
```

### What the Agent Collects

**Windows (EventLog):**

| Event ID | Event Type | Severity |
|---|---|---|
| 4624 | Successful logon | Info |
| 4625 | Failed logon | Medium |
| 4634 | Logoff | Info |
| 4648 | Explicit credential use | Medium |
| 4672 | Special privileges assigned | High |
| 4688 | Process creation | Low |
| 4720 | User account created | High |
| 4726 | User account deleted | Medium |

**Linux (journald / auth.log):**

| Pattern | Event Type | Severity |
|---|---|---|
| SSH failed auth | `ssh_login_failed` | Medium |
| SSH successful auth | `ssh_login_success` | High |
| sudo / su elevation | `privileged_command` | Medium |

### Agent Reliability Features

- **Local SQLite queue** — events survive network outages
- **Cursor persistence** — never re-sends events after restart
- **Exponential backoff** — 1s → 2s → 4s → … → 30s max retry
- **Deduplication** — server rejects duplicate `event_id`
- **Heartbeat** — every 60s; dashboard shows online/offline within 5 min
- **Graceful shutdown** — pending queue preserved on SIGINT/SIGTERM

---

## 🔒 Security & Safety

### Containment Architecture

| Requirement | Implementation |
|---|---|
| No internet egress from decoys | Docker networks with `internal: true` |
| No decoy ↔ production routing | Separate `attacker_net` / `prod_net` / `mgmt_net` |
| Container hardening | `cap_drop: [ALL]` · `no-new-privileges: true` · mem 256MB · pids 128 |
| No command execution | Log files are read-only mounts; no exec/eval on attacker input |
| Synthetic data only | All lure files use RFC-reserved domains and fake credentials |
| Input sanitization | JSON parsing with strict bounds; regex bounded; parameterized DB queries |
| Production actions require approval | Dry-run always available; no auto-execute on production |
| Agent read-only collection | Agent has no remote shell, no command execution channel |
| Credential storage | Agent tokens stored as SHA-256 hashes only; never logged |

### Secrets

- Never commit `.env` — use `.env.example` as template
- Agent credential lives only in the service manager protected environment (`MIRAGE_AGENT_CREDENTIAL`)
- Admin token must be ≥16 characters; configure via `MIRAGE_AGENT_ADMIN_TOKEN`

---

## 🧪 Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

**Coverage breakdown:**

| Module | Tests | Notes |
|---|---|---|
| `test_classify.py` | 12 | ATT&CK classification, YAML integrity |
| `test_evaluate.py` | 8 | Scoring model, severity thresholds, cadence |
| `test_respond.py` | 6 | Action recommendation, blocklist enforcement |
| `test_parsers.py` | 7 | Cowrie, portal, OpenCanary, tripwire, prod parsers |
| `test_api.py` | 8 | Stats, events, incidents, matrix endpoints |
| `test_agents_api.py` | 5 | Agent registration, heartbeat, event ingestion |

---

## 🌐 Network Requirements

| Component | Requires | Used For |
|---|---|---|
| Backend (:8000) | Inbound TCP 8000 | API + WebSocket |
| Frontend (:3000) | Inbound TCP 3000 | Dashboard |
| Endpoint agent | **Outbound** HTTPS to backend only | Log upload |
| Honeypots | None (internal Docker) | Isolated from internet |

> Remote endpoint agents only need outbound HTTPS access to the TrapNet backend. No inbound ports are required on monitored endpoints.

---

## 🛣 Roadmap

- [ ] **Adaptive Decoys** — Automatically deploy a decoy matching what the attacker scanned for
- [ ] **Campaign Clustering** — Group IPs by HASSH + SSH client + command fingerprint
- [ ] **SIEM Export** — Direct Elastic HEC / Splunk HTTP Event Collector integration
- [ ] **SOAR Playbooks** — Cortex XSOAR / Shuffle workflow integration
- [ ] **Threat Feed Ingestion** — ThreatFox / AbuseIPDB auto-enrichment
- [ ] **Windows Service / systemd** — Auto-start endpoint agent as a managed OS service
- [ ] **Multi-tenant** — Organization-scoped agent isolation for MSSP use

---

## 🏆 Competitive Positioning

| Tool | Open Source | Kill-chain view | Explainable score | Prod correlation | Endpoint agents | SOAR |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **TrapNet** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Thinkst Canary | ❌ (paid $7.5k+/yr) | ❌ | ❌ | ❌ | ❌ | ❌ |
| T-Pot / Cowrie | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Attivo (SentinelOne) | ❌ (enterprise) | ✅ | ❌ | ✅ | ✅ | ✅ |
| OpenCanary | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Wazuh + Honeypot | ✅ | partial | ❌ | partial | ✅ | partial |

**TrapNet is the only free, open-source, single `git clone` platform that covers all six.**

---

## 📄 License

MIT License — see [LICENSE](./LICENSE)

---

<div align="center">

**TrapNet** · *Every touch is a tell.*

Built for PS 04 — Deception-Driven Threat Detection & Response

</div>
