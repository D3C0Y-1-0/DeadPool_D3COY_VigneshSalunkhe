# 05 — 24-Hour Development Roadmap (Phase-wise, Priority-wise)

## 1. Priority legend
| Tag | Meaning | Rule |
|---|---|---|
| **P0** | Must-have. Without it there is no demo. | Done by hour 16, no exceptions |
| **P1** | Should-have. Core PS asks (correlation, response, profiles). | Done by hour 20 |
| **P2** | Wow factor. | Only after P0 and P1 are demo-stable |
| **P3** | Stretch. | Only if idle |

## 2. Team split (4 people; adapt below)

| Role | Owns | Phases |
|---|---|---|
| **A. Deception/Infra** | Docker Compose, Cowrie, portal, OpenCanary, prod-sim, isolation, simulator | 1, 6 |
| **B. Backend/Pipeline** | Collector, normalizer, DB, API, WebSocket | 2, 5 |
| **C. Security/Detection** | Classifier, ATT&CK map, scoring, correlation, profiling, IOC/STIX, docs 07/09/11 | 3, 5 |
| **D. Frontend/Story** | Dashboard, UI polish, PPT, video, pitch | 4, 7 |

**If 3 people:** merge A+C infra/detection split (A does infra + sim, C does detection + docs), D keeps UI, B keeps pipeline.
**If 2 people:** P1 = infra + backend + detection; P2 = frontend + docs + story. Cut P2/P3 entirely.
**If solo:** build only P0 + the Real-Asset Touch from P1; use the simulator to pre-seed data; record the video early.

## 3. Phase overview

| Phase | Hours | Goal | Exit criterion |
|---|---|---|---|
| **0. Kickoff** | 0–1 | Repo, contracts, schema agreed | `docker compose up` runs hello-world; event schema frozen |
| **1. Deception layer (P0)** | 1–5 | Honeypots live, logs flowing | Manual `ssh root@localhost -p 2222` creates JSON log lines |
| **2. Pipeline (P0)** | 3–8 | Collector → normalize → DB → API → WS | `curl /api/events` shows normalized events within 1s of action |
| **3. Detection engine (P0)** | 7–12 | Sessions, classes, ATT&CK, score, verdict, incidents | Simulated attack yields 1 incident with ≥6 technique hits and severity |
| **4. Dashboard (P0)** | 6–16 | Command Center + Incident view + live feed | Live updates appear on screen with no refresh |
| **5. Correlation + response (P1)** | 12–19 | Prod telemetry, honeytokens, recommendations, approve→block, IOC export | Approve button visibly blocks attacker in prod-sim |
| **6. Simulator + demo control (P0/P1)** | 10–20 | Scripted noise + targeted attack, triggered from UI | One click reproduces the entire story, repeatably |
| **7. Docs, PPT, video (P0)** | 17–23 | Deliverables finished | All files in pack finalized, video recorded |
| **8. Rehearsal + buffer** | 22–24 | Freeze code at H22, rehearse 3x | Dry run succeeds twice in a row |

**Code freeze: Hour 21.** After that only bug fixes and docs.

## 4. Hour-by-hour plan

| Hour | A. Infra | B. Backend | C. Detection | D. Frontend/Story |
|---|---|---|---|---|
| **0–1** | Repo, compose skeleton, networks | Pydantic event schema + DB models | Draft ATT&CK YAML, scoring table | Figma-less wireframes (use file 08), Vite + Tailwind scaffold |
| **1–3** | Cowrie running, honeyfs lures, userdb | FastAPI skeleton, Postgres, `/health` | Command regex classifier + tests on sample Cowrie JSON | App shell, dark theme, routing, mock data layer |
| **3–5** | Decoy portal (login + download), OpenCanary | Cowrie parser + tailer | Session builder | Command Center layout with mock data |
| **5–8** | prod-sim (listeners + log gen), isolation checks | Portal/OpenCanary/prod parsers, WS broadcast | ATT&CK mapper, kill-chain mapping | Live feed + KPI cards wired to API/WS |
| **8–10** | Simulator v1 (targeted script) | Incident upsert endpoint, query APIs | Scoring + verdict with factor list | Alert queue + Incident page skeleton |
| **10–12** | Simulator v2 (noise storm) | Attacker table + profile API | Cadence/profile calc, noise heuristics | Attack-chain (React Flow) + kill-chain bar |
| **12–14** | Honeytokens in prod-sim and Cowrie lures | Correlation query + prod ingest | Real-asset touch + honeytoken escalation | Terminal transcript panel, real-asset panel |
| **14–16** | Blocklist volume + prod-sim enforcement | Action endpoints (approve/dry-run) | Recommendation rules | Action panel + Contained state animation |
| **16–18** | Demo control trigger volume + sim watcher | STIX/CSV export, ECS export | Campaign clustering (P2) | ATT&CK heatmap page, attacker profile page |
| **18–20** | Hardening: cap_drop, limits, isolation test script | Seed/reset script, perf check | Narrative generator | Threat map, polish, loading/empty states |
| **20–21** | **Freeze**, full end-to-end test | Bug fixes | Bug fixes | Final polish, screenshots for PPT |
| **21–23** | Record demo run, backup recording | Docs 09, README | Docs 07, 11 | PPT, video edit, script rehearsal |
| **23–24** | Rehearse | Rehearse | Rehearse | Rehearse + upload |

## 5. Detailed phase checklists

### Phase 0 — Kickoff (H0–1)
- [ ] Create repo, branches (`main`, feature branches), shared `.env.example`.
- [ ] Freeze **event schema** (file 06 §4) and **incident JSON** (file 06 §8). Everyone codes against these.
- [ ] Agree ports: API 8000, UI 5173, Cowrie 2222, portal 8080, OpenCanary 3306/21.
- [ ] Create mock JSON fixtures (`fixtures/events_demo.json`) so frontend works before backend is ready.

### Phase 1 — Deception layer (P0)
- [ ] Cowrie container running; hostname `db-prod-02`, banner like Ubuntu OpenSSH.
- [ ] Lure files: `/srv/backups/customer_data_2026.csv` (fake rows), `/home/dbadmin/notes.txt` (bait creds), `/root/.mysql_history`.
- [ ] Decoy portal: `/login`, `/admin`, `/download/customer_data_2026.csv`, logs JSON with honeytoken IDs.
- [ ] OpenCanary MySQL + FTP *(P1; fallback = skip)*.
- [ ] Verify with manual ssh/curl; confirm logs persist on shared volume.
- [ ] Run `scripts/isolation_test.sh` (file 09) → proves no egress.

### Phase 2 — Pipeline (P0)
- [ ] Tailer with offset tracking and partial-line safety.
- [ ] Parsers → `NormalizedEvent`.
- [ ] Persist to Postgres; broadcast over WebSocket `/ws/live`.
- [ ] Endpoints: `GET /api/events`, `/api/stats`.

### Phase 3 — Detection (P0)
- [ ] Event classification (scan / brute_force / auth_success / discovery / collection / exfil / persistence / exploit / impact).
- [ ] ATT&CK YAML mapper; kill-chain stage mapping.
- [ ] Session builder with cadence (human vs bot).
- [ ] Scoring + factor list + verdict (Opportunistic / Targeted).
- [ ] Incident upsert keyed by attacker (30-min merge window).

### Phase 4 — Dashboard (P0)
- [ ] Command Center: KPIs, live feed, alert queue, severity chart, map.
- [ ] Incident page: header, kill-chain bar, chain graph, transcript, ATT&CK chips, why-score, actions.
- [ ] Attacker profile page, ATT&CK matrix page.
- [ ] Demo Control drawer.

### Phase 5 — Correlation & response (P1)
- [ ] prod-sim emits firewall/auth logs; ingest as `source=prod`.
- [ ] `correlate.py`: same IP in prod within window → `real_asset_touched`.
- [ ] Honeytoken registry and match on credential use.
- [ ] Recommendation rules; Approve → blocklist → prod-sim drops → status Contained.
- [ ] IOC export: STIX 2.1, CSV, blocklist.

### Phase 6 — Simulator (P0/P1)
- [ ] `noise.py`: many IPs (spoofed via different source labels), common creds, short sessions.
- [ ] `attacker.py`: targeted chain (scan → default creds → ls/cat → download → bait creds on prod).
- [ ] Trigger via `sim_cmd` volume JSON; UI buttons.
- [ ] Idempotent `reset` that clears DB demo data.

### Phase 7 — Docs, PPT, video
- [ ] Final docs from files 09 and 11 pasted into the repo README.
- [ ] PPT from file 12; script from file 13.
- [ ] Video from file 14: record **screen capture twice**; keep best take.

## 6. Cut lines (if you fall behind)
| If behind at… | Cut |
|---|---|
| H8 and no live events | Drop OpenCanary; Cowrie + portal only; use polling instead of WebSocket |
| H12 and no scoring | Use fixed scores per stage; keep factor list as static text |
| H16 and no correlation | Implement simple "same IP in prod_events table" query; skip honeytoken matching |
| H18 and no map | Replace with country-flag list |
| H20 and no STIX | CSV + blocklist only |
| Anything | **Never cut:** live feed, incident attack-chain screen, safety doc, demo reset |

## 7. Parallelization tricks
- Frontend builds on `fixtures/` + a mock WebSocket (`setInterval` pushing fixture events) until backend is ready.
- Detection engine is **pure functions** on dict inputs → unit-test with captured Cowrie samples, no infra needed.
- Simulator can be developed against Cowrie early (H3+).
- Capture a **golden dataset** (JSON dump) at H12 → use as demo fallback if infra breaks on stage (`scripts/seed_demo.py`).

## 8. Daily rhythm & rules
- 15-minute sync every 3 hours (H3, H6, H9 …) — 3 questions: done / blocked / next.
- Merge to `main` only when `docker compose up` still works.
- One person owns `docker-compose.yml` (A). Others PR changes.
- **Sleep plan:** rotate 90-minute naps between H12 and H18 if possible; no one codes after H21 without sleeping.

## 9. Definition of done (demo-ready)
1. `docker compose up -d --build` from clean clone → all services healthy < 3 min.
2. Click "Launch Targeted Attack" → incident appears and escalates live to **Critical** within ~60s.
3. Incident screen shows all 11 items from file 01 §4.
4. Click Approve → attacker retry blocked → status **Contained**.
5. STIX export downloads and opens.
6. "Reset demo" returns to clean state in < 10s.
7. Backup: recorded video + seeded fallback data.
