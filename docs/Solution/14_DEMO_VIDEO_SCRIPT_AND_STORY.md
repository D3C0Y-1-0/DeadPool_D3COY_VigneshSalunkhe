# 14 — Demo Video Script, Story & Storyboard

**Length:** 3:00 (hard cap 3:30) · **Format:** 1080p screen capture + light motion graphics + voice-over · **Tone:** calm, confident, cinematic-but-real.

## 1. The story (narrative spine)

### Characters
- **Maya** — SOC analyst on the night shift. Tired, drowning in alerts.
- **"Marcus"** (the attacker, never shown, just an IP: `203.0.113.50`) — patient, human, looking for customer data.
- **MIRAGE** — the quiet system that turns noise into a decision.

### Three-act structure
| Act | Time | Beat |
|---|---|---|
| **1. Chaos** | 0:00–0:30 | Maya's console: thousands of alerts. Can't tell what matters. Attackers dwell for days. |
| **2. The Trap** | 0:30–2:20 | The fabric catches Marcus step by step; the incident grows into one attack chain; he reuses a bait credential on a real server → Critical. |
| **3. Resolution** | 2:20–3:00 | Maya reads one screen, clicks Approve, Marcus is dropped. Safety proof. Closing line. |

**Emotional arc:** overwhelm → clarity → control.
**Theme line:** *"Every touch is a tell."*

## 2. Shot list & storyboard (with voice-over)

| # | Time | Visual | On-screen text | Voice-over (VO) | Sound |
|---|---|---|---|---|---|
| 1 | 0:00–0:08 | Black → rows of grey alerts scrolling fast; clock reads 03:07 | "03:07 AM" | "It's 3 AM. Maya's console shows four thousand eight hundred and twelve alerts." | Low hum, keyboard clicks |
| 2 | 0:08–0:18 | One row turns red but disappears in the scroll | "1 is real." | "One of them is a real attacker. It looks exactly like the others." | Tick, then silence beat |
| 3 | 0:18–0:30 | Title card MIRAGE, tagline fades in | **MIRAGE — Every touch is a tell.** | "Honeypots give certainty: nothing legitimate ever touches a decoy. MIRAGE turns that certainty into action." | Soft synth swell |
| 4 | 0:30–0:45 | Architecture animation (file 03 diagram, zones light up one by one) | "Decoys · Pipeline · ATT&CK · Correlation · Response" | "We deploy a deception fabric, an SSH database server, a customer portal, MySQL and FTP, plus bait credentials planted in real systems." | Light ticks per zone |
| 5 | 0:45–0:55 | Dashboard Command Center, calm. Click **Noise Storm** | "Opportunistic noise" | "First, the internet being the internet." | — |
| 6 | 0:55–1:10 | Feed floods, KPI shows raw events → few incidents, all Low/Medium, 🌐 icons | KPI: "[X] events → [Y] incidents" | "Hundreds of events collapse into a few low-priority incidents. Nobody gets paged." | Rapid ticks, then settle |
| 7 | 1:10–1:20 | Click **Targeted Attack**; terminal side-by-side shows attacker logs (small PIP) | "Now, someone different." | "Now, a different visitor." | Tension tone |
| 8 | 1:20–1:35 | Scan → new Low incident appears → login success → turns High; kill-chain bar advances | "Recon → Initial Access" | "He scans the network, finds a decoy database, tries default credentials, and gets in." | Notification blips |
| 9 | 1:35–1:55 | Incident page: transcript lines typing `ls`, `cat notes.txt`, `cat customer_data…`; technique chips pop in | "T1083 · T1552.001 · T1005" | "Every command is captured and mapped to MITRE ATT&CK. He lists files, reads the notes, and downloads the 'customer data'." | Typing sounds |
| 10 | 1:55–2:10 | Chain graph adds a **red node on the lower row** (production); header flashes **CRITICAL**; real-asset panel populates | "Real asset touched" · "Honeytoken used" | "Then he uses a credential he found inside the decoy… on a real server. MIRAGE checks production logs: same source, confirmed lateral movement. Critical." | Alarm-ish low pulse (subtle) |
| 11 | 2:10–2:25 | Recommended actions panel; click **Dry-run**, then **Approve** | "Human approved" | "One screen: who, what, how far, and what to do. The analyst previews the action, then approves the block." | Click sound |
| 12 | 2:25–2:38 | Header flips to **CONTAINED** (green); attacker terminal: "CONNECTION DROPPED"; STIX export opens | "Contained · STIX 2.1" | "Attacker dropped at the firewall. Indicators exported in STIX to share with the community." | Resolution chord |
| 13 | 2:38–2:50 | Isolation test terminal with PASS lines; network matrix | "Decoys share no network with production" | "And the honeypot can never be a pivot: isolated networks, no egress, one-way logs." | — |
| 14 | 2:50–3:00 | Logo + tagline + team name + GitHub link | **Every touch is a tell.** | "MIRAGE. Other tools tell you something touched a decoy. We tell you what to do about it." | Fade out |

## 3. Full voice-over script (read-through, ~2:45 at calm pace ≈ 330 words)

> It's 3 AM. Maya's console shows four thousand eight hundred and twelve alerts. One of them is a real attacker, and it looks exactly like the others.
>
> Honeypots give certainty: nothing legitimate ever touches a decoy. MIRAGE turns that certainty into action.
>
> We deploy a deception fabric: an SSH database server, a customer portal, MySQL and FTP services, plus bait credentials planted in real systems. Every interaction is captured, normalized into a SIEM-style pipeline, mapped to MITRE ATT&CK, scored, and correlated with real production logs.
>
> First, the internet being the internet. Hundreds of events collapse into a few low-priority incidents. Nobody gets paged.
>
> Now, a different visitor. He scans the network, finds a decoy database, tries default credentials, and gets in. Every command is captured and mapped to ATT&CK. He lists files, reads the notes, and downloads the customer data. It's fake.
>
> Then he uses a credential he found inside the decoy, on a real server. MIRAGE checks production logs: same source, confirmed lateral movement. Critical.
>
> One screen: who, what, how far, and what to do. The analyst previews the action, then approves the block. Attacker dropped. Indicators exported in STIX to share.
>
> And the honeypot can never be a pivot: isolated networks, no egress, one-way logs.
>
> MIRAGE. Other tools tell you something touched a decoy. We tell you what to do about it. Every touch is a tell.

(Replace "four thousand eight hundred and twelve" framing with a clearly *illustrative* number, and the "[X] events → [Y] incidents" overlay with measured values.)

## 4. Recording checklist
**Setup**
- [ ] Clean stack (`down -v && up -d --build`), warm-up once, then reset
- [ ] 1920×1080, browser zoom 110%, hide bookmarks bar, Do Not Disturb on
- [ ] Cursor highlighter on; font sizes readable at 720p
- [ ] Terminal PIP window prepared (`docker compose logs -f attacker-sim`)

**Takes**
- [ ] Record **Noise Storm** segment separately
- [ ] Record **Targeted Attack** in one continuous take (≈2 min), 3 takes, keep the best
- [ ] Record the Approve → Contained moment separately (can re-run on a fresh reset)
- [ ] Record isolation test and architecture animation separately

**Editing (CapCut / DaVinci / Clipchamp)**
- [ ] Speed up waiting gaps (1.5–2×), keep key reveals at 1×
- [ ] Add zoom-ins (110–130%) on: severity badge, real-asset panel, CONTAINED
- [ ] Callout boxes/arrows for ATT&CK chips and red node
- [ ] Captions burned in (many judges watch muted)
- [ ] Background music at −25 dB under VO; no copyrighted tracks (use royalty-free)
- [ ] Export H.264 1080p, ≤100 MB; also a 60-second cut for social/README GIF

**Voice-over tips**
- Record in a quiet room with a phone mic 15 cm away; do 2–3 passes; normalize audio; remove clicks.
- Slow down at "Critical" and "Contained."

## 5. 60-second cut (for README/GIF/social)
Shots 3 → 8 → 10 → 12 → 14 with VO lines: hook, "default credentials and gets in", "credential from the decoy used on a real server, Critical", "attacker dropped", tagline.

## 6. Alt narration for no-voice version (captions only)
1. "4,812 alerts. 1 real attacker."
2. "MIRAGE: decoys + honeytokens + correlation."
3. "Scan → default creds → data theft."
4. "Bait credential reused on a REAL server."
5. "CRITICAL — confirmed lateral movement."
6. "One click. Contained."
7. "Safe by design. Every touch is a tell."

## 7. Thumbnail / cover image
Dark background, the red incident header with "CRITICAL · 100", the kill-chain bar, tagline in white. Text: **"Every touch is a tell."**
