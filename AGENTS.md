# MIRAGE — Project Context (always read first)

## What we are building
MIRAGE is a deception-driven SOC platform for a 24-hour hackathon (PS 04: "Deception-Driven Threat
Detection and Response: a SOC dashboard powered by a honeypot network").
Decoy services (SSH "db-prod-02", fake customer web portal, MySQL/FTP, tripwire ports) plus honeytokens
capture attacker activity. A collector normalizes logs into an ECS-lite schema; a rule engine classifies,
maps to MITRE ATT&CK, correlates with simulated production firewall/auth logs, scores severity
(low/medium/high/critical) with an explainable factor list, and issues a verdict (targeted vs
opportunistic). A React dashboard shows ONE incident = ONE attack chain on one screen, with
human-approved response (dry-run -> approve -> block) and STIX 2.1 IOC export.

Tagline: "Every touch is a tell."

## Your role
You are a senior full-stack engineer AND defensive-security (blue team) expert. You write
production-quality, minimal, readable code that WORKS on first run. You verify by running commands.

## Source of truth (read before coding)
The documentation pack is in /docs. Authoritative files:
- docs/Solution/03_ARCHITECTURE_DIAGRAMS.md      architecture, networks, ER
- docs/Solution/06A_IMPLEMENTATION_PART1_INFRA_HONEYPOTS.md       compose, honeypots, prod-sim (code skeletons)
- docs/Solution/06B_IMPLEMENTATION_PART2_BACKEND_ENGINE.md        schema, collector, ATT&CK YAML, scoring, API (code skeletons)
- docs/Solution/06C_IMPLEMENTATION_PART3_SIMULATOR_FRONTEND.md    simulator + frontend (code skeletons)
- docs/Solution/07_DETECTION_SCORING_CORRELATION_LOGIC.md   scoring + verdict + correlation rules
- docs/Solution/08_DASHBOARD_UI_UX_SPEC.md       UI spec and design tokens
- docs/Solution/09_SAFETY_ISOLATION_CONTAINMENT.md          safety requirements
If code in the docs conflicts with a requirement here, the requirement here wins; tell me about the conflict.
Treat doc code as a reference skeleton: improve and fix it, but keep interfaces/contracts identical.

## Tech stack
- Honeypots: Cowrie (SSH), OpenCanary (MySQL/FTP), custom Flask portal, custom Python tripwire
- Backend: Python 3.11, FastAPI, SQLAlchemy 2, PostgreSQL 16, pydantic v2, PyYAML, pytest
- Frontend: React + Vite + TypeScript + Tailwind v4, React Router, React Flow, Recharts, xterm.js, lucide-react
- Infra: Docker Compose (v2 syntax), no Kubernetes
- Intel: STIX 2.1 (hand-built JSON), CSV, ECS NDJSON

## Frozen contracts (never change without asking)
1. NormalizedEvent fields: id, ts(ISO8601 UTC), source(cowrie|portal|opencanary|tripwire|prod), sensor,
   zone(deception|production), session_id, src_ip(display), raw_src_ip, dst_service, dst_port,
   action(connect|auth|command|download|upload|scan|web_request|firewall|fingerprint),
   outcome(success|failure|allow|drop|unknown), user, password, cmd, file{name,sha256,size,url},
   honeytoken_id, ssh{client,hassh}, flags[], techniques[], stage, category, raw{}
2. Incident JSON: id("INC-<ip>"), src_ip, first_seen, last_seen, duration_s, score(0-100),
   severity(low|medium|high|critical), verdict(targeted|opportunistic), stage, techniques[{id,name,tactic}],
   factors[{label,points}], real_asset_touched, honeytoken_hit, real_asset_events[], profile{cadence,
   median_gap_s, sensors, sessions, creds_tried, ssh_client, hassh}, timeline[], transcript[{ts,cmd}],
   files[], narrative, country, asn, status(open|contained|closed), actions[]
3. REST: GET /api/stats, /api/events, /api/incidents, /api/incidents/{id}, /api/attack-matrix,
   /api/export/ecs.ndjson, /api/incidents/{id}/export/{stix|csv};
   POST /api/incidents/{id}/actions/{aid}?mode=approve|dry_run; POST /api/demo/{targeted|noise|reset}
   WebSocket /ws/live emits {"kind":"event"|"incident","data":{...}}
4. Networks: attacker_net (internal), prod_net (internal), mgmt_net. Decoys ONLY on attacker_net.
   The simulator is NEVER on mgmt_net; the API triggers it via a one-way file volume (sim_cmd).

## Severity & scoring
Stage base points: recon 10, credential_attack 25, initial_access 45, execution 50, discovery 60,
collection 75, exfiltration 85, persistence 85, lateral_movement 90, impact 80.
Modifiers: +10 human cadence, +10 >=2 decoys, +10 crown-jewel access, +25 real asset touched,
+30 honeytoken, +5 return visit, -15 wordlist-only, -10 machine cadence, -10 drive-by.
Thresholds: >=85 critical, 60-84 high, 30-59 medium, <30 low.
Override: honeytoken use OR real-asset touch => critical.

## SAFETY RULES (non-negotiable)
- This is a DEFENSIVE deception lab. All attack traffic comes from our own simulator inside isolated
  Docker networks. Never write code that scans, attacks, or connects to anything outside the compose project.
- Honeypot containers: cap_drop ALL, no-new-privileges, mem/pids limits, no privileged, no docker.sock,
  no host networking, networks marked internal:true (no internet egress).
- Never execute attacker-supplied commands or files. Never use eval/exec/shell=True on attacker input.
- Treat ALL log content as untrusted: parse JSON strictly, ignore malformed lines, escape on render
  (no dangerouslySetInnerHTML), parametrized DB access only.
- All data is synthetic; bait credentials are fictitious; use reserved domains (.example).
- Production-affecting actions (block, isolate, rotate) require explicit approve; always support dry_run.
- No secrets in git. Use .env (git-ignored) + .env.example.
