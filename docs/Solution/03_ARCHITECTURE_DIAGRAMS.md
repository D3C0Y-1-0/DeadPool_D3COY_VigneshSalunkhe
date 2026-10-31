# 03 — Architecture & Diagrams

> All diagrams are Mermaid. Render in GitHub, VS Code (Markdown Preview Mermaid), https://mermaid.live → export PNG/SVG for slides.

## 1. High-level system architecture

```mermaid
flowchart LR
  subgraph ATT["Attacker Zone - simulated, isolated"]
    A1["Attacker Simulator"]
    A2["Noise Botnet Simulator"]
  end

  subgraph DEC["Deception Zone - attacker_net, internal, egress denied"]
    H1["Cowrie SSH Honeypot - db-prod-02"]
    H2["Decoy Customer Portal - Flask"]
    H3["OpenCanary - MySQL / FTP"]
  end

  subgraph PROD["Simulated Production - prod_net"]
    P1["prod-web-01 - sshd + web"]
    P2["Firewall and Auth log generator"]
    P3["Honeytokens - fake creds and files"]
  end

  subgraph SOC["SOC Platform - mgmt_net"]
    C1["Collector - log tailers"]
    N1["Normalizer - ECS-lite schema"]
    DB[("PostgreSQL")]
    E1["Detection Engine - classify, ATT&CK, score, correlate"]
    R1["Response Engine - recommend, approve, IOC export"]
    API["FastAPI + WebSocket"]
    UI["React SOC Dashboard"]
  end

  A1 --> H1
  A1 --> H2
  A1 --> H3
  A2 --> H1
  A1 -.->|"lateral attempt"| P1
  H1 -- "JSON logs, read-only mount" --> C1
  H2 -- "logs" --> C1
  H3 -- "logs" --> C1
  P2 -- "firewall and auth logs" --> C1
  P3 -. "token use events" .-> C1
  C1 --> N1 --> DB
  N1 --> E1
  E1 --> DB
  E1 --> R1
  DB --> API
  E1 --> API
  R1 --> API
  API <--> UI
  R1 -- "blocklist file" --> P2
```

## 2. Network isolation topology (the safety story)

```mermaid
flowchart TB
  INTERNET(("Internet - blocked in demo"))
  subgraph HOST["Dedicated lab host or VM"]
    subgraph AN["attacker_net - internal true"]
      ATK["attacker-sim"]
      HP["cowrie / portal / opencanary"]
    end
    subgraph PN["prod_net - internal true"]
      PRODSIM["prod-sim"]
    end
    subgraph MN["mgmt_net"]
      COL["collector"]
      APIX["api + db"]
      WEB["dashboard"]
    end
    VOL[("shared log volumes - honeypot writes, collector reads read-only")]
  end
  INTERNET -. "no route" .- AN
  HP -. "NO route" .- PN
  ATK --> HP
  ATK --> PRODSIM
  HP --> VOL --> COL
  PRODSIM --> VOL
  COL --> APIX --> WEB
```
Key: **honeypots share no network with prod or mgmt**. Only a one-way log volume leaves the deception zone.

## 3. Event data-flow pipeline

```mermaid
flowchart LR
  RAW["Raw log line"] --> PARSE["Source-specific parser"]
  PARSE --> NORM["Normalized Event - ECS-lite"]
  NORM --> ENR["Enrich: GeoIP, ASN, known-scanner flag, wordlist match"]
  ENR --> SESS["Session builder"]
  SESS --> CLS["Classifier: scan, brute force, exploit, post-compromise"]
  CLS --> MAP["ATT&CK mapper + kill-chain stage"]
  MAP --> COR["Correlator: prod telemetry, honeytokens, campaigns"]
  COR --> SCORE["Explainable scoring + verdict"]
  SCORE --> INC["Incident upsert"]
  INC --> RESP["Recommendations and IOCs"]
  INC --> WS["WebSocket push to dashboard"]
```

## 4. The demo attack — sequence diagram

```mermaid
sequenceDiagram
  autonumber
  participant ATK as Attacker 203.0.113.50
  participant NET as Deception Fabric
  participant COL as Collector
  participant ENG as Detection Engine
  participant UI as SOC Dashboard
  participant PRD as prod-sim

  ATK->>NET: Port scan 22, 80, 3306, 21
  NET->>COL: connect events
  COL->>ENG: normalized events
  ENG->>UI: Low alert - Recon
  ATK->>NET: MySQL login root/root, then SSH root/toor
  NET->>COL: auth failed, auth success
  ENG->>UI: Severity raised to High - T1110, T1078.001
  ATK->>NET: ls, cat notes.txt, cat /srv/backups/customer_data.csv
  NET->>COL: command events
  ENG->>UI: Discovery, Collection - T1083, T1005
  ATK->>PRD: SSH attempt with svc_backup creds found in decoy
  PRD->>COL: auth + firewall events, honeytoken hit
  ENG->>ENG: Correlate src IP, real asset touched
  ENG->>UI: CRITICAL - confirmed lateral movement attempt
  UI->>ENG: Analyst clicks Approve block
  ENG->>PRD: Update blocklist
  ATK->>PRD: Retry
  PRD-->>ATK: Connection dropped
  PRD->>COL: blocked event
  ENG->>UI: Incident status Contained
```

## 5. Attack-chain model (how events become an incident)

```mermaid
flowchart TD
  E1["Event: connect"] --> S["Session"]
  E2["Event: auth"] --> S
  E3["Event: command"] --> S
  E4["Event: file download"] --> S
  S --> A["Attacker entity - by src IP + fingerprint"]
  S2["Session on other decoy"] --> A
  PE["Prod event same IP"] --> A
  A --> I["Incident - one attack chain"]
  I --> AL["Alert with severity"]
  I --> TL["Timeline + ATT&CK + IOCs"]
  I --> AC["Recommended actions"]
```

## 6. Database ER diagram

```mermaid
erDiagram
  ATTACKER ||--o{ SESSION : has
  ATTACKER ||--o{ INCIDENT : involved_in
  SESSION ||--o{ EVENT : contains
  INCIDENT ||--o{ INCIDENT_EVENT : groups
  EVENT ||--o{ INCIDENT_EVENT : in
  INCIDENT ||--o{ TECHNIQUE_HIT : maps
  INCIDENT ||--o{ ACTION : recommends
  INCIDENT ||--o{ IOC : yields
  HONEYTOKEN ||--o{ EVENT : triggered_by
  ATTACKER {
    string id PK
    string src_ip
    string asn
    string country
    string hassh
    string ssh_client
    string campaign_id
    string verdict
  }
  SESSION {
    string id PK
    string attacker_id FK
    string sensor
    datetime start
    datetime end
    float median_gap
    string cadence
  }
  EVENT {
    string id PK
    string session_id FK
    datetime ts
    string source
    string category
    string action
    string outcome
    json data
  }
  INCIDENT {
    string id PK
    string attacker_id FK
    int score
    string severity
    string stage
    bool real_asset_touched
    string status
    json score_factors
  }
  TECHNIQUE_HIT {
    string incident_id FK
    string technique_id
    string tactic
    datetime first_seen
  }
  ACTION {
    string id PK
    string incident_id FK
    string type
    string status
    string approved_by
  }
  IOC {
    string id PK
    string incident_id FK
    string type
    string value
  }
  HONEYTOKEN {
    string id PK
    string kind
    string value
    string planted_at
  }
```

## 7. Dashboard component map

```mermaid
flowchart TB
  APP["App Shell + Router + WS provider"]
  APP --> CC["Command Center"]
  APP --> INC["Incident - Attack Chain"]
  APP --> ATKP["Attacker Profiles"]
  APP --> MAT["ATT&CK Matrix"]
  APP --> DEC["Deception Assets"]
  APP --> RSP["Response and IOC"]
  APP --> DEMO["Demo Control Drawer"]
  CC --> K["KPI cards"]
  CC --> F["Live event feed"]
  CC --> M["Threat map"]
  CC --> Q["Prioritized alert queue"]
  INC --> CH["Kill-chain bar + React Flow chain"]
  INC --> TR["Terminal transcript + replay"]
  INC --> RA["Real-asset panel"]
  INC --> AR["Action panel - approve"]
```

## 8. Deployment view (compose services)

| Service | Image/Build | Network(s) | Ports (host) |
|---|---|---|---|
| cowrie | `cowrie/cowrie` | attacker_net | internal 2222 |
| portal | build `./honeypots/portal` | attacker_net | internal 8080 |
| opencanary | build `./honeypots/opencanary` | attacker_net | internal 3306, 21 |
| prod-sim | build `./prod-sim` | prod_net | internal |
| collector+api | build `./backend` | mgmt_net (+ read-only log vols) | 8000 |
| db | `postgres:16` | mgmt_net | internal |
| web | build `./frontend` | mgmt_net | 5173 |
| attacker-sim | build `./sim` | attacker_net + prod_net only (**never mgmt_net**) | none. Triggered by a one-way `sim_cmd` volume: API writes a JSON file, sim reads it (read-only mount) |
