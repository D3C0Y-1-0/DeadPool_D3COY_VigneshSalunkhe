# SECTION 4 — Feasibility & Viability (Slides 4.1 – 4.7)

---

## Slide 4.1 — Why It's Feasible in 24 Hours
**Title:** *Mature parts, thin glue*

**On-slide content**
- Honeypots: **reuse** Cowrie + OpenCanary, **custom only** where we need control (portal, tripwire, prod-sim)
- Logic: pure Python rules + YAML — **no ML training, no data collection**
- UI: React + off-the-shelf libraries (React Flow, Recharts)
- Run: one `docker compose up`, **fully offline**

**Diagram — build vs. reuse**
```mermaid
flowchart LR
  subgraph REUSE["Reuse - hours saved"]
    R1["Cowrie"]
    R2["OpenCanary"]
    R3["PostgreSQL"]
    R4["React Flow / Recharts"]
  end
  subgraph BUILD["Build - our value"]
    B1["Normalizer + collector"]
    B2["Rule engine + scoring"]
    B3["Correlation + honeytokens"]
    B4["Incident UI + response"]
  end
  REUSE --> BUILD --> PRODUCT["MIRAGE"]
```
**Speaker note:** "We spent our hours on the part nobody else gives you: the analyst's decision."

---

## Slide 4.2 — 24-Hour Execution Plan
**Title:** *Phased, priority-first, with a code freeze*

**Diagram — Gantt**
```mermaid
gantt
  title 24-hour plan (P0 must, P1 should, P2 wow)
  dateFormat YYYY-MM-DD HH:mm
  axisFormat %H:%M
  section Phase 0-1 Infra (P0)
  Kickoff, schema freeze       :a0, 2026-01-01 00:00, 1h
  Honeypots + lures + compose  :a1, 2026-01-01 01:00, 4h
  section Phase 2-3 Pipeline + engine (P0)
  Collector, normalizer, API   :b1, 2026-01-01 03:00, 5h
  Classify, ATT&CK, scoring    :b2, 2026-01-01 07:00, 5h
  section Phase 4 Dashboard (P0)
  Command Center + Incident UI :c1, 2026-01-01 06:00, 10h
  section Phase 5-6 Correlation, response, sim (P1)
  Prod telemetry, honeytokens  :d1, 2026-01-01 12:00, 6h
  Simulator + demo control     :d2, 2026-01-01 10:00, 9h
  section Phase 7-8 Deliverables
  Docs, PPT, video             :e1, 2026-01-01 17:00, 6h
  Freeze at H21, rehearse      :crit, e2, 2026-01-01 21:00, 3h
```
**Speaker note:** "Code freeze at hour 21; the last three hours are for rehearsal, not features."

---

## Slide 4.3 — Team & Roles
**Title:** *Four roles, parallel work*

| Role | Owns |
|---|---|
| Deception / Infra | Compose, honeypots, prod-sim, isolation, simulator |
| Backend / Pipeline | Collector, normalizer, DB, API, WebSocket |
| Security / Detection | Rules, ATT&CK map, scoring, correlation, IOC/STIX, docs |
| Frontend / Story | Dashboard, polish, PPT, video, pitch |

**Diagram**
```mermaid
flowchart LR
  I["Infra"] -->|"log formats"| B["Backend"]
  B -->|"event + incident JSON contract"| F["Frontend"]
  S["Detection"] -->|"engine functions"| B
  F -->|"UI needs"| S
  I -->|"simulator"| T["Demo + pitch"]
  F --> T
```
**Speaker note:** "The event schema was frozen in hour 0, so teams never block each other."

---

## Slide 4.4 — Technical Risks & Mitigations
**Title:** *We planned for failure*

| Risk | Mitigation |
|---|---|
| Cowrie fake-FS config slow | Time-box 75 min; custom asyncssh fallback (same log shape) |
| OpenCanary setup issues | Optional; demo works without it |
| WebSocket drops | Auto-reconnect + polling fallback |
| Wrong severity on stage | Unit tests + golden dataset seeding |
| Demo timing drift | Tuned delays, 3 rehearsals, backup video |

**Diagram — fallback ladder**
```mermaid
flowchart TD
  A["Live demo"] -->|"fails"| B["Restart service, rerun scenario"]
  B -->|"fails"| C["Seed golden dataset into dashboard"]
  C -->|"fails"| D["Play recorded video"]
```
**Speaker note:** "There is always a next fallback — the audience never waits."

---

## Slide 4.5 — Scalability Path (Prototype → Production)
**Title:** *The same design scales out*

**On-slide content**
- Today: tailers + Postgres + in-process engine (demo scale)
- Next: message queue (Redis Streams/Kafka), partition by source IP, incremental evaluator
- Long-term storage and search: forward ECS NDJSON to Elastic/Splunk

**Diagram**
```mermaid
flowchart LR
  subgraph NOW["Prototype"]
    N1["Tailers"] --> N2["Postgres"] --> N3["In-process engine"]
  end
  subgraph NEXT["Production"]
    P1["Agents / Vector / Filebeat"] --> P2["Kafka / Redis Streams"]
    P2 --> P3["Engine workers - partition by IP"]
    P3 --> P4[("Postgres + Elastic / Splunk")]
    P3 --> P5["SOAR: Shuffle / Cortex"]
  end
  NOW -. "same schema, same rules" .-> NEXT
```
**Speaker note:** "We didn't build a throwaway — the schema and rules carry over unchanged."

---

## Slide 4.6 — Safety, Legal & Ethical Viability
**Title:** *Safe by design, honest by default*

**On-slide content**
- All attack traffic simulated in our isolated lab
- All data synthetic (reserved `.example` domains); bait credentials fictitious
- Real deployments require VLAN/VPC egress denial, provider-terms check, local-law check
- Simulated IPs are Docker addresses mapped to RFC 5737 documentation ranges, and we say so

**Diagram — controls stack**
```mermaid
flowchart TB
  L1["Network: separate internal networks"] --> L2["Egress: none"]
  L2 --> L3["Container: cap_drop ALL, limits"]
  L3 --> L4["Data flow: one-way read-only logs"]
  L4 --> L5["Control: approval, allowlist, audit"]
  L5 --> L6["Host: dedicated VM, snapshots"]
```
**Speaker note:** "Safety is not a slide — it's a test script you can run."

---

## Slide 4.7 — Cost & Adoption Viability
**Title:** *Cheap to run, easy to adopt*

**On-slide content**
- Open-source stack — no license cost; runs on a laptop or one small VM
- Plugs in beside an existing SIEM (ECS export) — no rip-and-replace
- Natural buyers: SOC teams, MSSPs, regulated sectors (finance, healthcare)

**Diagram — adoption path**
```mermaid
flowchart LR
  A["Pilot: 3 decoys + 5 honeytokens"] --> B["Forward ECS to existing SIEM"]
  B --> C["Enable approved responses"]
  C --> D["Expand decoys: AD, cloud, K8s"]
```
**Speaker note:** "Value on day one, with a path to full coverage."
