# SECTION 3 — Technical Approach (Slides 3.1 – 3.10)

---

## Slide 3.1 — System Architecture
**Title:** *SIEM-style pipeline, deception-native logic*

**On-slide content:** Four zones — Attacker · Deception · Production · SOC. Decoys share **no network** with production.

**Diagram**
```mermaid
flowchart LR
  subgraph ATT["Attacker zone - simulated"]
    A1["Targeted attacker sim"]
    A2["Noise botnet sim"]
  end
  subgraph DEC["Deception zone - internal, no egress"]
    H1["Cowrie SSH db-prod-02"]
    H2["Decoy customer portal"]
    H3["OpenCanary MySQL / FTP"]
    H4["Tripwire ports"]
  end
  subgraph PROD["Simulated production"]
    P1["prod-web-01"]
    P2["Firewall + auth logs"]
    P3["Honeytokens"]
  end
  subgraph SOC["SOC platform"]
    C["Collector"] --> N["Normalizer ECS-lite"]
    N --> DB[("PostgreSQL")]
    N --> E["Detection engine"]
    E --> R["Response engine"]
    DB --> API["FastAPI + WebSocket"]
    E --> API
    API --> UI["React dashboard"]
  end
  A1 --> H1
  A1 --> H2
  A1 --> H3
  A2 --> H1
  A1 -.-> P1
  H1 -- "read-only log volume" --> C
  H2 --> C
  H3 --> C
  H4 --> C
  P2 --> C
  R -- "blocklist" --> P2
```
**Speaker note:** "Logs flow one way. The only thing going back to production is an approved blocklist entry."

---

## Slide 3.2 — Data Pipeline
**Title:** *From raw log line to analyst decision in under a second*

**On-slide content:** Collect → Normalize → Enrich → Detect scan → Classify + ATT&CK → Correlate → Score → Incident → Push

**Diagram**
```mermaid
flowchart LR
  A["Raw log line"] --> B["Parser per source"]
  B --> C["NormalizedEvent ECS-lite"]
  C --> D["Enrich: geo, ASN, flags"]
  D --> E["Scan detector: 4 ports in 10 s"]
  E --> F["Classifier + ATT&CK mapper"]
  F --> G["Correlator: decoys + prod, same IP"]
  G --> H["Scoring + verdict"]
  H --> I["Incident upsert"]
  I --> J["WebSocket push"]
```
**Speaker note:** "One schema for every source — that's what makes it SIEM-compatible."

---

## Slide 3.3 — Technology Stack
**Title:** *Proven components, one-command deploy*

| Layer | Choice |
|---|---|
| SSH honeypot | **Cowrie** |
| Multi-service decoys | **OpenCanary**, custom Python tripwire |
| Web decoy | **Flask** (custom portal) |
| Backend | **FastAPI**, SQLAlchemy, WebSockets |
| Database | **PostgreSQL 16** (JSONB) |
| Rules | **YAML** ATT&CK map + pure-Python engine |
| Frontend | **React + Vite + TypeScript + Tailwind**, React Flow, Recharts, xterm.js |
| Intel formats | **STIX 2.1**, CSV, ECS NDJSON |
| Orchestration | **Docker Compose** |

**Diagram**
```mermaid
mindmap
  root((MIRAGE))
    Deception
      Cowrie
      OpenCanary
      Flask portal
      Tripwire
    Backend
      FastAPI
      PostgreSQL
      WebSockets
      YAML rules
    Frontend
      React + Vite
      React Flow
      Recharts
      xterm.js
    Intel
      STIX 2.1
      ECS
      MITRE ATT&CK
    Infra
      Docker Compose
      Internal networks
```
**Speaker note:** "We chose mature components so 24 hours go into integration and analytics, not reinventing honeypots."

---

## Slide 3.4 — Detection & Classification Engine
**Title:** *Explainable rules mapped to MITRE ATT&CK*

**On-slide content**
- Classes: scanning · brute force · initial access · exploitation · post-compromise · exfiltration · persistence · lateral movement
- YAML rules: action/outcome/command-regex/flags → technique IDs + kill-chain stage
- Tactic labels are config (ATT&CK v19 split Defense Evasion into Stealth / Impair Defenses)

**Diagram**
```mermaid
flowchart LR
  EV["Normalized event"] --> R{"YAML rules"}
  R -->|"failed auth"| T1["T1110.001 Password Guessing"]
  R -->|"login success"| T2["T1078.001 Default Accounts"]
  R -->|"ls / find"| T3["T1083 File and Directory Discovery"]
  R -->|"cat customer_data"| T4["T1005 Data from Local System"]
  R -->|"bait cred on prod"| T5["T1078 + T1021.004"]
  T1 --> K["Kill-chain stage"]
  T2 --> K
  T3 --> K
  T4 --> K
  T5 --> K
```
**Speaker note:** "Every event gets technique IDs and a stage — no black box."

---

## Slide 3.5 — Scoring & Prioritization
**Title:** *Every severity comes with a visible "why"*

| Severity | Score |
|---|---|
| Critical | ≥ 85 (or honeytoken / real-asset override) |
| High | 60–84 |
| Medium | 30–59 |
| Low | < 30 |

**Diagram — score composition**
```mermaid
flowchart LR
  B["Base: stage reached 10 to 90"] --> S["Score 0-100"]
  M1["+10 human cadence"] --> S
  M2["+10 multi-decoy"] --> S
  M3["+10 crown-jewel data"] --> S
  M4["+25 real asset touched"] --> S
  M5["+30 honeytoken used"] --> S
  N1["-15 wordlist-only"] --> S
  N2["-10 machine speed"] --> S
  N3["-10 drive-by"] --> S
  S --> V{"Override?"}
  V -->|"honeytoken or real asset"| C["CRITICAL"]
  V -->|"no"| L["Threshold: Low / Med / High / Crit"]
```
**Speaker note:** "Analysts trust what they can audit."

---

## Slide 3.6 — Correlation & Attacker Profiling
**Title:** *Linking decoys, production, and honeytokens*

**On-slide content:** Entity = source IP (+ HASSH/client fingerprint for campaigns). Profile: geo/ASN, tooling, cadence (human/scripted/bot), creds tried, targets touched, timeline.

**Diagram — ER view**
```mermaid
erDiagram
  ATTACKER ||--o{ SESSION : has
  SESSION ||--o{ EVENT : contains
  ATTACKER ||--o{ INCIDENT : drives
  INCIDENT ||--o{ TECHNIQUE_HIT : maps
  INCIDENT ||--o{ ACTION : recommends
  INCIDENT ||--o{ IOC : yields
  HONEYTOKEN ||--o{ EVENT : triggered_by
```
**Speaker note:** "Attacker is the entity; incident is the story."

---

## Slide 3.7 — Network Isolation & Containment
**Title:** *The honeypot can never be a pivot*

**On-slide content:** internal networks, no egress, hardened containers, one-way logs, human approval, allowlist.

**Diagram**
```mermaid
flowchart TB
  NET(("Internet - no route"))
  subgraph HOST["Dedicated lab host"]
    subgraph AN["attacker_net - internal"]
      DEC["Decoys"]
      SIM["Attacker sim"]
    end
    subgraph PN["prod_net - internal"]
      PR["prod-sim"]
    end
    subgraph MN["mgmt_net"]
      SOC["Collector, API, DB, dashboard"]
    end
    VOL[("Log volumes - read-only to SOC")]
  end
  NET -.- AN
  DEC -. "NO ROUTE" .- PR
  DEC -. "NO ROUTE" .- SOC
  SIM --> DEC
  SIM --> PR
  DEC --> VOL --> SOC
```
**Speaker note:** "We ship an isolation test script — all PASS lines go on this slide as evidence."

---

## Slide 3.8 — Live Dashboard Architecture
**Title:** *Real-time, analyst-first UI*

**Diagram — component map**
```mermaid
flowchart TB
  APP["App shell + WebSocket provider"] --> CC["Command Center"]
  APP --> INC["Incident: attack chain"]
  APP --> AT["Attacker profiles"]
  APP --> MX["ATT&CK matrix"]
  APP --> DM["Demo control"]
  CC --> K["KPI cards"]
  CC --> Q["Priority alert queue"]
  CC --> F["Live event feed"]
  CC --> M["Threat map"]
  INC --> CH["Kill-chain + React Flow graph"]
  INC --> TR["Transcript + replay"]
  INC --> RA["Real-asset panel"]
  INC --> AC["Approve / dry-run"]
```
**Speaker note:** "Build order: incident page first — it carries the whole story."

---

## Slide 3.9 — Deployment View
**Title:** *`docker compose up` — fully offline*

| Service | Network | Notes |
|---|---|---|
| cowrie, portal, tripwire, opencanary | attacker_net | hardened, no egress |
| prod-sim | prod_net | firewall/auth logs + blocklist enforcement |
| api + collector, db, web | mgmt_net | read-only log mounts |
| attacker-sim, noise-sim | attacker_net (+ prod_net for targeted) | triggered via one-way volume |

**Diagram**
```mermaid
flowchart LR
  U["User browser :5173"] --> W["web nginx"]
  W --> A["api :8000"]
  A --> D[("db")]
  A -. "trigger file" .-> S["attacker-sim"]
  S --> H["decoys"]
  S --> P["prod-sim"]
  H -- "logs" --> A
  P -- "logs" --> A
  A -- "blocklist" --> P
```
**Speaker note:** "Nothing needs the internet — safe for any venue Wi-Fi."

---

## Slide 3.10 — Threat Intel & Export
**Title:** *Close the intelligence loop*

**Diagram**
```mermaid
flowchart LR
  I["Incident"] --> S["STIX 2.1 bundle: indicators + attack-patterns"]
  I --> C["CSV IOCs"]
  I --> B["Blocklist / nft set"]
  I --> H["Hunt queries: Splunk SPL + KQL"]
  I --> E["ECS NDJSON to SIEM"]
  I --> W["Webhook: Slack / Discord"]
```
**Speaker note:** "Everything we capture can leave the system in a standard format."
