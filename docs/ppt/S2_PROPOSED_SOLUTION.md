# SECTION 2 — Proposed Solution: MIRAGE (Slides 2.1 – 2.7)

---

## Slide 2.1 — Our Idea in One Line
**Title:** *MIRAGE — Every touch is a tell.*

**On-slide content**
- Turn every decoy touch into **one attack story**
- Who · what · how far · did they touch anything real · what to click
- One incident → one screen → one approved click to contain

**Diagram — four-step loop**
```mermaid
flowchart LR
  A["DECEIVE - decoys + honeytokens"] --> B["CAPTURE - every login, command, file"]
  B --> C["CORRELATE - ATT&CK, score, real-asset check"]
  C --> D["RESPOND - approve block, export IOCs"]
  D -. "lessons: new decoys, tuned rules" .-> A
```
**Speaker note:** "Four verbs. That's the whole product."

---

## Slide 2.2 — The Deception Fabric
**Title:** *Believable decoys, instrumented everywhere*

**On-slide content**
| Decoy | Looks like | Captures |
|---|---|---|
| db-prod-02 (Cowrie) | Production DB server over SSH | Logins, every command, file transfers |
| Customer Portal (Flask) | Internal web app | Logins, SQLi/traversal, **downloads + hashes** |
| fileserv-01 (OpenCanary) | MySQL + FTP | Credential attempts |
| Tripwire ports | Telnet, SMB, RDP, VNC, Redis | Scan / connection attempts |
| **Honeytokens** | Bait credentials, canary data | Use anywhere = confirmed attacker |

**Diagram — fabric layers**
```mermaid
flowchart TB
  subgraph L1["Layer 1 - Decoy services - isolated"]
    A1["SSH db-prod-02"]
    A2["Customer portal"]
    A3["MySQL / FTP"]
    A4["Tripwire ports"]
  end
  subgraph L2["Layer 2 - Honeytokens in the REAL environment"]
    B1["Bait credential svc_backup"]
    B2["Canary customer record"]
    B3["Lure path /admin-backup"]
  end
  subgraph L3["Layer 3 - Correlation brain"]
    C1["Pipeline + engine + dashboard"]
  end
  L1 --> L3
  L2 --> L3
```
**Speaker note:** "Decoys catch attackers who explore. Honeytokens catch the ones who already got into real systems."

---

## Slide 2.3 — One Incident, One Screen (the hero slide)
**Title:** *The analyst sees the whole attack chain at once*

**On-slide content:** source & profile · every command · ATT&CK techniques · kill-chain progress · real-asset check · severity · recommended action

**Diagram — wireframe of the incident screen**
```mermaid
flowchart TB
  H["HEADER: CRITICAL 100 | 203.0.113.50 | Targeted | status: open"]
  K["KILL CHAIN: Recon > Access > Execution > Discovery > Collection > Exfil > Lateral"]
  N["NARRATIVE: auto-generated plain-English summary"]
  G["ATTACK-CHAIN GRAPH: decoy nodes top row, PRODUCTION node red on bottom row"]
  subgraph P["Panels"]
    P1["Why this score: +/- factors"]
    P2["ATT&CK chips: T1110, T1078.001, T1083, T1005"]
    P3["Real-asset check: RED event list"]
  end
  subgraph Q["Bottom"]
    Q1["Session transcript: every command"]
    Q2["Response: Dry-run / Approve / STIX export"]
  end
  H --> K --> N --> G --> P --> Q
  style H fill:#ff3b5c,color:#fff
```
**Speaker note:** "This single screen answers every question in the problem statement's example."

---

## Slide 2.4 — Signal vs Noise: the Verdict
**Title:** *Opportunistic noise vs. targeted attacker*

**On-slide content**
- Confidence is free (it's a decoy) — **priority is earned**
- Priority = **Progress** (how far) + **Intent** (targeted?) + **Reach** (real assets?)
- Severity: Low · Medium · High · Critical, each with a visible "why"

**Diagram — decision flow**
```mermaid
flowchart TD
  E["Decoy touched"] --> S["Session + stage + techniques"]
  S --> C{"Cadence and behavior"}
  C -->|"machine speed, wordlist creds, drive-by"| N["OPPORTUNISTIC - Low, auto-IOC, no page"]
  C -->|"human typing, customer-data hunting, multi-decoy"| T["TARGETED - High"]
  T --> R{"Touched a real asset or used a honeytoken?"}
  R -->|"yes"| X["CRITICAL - escalate now"]
  R -->|"no"| Y["High - approve block"]
  style N fill:#3dd6a8,color:#000
  style X fill:#ff3b5c,color:#fff
```
**Speaker note:** "Alert fatigue drops because analysts ask 'how urgent?', not 'is it real?'."

---

## Slide 2.5 — The Differentiator: Real-Asset Correlation
**Title:** *"Did they touch anything real?" — answered automatically*

**On-slide content**
- Same source IP searched across production firewall + auth logs
- Bait credential from a decoy used on a real host = **confirmed lateral movement**
- Auto-escalates to **Critical**

**Diagram — correlation path**
```mermaid
sequenceDiagram
  participant A as Attacker
  participant D as Decoy db-prod-02
  participant P as Production prod-web-01
  participant M as MIRAGE
  A->>D: Login root/root
  A->>D: cat notes.txt - finds svc_backup creds
  D->>M: command events
  A->>P: SSH svc_backup with bait creds
  P->>M: auth event - honeytoken flag + firewall allow
  M->>M: join by source IP across zones
  M-->>M: REAL ASSET TOUCHED - CRITICAL
```
**Speaker note:** "Honeypots alone can't tell you this. Honeytokens in real systems can."

---

## Slide 2.6 — Response That Closes the Loop
**Title:** *Recommend → Dry-run → Approve → Attacker dropped*

**On-slide content**
- Block source · isolate host · rotate bait credentials · hunt queries (SPL/KQL)
- Export IOCs: **STIX 2.1**, CSV, blocklist, ECS NDJSON
- Human approval for anything touching production; allowlist + audit trail

**Diagram — response workflow**
```mermaid
flowchart LR
  I["Incident"] --> R["Recommendations"]
  R --> D["Dry-run: shows exact command"]
  D --> A["Analyst approves"]
  A --> B["Blocklist updated"]
  B --> F["Prod firewall drops attacker"]
  F --> C["Status: CONTAINED"]
  R --> X["Export STIX / CSV"]
  A --> L["Audit log"]
  style C fill:#3dd6a8,color:#000
```
**Speaker note:** "The judges see cause and effect: click, and the attacker's next connection is dropped."

---

## Slide 2.7 — The Demo Story
**Title:** *Watch one attack, start to finish*

**Diagram — demo timeline**
```mermaid
flowchart LR
  A["Noise storm: bots collapse to low incidents"] --> B["Targeted attacker: scan"]
  B --> C["Default creds: High"]
  C --> D["Commands + data download"]
  D --> E["Bait credential on prod: CRITICAL"]
  E --> F["Approve block"]
  F --> G["Contained + STIX"]
```
**Speaker note:** "About 3 minutes live. Everything runs offline in an isolated lab."
