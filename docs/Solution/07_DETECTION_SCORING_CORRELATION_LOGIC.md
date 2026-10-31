# 07 — Detection, Prioritization, Correlation & Profiling Logic

> This is the "brain" explained in a form you can paste into documentation and defend in Q&A. Code is in 06B.

## 1. Core principle
**Confidence is free; priority is earned.** Anything touching a decoy is hostile by definition (confidence ≈ 100%). The engine's real job is to answer: *How far did they get? Are they targeting us? Did they reach anything real?*

## 2. Pipeline stages

| # | Stage | Input → Output | Notes |
|---|---|---|---|
| 1 | **Collect** | Honeypot/prod log lines → raw dicts | Tailers with offset + partial-line safety |
| 2 | **Normalize** | raw → ECS-lite `NormalizedEvent` | One schema for all sources |
| 3 | **Enrich** | + display IP, geo/ASN, flags | Alias map for simulated IPs |
| 4 | **Detect scan** | connects across ports | ≥4 distinct ports in 10s → synthetic `scan` event |
| 5 | **Classify + map** | event → category, stage, ATT&CK IDs, flags | YAML rules (data-driven) |
| 6 | **Correlate** | events by source IP across decoys **and** production | 30-minute window |
| 7 | **Score + verdict** | factor list → score, severity, targeted/opportunistic | Fully explainable |
| 8 | **Incident upsert** | one incident per attacker | Live-updating |
| 9 | **Recommend** | incident → actions | Rule table |
| 10 | **Export** | incident → STIX / CSV / blocklist / ECS | Intel loop |

## 3. Classification taxonomy

| Category | Typical signals | Example ATT&CK |
|---|---|---|
| `scanning` | multi-port connects, tripwire hits | T1046, T1595.001 |
| `brute_force` | repeated failed auth | T1110.001 (guessing), T1110.003/.004 (spraying/stuffing when many users or known-leak pairs) |
| `initial_access` | successful auth with default creds | T1078.001 |
| `exploitation` | SQLi / traversal flags on portal | T1190 |
| `post_compromise` | shell commands, discovery, collection, tool download | T1059.004, T1083, T1082, T1033, T1005, T1105, T1552.001 |
| `exfiltration` | decoy file download, crown-jewel read | T1005 + T1041 |
| `persistence` | authorized_keys, cron, history clearing | T1098.004, T1053.003, T1070.003 |
| `lateral_movement` | honeytoken used on real host | T1078, T1021.004 |
| `impact` | miner strings | T1496 |

> **ATT&CK versioning note:** technique IDs are stable; tactic labels change between releases (v19 split Defense Evasion into Stealth and Impair Defenses). Labels live in `attack_map.yaml`, version string displayed in the UI footer.

## 4. Kill-chain mapping (display stages)

| Display stage | Internal stages merged |
|---|---|
| Recon | recon |
| Initial Access | credential_attack, initial_access |
| Execution | execution, persistence (shown with its own chip) |
| Discovery | discovery |
| Collection | collection |
| Exfiltration | exfiltration, impact |
| Lateral | lateral_movement |

The **highest stage reached** is the incident's current stage (progress bar).

## 5. Scoring model (explainable)

### 5.1 Base: stage points
| Stage | Points |
|---|---|
| recon | 10 |
| credential_attack | 25 |
| initial_access | 45 |
| execution | 50 |
| discovery | 60 |
| collection | 75 |
| exfiltration | 85 |
| persistence | 85 |
| lateral_movement | 90 |
| impact | 80 |

### 5.2 Modifiers
| Modifier | Points | Why |
|---|---|---|
| Human typing cadence | +10 | Manual operator → targeted |
| Touched ≥2 distinct decoys | +10 | Enumerating, not drive-by |
| Accessed crown-jewel decoy data | +10 | Intent to steal data |
| Same source touched **real** asset | +25 | Reach |
| Honeytoken used/triggered | +30 | Confirmed compromise path |
| Returned in a later session (>10 min) | +5 | Persistence of interest |
| Only common wordlist creds, no commands | −15 | Botnet noise |
| Machine-speed commands | −10 | Automated |
| Drive-by <5s no commands | −10 | Scanner |

Score is clamped to 0–100.

### 5.3 Severity
| Score | Severity |
|---|---|
| ≥ 85 | **Critical** |
| 60–84 | **High** |
| 30–59 | **Medium** |
| < 30 | **Low** |

**Overrides:** honeytoken use **or** real-asset touch ⇒ **Critical**, regardless of score.

### 5.4 Verdict: Targeted vs. Opportunistic
Two running tallies:

| Targeted evidence | pts | Noise evidence | pts |
|---|---|---|---|
| Human cadence | 2 | Only wordlist creds | 2 |
| ≥2 decoys | 1 | Machine cadence | 2 |
| Crown-jewel access | 2 | Drive-by | 1 |
| Real asset touched | 3 | (campaign member, P2) | 2 |
| Honeytoken | 3 | | |
| Return visit | 1 | | |

`verdict = targeted` if `targeted ≥ 3` **and** `targeted > noise`; else `opportunistic`.

### 5.5 Worked examples (use in slides)

**A. Botnet drive-by** (`198.51.100.7`)
Stage credential_attack (25) + wordlist-only (−15) + machine cadence (−10) = **0 → Low**, verdict *opportunistic*.

**B. Targeted attacker** (`203.0.113.50`)
Stage lateral_movement (90) + human cadence (+10) + 3 decoys (+10) + crown-jewel (+10) + real asset (+25) + honeytoken (+30) → clamp 100 → **Critical**, verdict *targeted* (targeted points 2+1+2+3+3 = 11).

**C. Medium case:** attacker logs in with a non-wordlist password and runs `ls`, nothing else: execution/discovery (60) + human cadence (+10) = 70 → **High**, targeted points 2 → below 3 → *opportunistic until more evidence*. (Shows nuance: high severity can still be "not yet clearly targeted".)

## 6. Correlation logic

### 6.1 Entity model
`Attacker = display source IP` (P0). P2 adds clustering by `HASSH + SSH client + command fingerprint` → `campaign_id`.

### 6.2 Real-asset touch
```
for each attacker IP A:
    events_prod = prod events (firewall/auth/web) where src_ip == A
                  within [first_seen - 30m, last_seen + 30m]
    if events_prod: real_asset_touched = True
```
- Benign internal traffic (10.x.x.x) never equals an attacker IP → **no false correlation**.
- The correlation also works **in the reverse order** (prod touched first, decoy later), because the pool is by IP across zones.

### 6.3 Honeytoken tripwires
| Token | Planted | Trigger | Meaning |
|---|---|---|---|
| HT-CRED-001 `svc_backup` | `notes.txt` on decoy | Auth attempt with that username on any host (esp. prod) | Attacker harvested creds and is pivoting |
| HT-CUST-001 canary email | Inside `customer_data_2026.csv` | File download / read, or (production) email/DNS hit | Data theft |
| Lure path `/admin-backup/` | `robots.txt` | Request | Targeted web recon |

Because **no legitimate user knows these exist**, a hit is a confirmed indicator → +30 and Critical override.

### 6.4 Telemetry sources used in correlation
| Source | Fields used |
|---|---|
| prod firewall | src IP, dst port, allow/drop |
| prod auth | src IP, user, outcome, honeytoken flag |
| decoys | everything |
| (extension) VPN/IdP logs | user ↔ IP map |

## 7. Attacker profile (what the analyst sees)

| Field | Source |
|---|---|
| Source IP, country, ASN | enrichment |
| Tooling hints | SSH client banner string, HASSH fingerprint |
| Behavior class | cadence: human / scripted / bot (median inter-command gap + variation) |
| Credentials tried | list of user:pass pairs (wordlist vs. tailored) |
| Targets touched | decoys + real assets |
| Intent | crown-jewel access, credential harvesting, persistence attempts |
| Timeline | all events, stage-tagged |
| Verdict + score + factors | engine |

**Cadence algorithm:** collect command timestamps in a session; need ≥3. `median gap < 0.6s → bot`; `median ≥ 1.5s and coefficient of variation ≥ 0.3 → human`; otherwise `scripted`.

## 8. Noise reduction accounting (live KPI)
```
noise_suppressed_pct = (1 − incidents / raw_events) × 100
```
Plus: counts of `opportunistic` vs `targeted`, `critical_open`. **Quote only numbers produced by your own demo run.**

## 9. Response recommendation rules

| Condition | Recommended action | Approval |
|---|---|---|
| severity ≥ high | Block source at edge | Human |
| real asset touched | Isolate host; hunt query (Splunk + KQL) | Human |
| honeytoken hit | Rotate/disable account; audit where it lives | Human |
| always | Export IOCs (STIX 2.1, CSV, blocklist) | None |
| severity low | Monitor only | None |

**Safe-automation rule:** anything that can affect production requires explicit analyst approval; decoy-only actions could auto-execute.

## 10. Known limitations (be honest, judges respect it)
- Rule-based: novel behaviors are scored by stage + generic modifiers, not specific signatures.
- IP is a weak identity (NAT, proxies, Tor); campaign clustering mitigates but doesn't solve.
- Sophisticated attackers can fingerprint honeypots; mitigated with realistic banners, filesystems, and honeytokens that live on real systems.
- Cadence needs ≥3 commands.
- Simulated attacker IPs are Docker addresses mapped to documentation-range IPs.

## 11. Extension ideas (roadmap slide)
- Auto-ingest ThreatFox/AbuseIPDB-style feeds to flag known mass scanners.
- Graph-based attacker clustering; Sigma rule generation from observed TTPs.
- Direct SIEM export (Elastic/Splunk HEC), SOAR playbooks (Cortex/Shuffle).
- Adaptive decoys: spin up a decoy resembling whatever the attacker scanned for.
