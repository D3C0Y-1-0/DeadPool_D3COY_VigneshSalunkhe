# 08 — Dashboard UI/UX Specification

> Goal: a dashboard that looks like a real SOC product, tells a story in seconds, and is buildable in ~10 focused hours.

## 1. Design language
| Token | Value | Use |
|---|---|---|
| Background | `#0a0e17` | App background |
| Panel | `#111827` | Cards |
| Line | `#1f2a3d` | Borders |
| Critical | `#ff3b5c` | Critical severity, real-asset hits |
| High | `#ff8a3d` | High |
| Medium | `#f5c542` | Medium |
| Low | `#3dd6a8` | Low, contained, safe |
| Accent | `#4da3ff` | Links, ATT&CK chips, primary |
| Ink / Mute | `#e6edf7` / `#8a97ad` | Text |
| Fonts | Inter (UI), JetBrains Mono (IPs, commands, IDs) | |

Rules: dark theme only; **color means severity** (never decorative); mono font for anything an analyst might copy; motion only to signal change (new event slide-in, critical pulse, contained fade to green).

## 2. App shell
- **Left rail (64px):** logo (MIRAGE), nav icons: Command Center, Attackers, ATT&CK, Deception Assets, Response.
- **Top bar:** global search (IP / technique), live indicator ("● LIVE" green when WS connected), time (UTC), **Demo Control** button.
- **Footer strip:** ATT&CK version, "Lab mode: isolated" badge (reinforces safety).

## 3. Screen 1 — Command Center (`/`)
Purpose: 5-second situational awareness.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ KPI: Raw events | Incidents | Critical open | Noise suppressed % | Contained│
├────────────────────────────┬──────────────────────────────────────────────┤
│ PRIORITY ALERT QUEUE       │  THREAT MAP (attacker countries, pulsing)     │
│ (sorted by severity/score) │                                              │
│ ● CRIT 100  203.0.113.50 … ├──────────────────────────────────────────────┤
│ ● MED   45  198.51.100.4 … │  SEVERITY DONUT   |  ATT&CK TOP TECHNIQUES    │
├────────────────────────────┴──────────────────────────────────────────────┤
│ LIVE EVENT FEED (newest first, color-coded by zone and severity)           │
└───────────────────────────────────────────────────────────────────────────┘
```
Details:
- **KPI cards** animate numbers on change. "Noise suppressed" card shows `raw → incidents` (e.g., `412 → 9`).
- **Alert queue row:** severity pill, score, IP (mono), country flag, verdict icon (🎯 targeted / 🌐 opportunistic), stage chip, "REAL ASSET" red tag, status. Click → Incident page. New row slides in from top; critical rows pulse.
- **Threat map:** d3-geo world with dots at country centroids; size by incident count; critical pulses red. Fallback: horizontal bars by country.
- **Live feed row:** `14:32:07  cowrie  db-prod-02  203.0.113.50  $ cat /srv/backups/customer_data_2026.csv  [T1005]`. Production-zone events get a red left border.

## 4. Screen 2 — Incident / Attack Chain (`/incident/:id`) ★ THE DEMO SCREEN
Everything from the PS example visible without scrolling on a 1080p screen (use a compact grid).

Layout, top to bottom:
1. **Header:** severity badge (pulsing if critical & not contained), score, IP, country/ASN, verdict, status (open/contained).
2. **Kill-chain progress bar:** 7 segments; reached ones filled, current one highlighted.
3. **Narrative strip:** auto summary sentence.
4. **Attack-chain graph (React Flow):** nodes are stages in time order; decoy-zone nodes in panel color on the top row, **production-zone nodes in red on the lower row** — the visual shows the attacker "crossing the line" from decoy to real.
5. **Three panels:** Why this score (factor list with +/−) | ATT&CK technique chips (linked) | Real-asset check (green "No contact" or red event list).
6. **Two panels:** Session transcript (terminal look, timestamps) | Recommended response (Approve / Dry-run / Export).

Interactions:
- Hover technique chip → tooltip with tactic.
- Click chain node → highlights matching timeline/transcript lines.
- **Approve block** → button spinner → row shows result text (`Blocklist updated. Equivalent: nft add element …`) → header status animates to **CONTAINED** (green), pulse stops, toast "Attacker dropped at prod firewall".
- **Replay** button (P2) opens xterm drawer.

## 5. Screen 3 — Attacker Profiles (`/attackers`)
Table: IP, country, verdict, score, cadence, tools (SSH client), #decoys touched, #creds tried, first/last seen, status. Row expand → full profile card with creds list and sessions. Filter chips: Targeted / Opportunistic / Contained.

## 6. Screen 4 — ATT&CK Matrix (`/attack`)
Columns = tactics (only ones observed + a few greyed), cards = techniques with count badge; heat color by count; click → incidents list using it. Header: "ATT&CK vX · observed N techniques". Great for "mapping" judging criterion.

## 7. Screen 5 — Deception Assets (`/assets`) (P2/P3)
Cards for each decoy: name, service, status, last touched, #interactions, honeytokens planted, and a **"production isolation: verified ✔"** line (from last isolation-test run). Adds credibility.

## 8. Screen 6 — Response & Intel (`/response`) (P2)
Action audit log (who approved what, when, dry-run vs executed), IOC list with export buttons (STIX 2.1, CSV, blocklist, ECS NDJSON).

## 9. Demo Control drawer
Buttons: **Launch Noise Storm**, **Launch Targeted Attack**, **Reset Demo**; status text ("Attacker simulator running…"). Label clearly "Lab simulator — authorised isolated environment".

## 10. Empty/loading/error states (polish that judges notice)
- Empty feed: "Waiting for the first touch on a decoy… nothing legitimate should ever land here."
- WS disconnect: yellow "Reconnecting…" pill; auto retry.
- No incidents: radar-style animation.

## 11. Responsive & performance
- Target 1920×1080 and a 13" laptop (1366×768): use `min-w` grid with horizontal scroll fallback.
- Cap in-memory feed at 200 rows; virtualization not needed.
- Avoid heavy map tiles; use vector world-atlas.

## 12. Accessibility & polish checklist
- [ ] Severity not conveyed by color alone (text label in pill)
- [ ] Contrast ≥ 4.5:1 for body text
- [ ] Consistent spacing scale (4/8/12/16/24)
- [ ] Mono font for IPs/commands
- [ ] Smooth but short animations (≤300 ms), `prefers-reduced-motion` respected
- [ ] No lorem ipsum, no placeholder data in the final run

## 13. Screenshot list for the PPT (capture after H20)
1. Command Center with live feed and mixed severities
2. Incident page — Critical, real-asset red, kill-chain at Lateral
3. Same incident after **Contained**
4. ATT&CK matrix heatmap
5. Attacker profile table
6. Isolation test script output
7. STIX export open in editor
8. Architecture diagram (from file 03)
