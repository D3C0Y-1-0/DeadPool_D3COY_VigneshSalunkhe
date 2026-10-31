# MIRAGE — Deception-Driven SOC Platform
### *"Every touch is a tell."*

> PS 04: Deception-Driven Threat Detection and Response — a SOC dashboard powered by a honeypot network

This pack contains everything needed to **understand, build, demo, and pitch** the solution inside a 24-hour hackathon.

## File map (read in this order)

| # | File | Purpose | Who needs it |
|---|------|---------|--------------|
| 01 | `01_PS_UNDERSTANDING.md` | Problem breakdown, requirements matrix, hidden judging criteria | Everyone |
| 02 | `02_SOLUTION_INNOVATION_UNIQUENESS.md` | The idea, differentiators, "why we win" | Everyone |
| 03 | `03_ARCHITECTURE_DIAGRAMS.md` | Mermaid diagrams: system, data flow, network, sequence, ER | Dev + PPT |
| 04 | `04_TECH_STACK_AND_RESEARCH.md` | Tool choices with justification, research notes | Dev |
| 05 | `05_DEVELOPMENT_ROADMAP_24H.md` | Phase-by-phase, priority-wise plan, hour-by-hour, team split, cut lines | Team lead |
| 06 | `06_IMPLEMENTATION_GUIDE_STEP_BY_STEP.md` | Setup + code skeletons for every component | Dev |
| 07 | `07_DETECTION_SCORING_CORRELATION_LOGIC.md` | Classification, ATT&CK map, scoring, correlation, profiling | Backend/Sec |
| 08 | `08_DASHBOARD_UI_UX_SPEC.md` | Screens, components, visual design system | Frontend |
| 09 | `09_SAFETY_ISOLATION_CONTAINMENT.md` | How the honeypot can never become a pivot | Sec + Docs |
| 10 | `10_DEMO_SIMULATION_AND_TEST_PLAN.md` | Attack simulator, scenarios, acceptance tests | Everyone |
| 11 | `11_INCIDENT_RESPONSE_WORKFLOW_AND_DOCS.md` | Submission documentation: design, isolation, logic, IR workflow | Docs |
| 12 | `12_PPT_CONTENT.md` | Slide-by-slide content | PPT owner |
| 13 | `13_PRESENTATION_PITCH_SCRIPT.md` | Timed spoken script + stage plan | Presenter |
| 14 | `14_DEMO_VIDEO_SCRIPT_AND_STORY.md` | Story, storyboard, voice-over, shot list | Video owner |
| 15 | `15_JUDGE_QA_RISKS_CHECKLIST.md` | Tough Q&A, risk register, final checklist | Everyone |

## One-paragraph summary
**MIRAGE** deploys a network of decoys (an SSH "production database server", a fake customer-data web portal, a fake MySQL/FTP service) plus **honeytokens planted in the real environment**. Every interaction is normalized into a SIEM-style schema, grouped into sessions, classified, mapped to **MITRE ATT&CK** and the kill chain, scored, and **correlated against real firewall/auth telemetry**. Analysts see **one incident = one attack chain on one screen**, with a verdict (noise vs. targeted), severity, attacker profile, replayable command transcript, and **one-click, human-approved response** (block, isolate, IOC/STIX export) — with a live "attacker gets cut off" moment in the demo.

## Quick start (once built)
```bash
git clone <your-repo> mirage && cd mirage
docker compose up -d --build
open http://localhost:5173        # SOC dashboard
# In dashboard: Demo Control -> "Launch Targeted Attack"
```

## Notes on accuracy
- Tool versions and ATT&CK numbering change often. As of late Oct 2026 ATT&CK v19 (Apr 2026) restructured Defense Evasion into **Stealth** and **Impair Defenses**, and v20 has been reported for Oct 2026. Technique IDs used here (T1110, T1078, T1059.004, …) are long-standing, but keep the mapping in a YAML file and **verify tactic names at https://attack.mitre.org** before the demo.
- Code in file 06 is a reference skeleton. Treat it as a head start; test each piece.
- Run all attack simulation **only in your isolated lab network**.
