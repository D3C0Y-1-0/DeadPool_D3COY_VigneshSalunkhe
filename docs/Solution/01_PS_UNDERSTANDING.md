# 01 — Problem Statement Understanding

## 1. The problem in plain words
SOC analysts drown in alerts (firewall, EDR, logs). Most are false positives. Real attackers can sit inside for days. Signature/anomaly detection answers *"does this look bad?"* — never *"is this definitely hostile?"*.

**Deception flips the question.** A decoy has no business use, so **any interaction = hostile by definition** (near-zero false positives). But today honeypot data sits in raw log files, disconnected from the SOC.

> **The real gap is not "build a honeypot". It is "turn honeypot noise into a single, prioritized, actionable attack story inside the SOC workflow."**

## 2. Who are the users?
| Persona | Pain | What they need from us |
|---|---|---|
| **Tier-1 analyst** | Alert fatigue, no context | Few, high-confidence incidents with a verdict and next step |
| **Tier-2/IR lead** | Reconstructing timelines manually | Attack chain, ATT&CK mapping, evidence, containment buttons |
| **SOC manager / CISO** | No proof deception adds value | KPIs: noise suppressed, time-to-detect, techniques seen |
| **Threat-intel analyst** | Needs shareable IOCs | One-click STIX/CSV export |

## 3. Requirement matrix (every line of the PS → our feature)

| PS requirement | Our answer | Priority |
|---|---|---|
| Realistic decoy services (SSH/web/DB/IoT) | Cowrie SSH "db-prod-02", Decoy Customer Portal (web), OpenCanary MySQL/FTP, lure files | **P0** |
| Capture logins, commands, file up/downloads | Cowrie JSON + portal logs + OpenCanary logs; SHA-256 of files | **P0** |
| Real-time collection, normalization (SIEM-style) | Collector → ECS-like schema → DB → WebSocket stream | **P0** |
| Classify (scan, brute force, exploit, post-compromise) | Rule engine per event + per session | **P0** |
| Map to ATT&CK + kill chain | YAML-driven mapper, ATT&CK heatmap, kill-chain progress bar | **P0** |
| Alert prioritization (low/med/high/critical), noise vs targeted | Explainable scoring + "Opportunistic vs Targeted" verdict | **P0** |
| Correlation with firewall/auth logs | Prod-telemetry ingest + "Real-Asset Touch" check | **P1 (core to the example)** |
| Attacker profile (source, tools, behavior, timeline) | Profile card: geo/ASN, HASSH/client, cadence, creds list, timeline | **P1** |
| Automated response + threat intel | Recommend + approve actions; blocklist; STIX 2.1/CSV IOC export; webhook | **P1** |
| Containment & safety (no pivot) | Segmented networks, egress-deny, hardened containers, one-way logs | **P0 (doc + real)** |
| Deliverable: functional honeypot | Docker Compose lab | **P0** |
| Deliverable: SOC dashboard (live events, alerts, profiles, ATT&CK) | React dashboard | **P0** |
| Deliverable: demo w/ simulated attack in isolated env | Simulator container + Demo Control panel | **P0** |
| Deliverable: documentation | Files 09 and 11 | **P0** |

## 4. The example use case, decomposed (this is your demo script skeleton)
1. Attacker **scans** the network → recon event, T1046/T1595
2. Finds **decoy database**, tries **default credentials** → T1110 / T1078.001
3. Runs **ls / list files** commands → T1083, T1059.004
4. **Downloads fake `customer_data`** → T1005 / T1041 (collection → exfil)
5. System **identifies source** → attacker profile
6. **Captures every command** → replayable transcript
7. **Maps to ATT&CK** → technique chips + heatmap
8. **Checks real assets** → "Did 203.0.113.50 touch anything real?" (YES → escalate)
9. **High-priority alert** → Critical
10. **Recommends blocking** → one-click approve
11. **One screen, one attack chain** → Incident view

**Design rule: our Incident view must visibly show all 11 items.** Judges will tick them off.

## 5. Hidden evaluation criteria (what judges actually score)
| Criterion | How we address it |
|---|---|
| Innovation | Deception-correlated attack chain, honeytoken tripwires in prod, campaign clustering, replay, explainable scoring |
| Technical depth | Real honeypots, real pipeline, real ATT&CK mapping, STIX export |
| Feasibility/completeness | Works end-to-end from `docker compose up` |
| UI/UX | Narrative-first incident screen, dark SOC theme, live motion |
| Security rigor | Containment architecture, threat model |
| Impact | Quantified noise reduction (live-computed), response automation |
| Presentation | Story: "4,800 alerts vs 1 truth" |

## 6. Key constraints & assumptions
- 24 hours, assume **3–4 people** (plan adapts to 2 or solo in file 05).
- Offline-friendly: no dependency on paid APIs. (GeoIP/LLM are optional enhancers with fallbacks.)
- All attack traffic is **simulated and isolated**; no real internet exposure required for demo.
- "Production environment" is **simulated** by a `prod-sim` service producing firewall/auth logs.

## 7. Risks of misunderstanding (avoid these)
1. Building only a honeypot with a log viewer → "just T-Pot + Kibana". Fails the "SOC actionable" bar.
2. Skipping correlation → misses the PS's emphasized "checks whether same source touched real asset".
3. Ignoring safety → PS explicitly lists containment.
4. Over-building ML → unreliable in 24h. **Explainable rules beat black boxes** for analysts and for demos.

## 8. Glossary
- **Honeypot**: decoy service. **Honeytoken**: decoy credential/file/record placed anywhere; use = alert.
- **IOC**: indicator of compromise. **TTP**: tactics, techniques, procedures.
- **ATT&CK**: MITRE adversary behavior knowledge base. **Kill chain**: staged model of attack progress.
- **SIEM-style pipeline**: ingest → normalize → enrich → correlate → alert.
- **SOAR**: automated/orchestrated response.
