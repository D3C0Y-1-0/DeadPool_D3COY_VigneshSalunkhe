# 12 — PPT Content (slide by slide)

**Format:** 16:9, dark theme matching the dashboard (`#0a0e17` bg, accent `#4da3ff`, critical `#ff3b5c`). Max 12 words per bullet. One idea per slide. Big visuals, small text.
**Length:** 12 core slides + 3 backup. Target 5 minutes (see file 13 for timings).

---

## Slide 1 — Title
**MIRAGE**
*Every touch is a tell.*
Deception-driven threat detection & response — a SOC dashboard powered by a honeypot network
Team name · Hackathon · PS 04
**Visual:** dark background, a faint network graph, one red node glowing.

## Slide 2 — The 3 AM problem
**Headline:** 4,812 alerts. One real attacker. Which one?
- SOC analysts drown in alerts; most are false positives
- Real attackers dwell for days before anyone notices
- Signatures can't say "this is definitely hostile"
**Visual:** wall of grey alert rows with one hidden red row. (Use illustrative framing, no unsourced statistics.)

## Slide 3 — The gap
**Headline:** Honeypots give certainty. SOCs never see it.
- Decoy has no business use → any touch is hostile
- But the data dies in raw log files
- No attack story, no priority, no response
**Visual:** left: honeypot logs (text wall); right: SOC console; broken link between them.

## Slide 4 — Our idea
**Headline:** One touch → one attack story → one click to contain
- Decoys + honeytokens planted in the real environment
- Normalized, ATT&CK-mapped, scored, correlated with real telemetry
- Analyst sees who, what, how far, what to do
**Visual:** 4-step flow: Deceive → Capture → Correlate → Respond.

## Slide 5 — Architecture
**Headline:** SIEM-style pipeline, deception-native logic
**Visual:** diagram from file 03 §1 (export PNG). Label the 4 zones: Attacker, Deception, Production, SOC.
- Callout: "Honeypots share no network with production"

## Slide 6 — Deception fabric
**Headline:** Believable decoys, instrumented everywhere
Table (icons): SSH "db-prod-02" · Customer Portal · MySQL/FTP · Tripwire ports · Honeytokens
- Fake customer data, bait credentials, lure paths
- Every login, command, and file hash captured
**Visual:** screenshot of Cowrie transcript or decoy portal.

## Slide 7 — Intelligence engine
**Headline:** From raw events to a verdict you can trust
- Classify: scan · brute force · exploit · post-compromise
- Map: MITRE ATT&CK + kill-chain stage
- Score: explainable factors → Low / Medium / High / Critical
- Verdict: opportunistic noise vs. targeted attacker
**Visual:** "Why this score?" panel screenshot with +/− factors.

## Slide 8 — The differentiator: correlation
**Headline:** "Did they touch anything real?" — answered automatically
- Same source IP checked against production firewall/auth logs
- Honeytoken used on a real host → confirmed lateral movement
- Auto-escalates to Critical
**Visual:** attack-chain graph with the red production node below the decoy row.

## Slide 9 — Live demo
**Headline:** Watch one attack, start to finish
**Visual:** large "▶ LIVE DEMO" + 5 mini-steps: Scan → Default creds → Commands → Data download → Pivot to prod.
(Switch to dashboard. See file 10 run-of-show.)

## Slide 10 — Response & intel
**Headline:** Human-approved response with a visible effect
- Recommend → Dry-run → Approve → attacker dropped
- Block, isolate, rotate creds, hunt queries
- STIX 2.1 / CSV / ECS exports close the intel loop
**Visual:** Contained state screenshot + STIX file.

## Slide 11 — Safety by design
**Headline:** The honeypot can never be a pivot
- Separate internal networks; no egress; no route to prod or SOC
- Hardened containers; one-way log flow; read-only mounts
- Human approval + allowlist for production-affecting actions
**Visual:** network matrix or isolation test PASS screenshot.

## Slide 12 — Impact & roadmap
**Headline:** Less noise. Faster decisions. Proof of value.
- From our run: *[X] events → [Y] incidents*, *[Z]s* first touch to Critical (insert measured values)
- Next: real telemetry sources (EDR/IdP), adaptive decoys, SOAR integration, campaign clustering
- Closing line: **"Other tools tell you something touched a decoy. MIRAGE tells you what to do about it."**
**Visual:** KPI cards screenshot + roadmap strip.

---

## Backup slides
### B1 — Scoring model table (file 07 §5)
### B2 — ATT&CK coverage matrix screenshot + version note
### B3 — Tech stack: Cowrie · OpenCanary · Flask · FastAPI · PostgreSQL · React · React Flow · Docker Compose

---

## Design guidance
- Use the **same dashboard screenshots** (not stock images).
- Font: Inter (headings 40pt, body 20–24pt), JetBrains Mono for code/IPs.
- Consistent severity colors.
- One accent animation max (fade-in on the red node in slide 8).
- Export a **PDF copy** in case of projector trouble.
- Slide numbers + footer: "MIRAGE · PS 04".

## Speaker-note pointers
Each slide's spoken text is in file 13 with timing. Keep slides sparse; the voice carries the story.
