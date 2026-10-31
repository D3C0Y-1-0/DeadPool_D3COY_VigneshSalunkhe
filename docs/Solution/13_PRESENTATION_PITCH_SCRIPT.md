# 13 — Presentation & Pitch Script

## 1. Formats
| Version | Length | Use |
|---|---|---|
| **Elevator pitch** | 30 s | Hallway, judge walk-by |
| **Main pitch** | 5 min (+ live demo 3–4 min) | Final presentation |
| **Short pitch** | 2 min | If time is cut |

## 2. Elevator pitch (30 seconds)
> "SOC teams get thousands of alerts and most are noise. Honeypots give you certainty, because nothing legitimate ever touches a decoy, but that data never reaches the analyst. **MIRAGE** turns every decoy touch into one attack story: who it is, how far they got, whether they touched anything real, and what to click. In our demo an attacker finds a fake database, steals fake customer data, tries the bait credential on a real server, and the analyst contains them with one approved click. Every touch is a tell."

## 3. Main pitch (5 minutes), with slide cues

### Roles
- **Presenter 1 (story):** slides 1–4, 12
- **Presenter 2 (tech/demo):** slides 5–11
(If solo, read all; practice transitions.)

### [0:00–0:30] Slide 1–2 — Hook (P1)
> "It's 3 AM. A SOC analyst opens her console. **Four thousand eight hundred and twelve alerts.** Almost all of them are noise. One of them is a real attacker, and it looks exactly like the rest. How long does she have to find it? In real incidents, attackers can sit inside for days."
*(Pause 2 seconds.)*

### [0:30–1:00] Slide 3 — Gap (P1)
> "There is a better signal. A **honeypot** is a decoy with no business use, so *any* touch is hostile by definition. Certainty, not probability. But in practice that data sits in raw log files. The SOC sees none of it as a connected attack. The attacker scans, logs in with default credentials, steals the 'customer file', and no one connects the dots."

### [1:00–1:30] Slide 4 — Idea (P1)
> "Our answer is **MIRAGE**. We deploy a deception fabric, capture every interaction, normalize it into a SIEM-style pipeline, map it to MITRE ATT&CK, correlate it with real production telemetry, and give the analyst **one incident, one screen, one click**."

### [1:30–2:10] Slide 5–6 — Architecture and decoys (P2)
> "Here's the architecture. Attackers hit decoys: an SSH 'production database server', a customer data portal, MySQL and FTP services, and tripwire ports. Logs flow one way into our collector, get normalized, and our engine does classification, ATT&CK mapping, scoring, and correlation. And note: decoys share **no network** with production. They can't be a pivot."

### [2:10–2:50] Slide 7–8 — Intelligence (P2)
> "Because confidence is free (it's a decoy), our engine focuses on **priority**: how far did they get, are they targeting us, did they reach anything real? Every score is explainable, you see the factors. And the key differentiator: **we check whether the same source touched a real asset**, and we plant honeytokens in real systems. If a bait credential found in the decoy is used on a production host, that's confirmed lateral movement, instantly Critical."

### [2:50–6:30] Slide 9 — LIVE DEMO (P2) — see file 10 §3
Narration beats (match the clicks):
1. "Quiet SOC. Nothing legitimate touches these decoys." *(Command Center)*
2. "First, the internet being the internet." *(Click Noise Storm)* "Hundreds of events… collapse into a few low-priority incidents, verdict: opportunistic. Nobody is paged."
3. "Now a different visitor." *(Click Targeted Attack)* "Scan, default credentials… watch the kill chain advance."
4. *(Open incident)* "Who: this IP. What: techniques mapped to ATT&CK. How far: Collection, Exfiltration. Every command captured here."
5. "And here's the moment. This source used a credential **it found inside the decoy** against a **real** server. Critical. Confirmed lateral movement."
6. "Recommended: block, isolate, rotate. Dry-run shows exactly what will happen. **Approve.**" *(Click)* "Attacker retries… dropped. Status: Contained. And one click exports STIX for sharing."

### [6:30–7:00] Slide 11 — Safety (P2)
> "Safety is designed in: internal networks with no egress, hardened containers, one-way logs, human approval, an allowlist. Here's the isolation test: all pass."

### [7:00–7:30] Slide 12 — Impact and close (P1)
> "In our run, **[X] events became [Y] incidents**, and the attacker went from first touch to Critical in **[Z] seconds**. Next: real EDR and identity telemetry, adaptive decoys, SOAR integration. Other tools tell you something touched a decoy. **MIRAGE tells you who, how far, whether it was real, and what to click.** Thank you."

> If total time is 5 min including demo: shorten the demo to Targeted Attack only (skip Noise Storm; mention its result from a screenshot) and cut slide 6.

## 4. Short pitch (2 minutes)
1. (15s) Hook: 4,812 alerts, one real.
2. (20s) Honeypot = certainty; data never reaches SOC.
3. (25s) MIRAGE: fabric → pipeline → ATT&CK → correlation → one incident.
4. (45s) Targeted attack demo clip (pre-recorded 40 s).
5. (15s) Safety + roadmap + closing line.

## 5. Stage plan & logistics
- **Before:** stack running 10 min earlier, warm-up Noise Storm once, then **Reset**. Dashboard on external display at 1080p, browser zoom 100–110%, notifications off, second terminal ready (`docker compose logs -f attacker-sim`).
- **Tabs:** (1) dashboard (2) slides (3) backup video (4) isolation test terminal.
- **Handoff:** P1 says "…and over to [name] to show how it works." P2 says "…back to [name] for impact."
- **Don't:** apologize, read slides, say "um we ran out of time".
- **If something breaks:** "Let me show you the recorded run while that restarts." (calm, no panic.)

## 6. Rehearsal plan
| Rehearsal | Goal |
|---|---|
| #1 (H21) | Full run with timer, fix script and demo timing |
| #2 (H22) | Dry run with someone outside the team asking questions |
| #3 (H23) | Final clean run, then **stop**, sleep |

## 7. Delivery tips
- Pause after the hook and after "Critical."
- Point at the screen while speaking (cursor highlight tool on).
- Speak in "analyst" language: *"you see… you click…"*
- One memorable line, repeated three times: **"Every touch is a tell."** (open, middle, close)
- Keep numbers honest: only use values measured in your own run.

## 8. Judge-style one-liners (memorize)
- *Problem:* "Honeypot data never becomes an analyst decision."
- *Solution:* "One incident, one screen, one click."
- *Novel:* "Honeytokens in real systems plus real-asset correlation."
- *Feasible:* "`docker compose up`, fully offline."
- *Safe:* "Decoys share no network with production."
