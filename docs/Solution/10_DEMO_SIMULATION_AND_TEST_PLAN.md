# 10 — Demo, Simulation & Test Plan

## 1. Demo goals
1. Show the **PS example end to end** on one screen.
2. Show **noise vs. targeted** separation.
3. Show **cause → effect response** (approve → attacker dropped).
4. Prove **safety** (isolation evidence).
5. Be **repeatable** and **fail-safe** (backup plan).

## 2. Scenarios

### Scenario A — "Noise Storm" (opportunistic internet background)
| Item | Value |
|---|---|
| Trigger | Demo Control → Launch Noise Storm |
| Actors | ~15 bot source IPs × 3 waves (198.51.100.x) |
| Behavior | 1–3 common creds each, machine-speed commands (`uname`, `cat /proc/cpuinfo`, `wget …`) |
| Expected | Many Low/Medium incidents, verdict **opportunistic**, no real-asset touch |
| Message | "Hundreds of events collapse into a handful of low-priority incidents, nobody gets paged." |

### Scenario B — "Targeted Intruder" (the PS example)
| Step | Attacker action | System response (visible) | ATT&CK |
|---|---|---|---|
| 1 | Connects to 6 decoy ports | Scan event, **Low** incident appears | T1046, T1595.001 |
| 2 | MySQL `root/root`, `root/` | Auth failures logged (OpenCanary) | T1110.001 |
| 3 | SSH `root/123456`, `admin/admin`, then `root/root` | Brute force → login success → **High** | T1110.001, T1078.001 |
| 4 | `whoami`, `uname -a`, `ls /home/dbadmin` | Discovery chips appear, transcript fills | T1033, T1082, T1083 |
| 5 | `cat notes.txt` | Credentials-in-files, **honeytoken** bait read | T1552.001 |
| 6 | `ls /srv/backups`, `cat customer_data_2026.csv` | **Collection**, crown-jewel flag | T1005 |
| 7 | Web login `admin/admin`, downloads CSV from portal | **Exfiltration**, honeytoken HT-CUST-001 | T1005, T1041 |
| 8 | Tries `svc_backup` creds on `prod-web-01` | **Real asset touched + honeytoken use → CRITICAL**, red panel | T1078, T1021.004 |
| 9 | Analyst clicks Approve block | Blocklist updated, status flips to **Contained** | — |
| 10 | Attacker retries prod | `CONNECTION DROPPED`, firewall `drop` event appears | — |

Total runtime ≈ 90–120 seconds (tune sleeps).

### Scenario C — "Quiet recon only" (optional)
Single port scan, no login → stays **Low**, demonstrates restraint (no alert fatigue).

## 3. Demo run-of-show (3–4 min live)
| Time | Action | Say |
|---|---|---|
| 0:00 | Command Center, empty/low activity | "This is a SOC with decoys deployed. Nothing legit touches these." |
| 0:20 | Click **Noise Storm** | "First, the internet being the internet." |
| 0:50 | Point at KPI (raw → incidents) | "N events → M incidents, all low/medium, verdict opportunistic." |
| 1:10 | Click **Targeted Attack** | "Now someone different." |
| 1:30 | Incident appears Low → High | "Watch the kill chain move." |
| 2:00 | Open incident page | "Who, what, how far, what to do — one screen." |
| 2:30 | Critical + red real-asset panel | "Same IP touched production using a credential found in the decoy: confirmed lateral movement." |
| 3:00 | Click Approve | "Human-approved, dry-run available." |
| 3:15 | Contained + sim log "dropped" | "Attacker cut off. Export STIX for sharing." |
| 3:40 | Show isolation test | "And the honeypot can't be a pivot: proof." |

## 4. Acceptance tests (run before freeze)

| ID | Test | Pass criteria |
|---|---|---|
| AT-01 | Clean start | `docker compose up -d --build` → all services Up in <3 min |
| AT-02 | SSH honeypot logging | Manual SSH attempt creates JSON entries ≤1 s |
| AT-03 | Normalization | `/api/events` returns schema-valid events from all 5 sources |
| AT-04 | Scan detection | 4+ distinct tripwire ports → one `scan` event |
| AT-05 | Classification | `ls` → T1083; `cat customer_data` → T1005; failed login → T1110.001 |
| AT-06 | Scoring | Noise bot scores Low; Targeted scenario reaches Critical |
| AT-07 | Verdict | Bot = opportunistic; Targeted = targeted |
| AT-08 | Correlation | Prod events for attacker IP set `real_asset_touched` |
| AT-09 | Honeytoken | `svc_backup` auth → honeytoken flag + Critical |
| AT-10 | Live UI | New incident appears without refresh (<2 s) |
| AT-11 | Approve | Blocklist file updated; prod-sim drops next connection |
| AT-12 | Contained state | UI flips to Contained in <2 s |
| AT-13 | STIX export | Valid JSON, contains indicator(s) and attack-pattern(s) |
| AT-14 | Isolation | `isolation_test.sh` all PASS |
| AT-15 | Reset | Reset returns clean state <10 s (or `down -v && up`) |
| AT-16 | Repeatability | Scenario B succeeds 3 times in a row |

## 5. Unit tests worth writing (30 min, high value)
```python
# tests/test_engine.py
from app.engine.classify import classify
from app.engine.evaluate import evaluate

def ev(**kw):
    base = dict(id="x", ts="2026-10-31T10:00:00Z", source="cowrie", sensor="db-prod-02", zone="deception",
                session_id="s1", src_ip="203.0.113.50", raw_src_ip="x", dst_service="ssh", action="command",
                outcome="unknown", flags=[], techniques=[], raw={})
    return classify(base | kw)

def test_ls_maps_to_discovery():
    e = ev(cmd="ls /srv/backups"); assert "T1083" in e["techniques"] and e["stage"] in ("discovery",)

def test_customer_file_is_collection():
    e = ev(cmd="cat /srv/backups/customer_data_2026.csv"); assert "T1005" in e["techniques"] and "crown_jewel" in e["flags"]

def test_honeytoken_overrides_to_critical():
    t = ev(action="auth", outcome="failure", user="svc_backup", zone="production", source="prod", sensor="prod-web-01",
           flags=["honeytoken_use"], cmd=None)
    inc = evaluate("203.0.113.50", [t]); assert inc["severity"] == "critical"

def test_bot_is_low_and_opportunistic():
    evs = [ev(action="auth", outcome="failure", user="root", password="123456", ts="2026-10-31T10:00:00Z")]
    inc = evaluate("198.51.100.7", evs); assert inc["severity"] == "low" and inc["verdict"] == "opportunistic"
```
Run: `cd backend && pytest -q`.

## 6. Failure modes & instant mitigations (stage-proof)
| Failure | Symptom | Mitigation |
|---|---|---|
| Docker network hiccup | Sim can't reach Cowrie | `docker compose restart cowrie attacker-sim`; keep 2nd terminal ready |
| WebSocket drops | Feed freezes | Auto-reconnect; fallback to 2 s polling of `/api/incidents` |
| Cowrie slow to start | No SSH events | Start stack 10 min before presenting; run noise once as a warm-up |
| Timing differs from rehearsal | Escalation slower | Shorten `human()` delays, or use a pre-recorded video |
| Wi-Fi at venue | No effect (everything local) | Entire stack is offline-capable |
| Total failure | Nothing works | **Play backup video**, then show seeded dashboard (`seed_demo.py`) |

## 7. Backup assets (produce by H22)
1. 2-minute **screen recording** of the full run (no audio needed; narrate live).
2. `fixtures/golden_events.json` + seed button to populate dashboard.
3. Static screenshots in the PPT for every key screen.
4. USB/Drive copy of repo + images (`docker save`) in case of no internet pulling.

## 8. Metrics to capture for the pitch (from your own run)
- raw events vs incidents → noise suppressed %
- time from first scan to Critical (seconds)
- number of ATT&CK techniques observed
- number of decoys touched, IOCs generated
- time from Approve click to Contained
