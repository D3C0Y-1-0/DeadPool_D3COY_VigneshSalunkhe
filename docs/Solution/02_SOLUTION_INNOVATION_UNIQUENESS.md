# 02 — Solution, Innovation & Uniqueness

## 1. The idea in one line
**MIRAGE turns every touch on a decoy into a single, scored, MITRE-mapped, real-asset-correlated attack story — and lets the analyst contain the attacker in one click.**

## 2. Core concept: the Deception Fabric
We don't deploy one honeypot. We deploy a **fabric** with three layers:

| Layer | What | Why it matters |
|---|---|---|
| **Decoy services** (isolated) | SSH "db-prod-02" with fake customer data, Customer Portal web app, MySQL/FTP decoys | Catch scanning, brute force, exploitation, post-compromise behavior |
| **Honeytokens in the real environment** (tripwires) | Fake credentials, fake `.aws/credentials`, fake "backup server" notes, DNS names that only exist as bait | Attackers who land on real hosts and *use* bait reveal lateral movement — **a signal honeypots alone can't give** |
| **Correlation brain** | Pipeline + engine + dashboard | Joins decoy activity with real firewall/auth logs → "did they touch anything real?" |

## 3. Innovation features (the "wow" list, ordered by build priority)

### ★ I1. Attack Chain View — "one incident, one screen" (P0)
Raw events are collapsed into **sessions → incidents**. The analyst sees a horizontal kill-chain bar (Recon → Initial Access → Execution → Discovery → Collection → Exfiltration), the ATT&CK technique for each step, a timeline, and a terminal transcript. This is literally the PS example, visualized.

### ★ I2. Explainable Severity with "Why this score?" (P0)
Every score shows its contributing factors (e.g., `+45 login success`, `+25 real asset touched`, `+10 human typing cadence`, `−15 known default wordlist`). No black box → analysts trust it. Judges love transparency.

### ★ I3. Noise vs. Targeted verdict (P0)
Separates **opportunistic internet noise** (botnets, mass scanners) from **targeted behavior** (manual typing, DB/customer-data hunting, multi-decoy enumeration, return visits). Shows a live KPI: *"N raw events → M incidents → K need a human."*

### ★ I4. Real-Asset Touch Correlation (P1, the PS's key sentence)
Same source IP is searched across prod firewall/auth telemetry within a time window. A hit **auto-escalates to Critical** and adds a red "Real Asset Touched" panel (host, event, time). 

### ★ I5. Honeytoken Tripwire Escalation (P1)
If a credential **found inside the honeypot** is later used against a **real** host (or vice-versa), the system flags **confirmed lateral movement** with 100% fidelity. Demo moment: the attacker "finds" `svc_backup` creds in a decoy file, tries them on `prod-web-01`, and the screen goes red.

### ★ I6. Human-approved SOAR, with a visible effect (P1)
Recommended actions have **Approve / Dry-run** buttons. Clicking *Block source* writes to a shared blocklist; the simulated production firewall starts dropping the attacker, and the dashboard flips the incident to **Contained** live. Judges see cause → effect.

### ★ I7. Campaign Clustering (P2)
Different IPs sharing the same HASSH + SSH client + command fingerprint get grouped as one **campaign** ("14 IPs, same botnet toolkit") → collapses noise further.

### ★ I8. Session Replay (P2)
A terminal replay (xterm.js) re-types the attacker's commands with original timing. Highly demonstrative for video.

### ★ I9. One-click Threat Intel Export (P1)
STIX 2.1 bundle (indicators + attack-patterns), CSV, and plain blocklist. Shows we close the intel loop.

### ★ I10. Analyst Narrative (P2)
Auto-generated plain-English summary: *"At 14:32 UTC 203.0.113.50 scanned 6 ports, logged into db-prod-02 with root/root, enumerated /srv/backups, and downloaded customer_data_2026.csv. The same IP was seen on prod-web-01 firewall logs 4 minutes earlier. Recommend block + hunt."* Template-based (deterministic, offline). Optional LLM polish if an API key exists.

### ★ I11. Deception Health & Coverage (P3)
Heatmap of which decoys were touched, which ATT&CK techniques we've *observed vs. could detect* — answers the CISO's "is deception working?"

## 4. Why this is unique (positioning vs. existing tools)

| Existing approach | Gap | MIRAGE |
|---|---|---|
| T-Pot / raw Cowrie + Kibana | Data viz, not SOC workflow; no incident concept | Incident/attack-chain model, scoring, response |
| Commercial deception (Thinkst Canary, etc.) | Great alerts, limited attack-story/ATT&CK/response unification, paid | Open, explainable, end-to-end, demonstrable |
| SIEM with honeypot logs | Honeypot events treated like any other alert; no verdict | Deception-native logic: hostile by definition → rank by *progress & reach* |
| Typical hackathon honeypot | Log tail + charts | Real pipeline + correlation + safe response |

**Positioning statement:** *"Other tools tell you something touched a decoy. MIRAGE tells you who, how far they got, whether they touched anything real, and what to click."*

## 5. Design principle: "Confidence is free, priority is earned"
Because a honeypot touch is hostile by definition, **confidence is always high**. The hard question is **severity** — so MIRAGE ranks by:
1. **Progress** (how far in the kill chain),
2. **Intent** (targeted vs. opportunistic),
3. **Reach** (touched real assets / honeytokens?).

This reframes alert fatigue: instead of "is it real?", analysts ask "how urgent?" — a much faster decision.

## 6. Narrative hook (for story/pitch)
> *3:07 AM. Maya's SOC console shows 4,812 alerts. 4,811 are noise. One isn't — and it's the one that looks like all the others. MIRAGE gives her one alert, with the whole attack attached.*

## 7. What we deliberately do NOT build (scope discipline)
- No heavy ML / anomaly models (unreliable in 24h, unexplainable).
- No full SIEM replacement (we export to one; we show the schema is SIEM-compatible).
- No real internet exposure required for demo (optional stretch).
- No automatic blocking of production without human approval (safety by design).

## 8. Success metrics (computed live from demo run, never invented)
- Raw events ingested vs. incidents raised (**noise-suppression %**)
- Time from first touch → critical alert (**seconds**)
- Techniques mapped, decoys touched, IOCs generated
- Time-to-containment after approval
