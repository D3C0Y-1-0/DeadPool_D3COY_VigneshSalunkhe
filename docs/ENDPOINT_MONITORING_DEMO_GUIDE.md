# MIRAGE / TrapNet — Remote Endpoint Monitoring Demonstration Guide

This guide explains **how to demonstrate the Remote Endpoint Log Collection and Monitoring capability directly in the UI** and through live agents to evaluators, judges, and security analysts.

---

## 1. System Architecture & Key Innovations

```
 [ REMOTE WORKSTATION / LAPTOP ]            [ REMOTE LINUX SERVER ]
  Windows 10/11 / Windows Server             Ubuntu / Debian Linux
  EventLog (4625, 4720, 4624)                systemd journald / auth.log
              |                                          |
              +--------------------+---------------------+
                                   |
                                   | Outbound HTTPS / TLS
                                   | (ZERO open inbound ports on endpoints)
                                   v
             +---------------------------------------------+
             |         MIRAGE CENTRAL SOC BACKEND          |
             | - Outbound Bearer Token Authentication      |
             | - SQLite Local Queue Buffer (offline-first) |
             | - Automatic Secret & Credential Redaction   |
             | - MITRE ATT&CK Classification & Scoring     |
             | - Deception HoneyNet Cross-Correlation      |
             +---------------------------------------------+
                                   |
                                   v
             +---------------------------------------------+
             |            MIRAGE SOC DASHBOARD             |
             | - Remote Endpoint Fleet Command             |
             | - Live Security Log Telemetry Stream        |
             | - 1-Click Interactive Attack Simulators     |
             | - Honeypot-to-Endpoint Lateral Pivot Alert  |
             +---------------------------------------------+
```

### Highlights for Evaluators:
1. **Zero-Inbound-Port Footprint:** Monitored laptops and servers never open ports to the internet or corporate WAN. The agent initiates all connections outbound over encrypted TLS.
2. **Offline-Resilient SQLite Ring Queue:** If a laptop disconnects from Wi-Fi or travels offline, the agent safely buffers up to 10,000 security logs locally and flushes with exponential backoff upon reconnection.
3. **Automatic Secret Redaction:** Regex sanitization strips passwords, tokens, API keys, and private certificates before logs reach the database or dashboard.
4. **Deception Cross-Correlation (Every touch is a tell):** If an adversary touches a honeypot decoy (`db-prod-02`, customer portal, or tripwire) and subsequently attempts an intrusion on an authorized employee laptop, MIRAGE automatically triggers a **CRITICAL LATERAL PIVOT** alert with pre-approved firewall blocking and host isolation playbooks!

---

## 2. Demonstrating in the UI (Step-by-Step)

### Step 1: Open Endpoint Monitoring
1. In your browser, navigate to:  
   👉 **`http://localhost:3000/dashboard/endpoint`**  
   *(Or click **"Endpoint Security"** under the **System** section in the left navigation sidebar)*
2. Observe the **Fleet KPI Strip**:
   - **Total Monitored Endpoints:** Shows Windows and Linux breakdown (e.g., `CORP-W11-FINANCE`, `SRV-PROD-APP01`, `LAPTOP-SEC-DEV`).
   - **Online Fleet Status:** Pulsating green indicator showing active outbound heartbeats.
   - **Security Events Ingested:** Real-time log count received over zero-port architecture.
   - **Deception Cross-Alerts:** Active lateral movement correlation status.

---

### Step 2: Showcase the 1-Click Attack Simulators
At the top-right of the **Endpoint Monitoring** page, you have **instant demonstration buttons** to trigger realistic scenarios without needing external VMs:

#### Scenario A: Windows Event 4625 Brute-Force Spray
1. Click the button: **`⚡ Simulate Windows 4625`**
2. **What happens immediately:**
   - 4 rapid Windows Security Event 4625 (Logon Failure) events are generated against `CORP-W11-FINANCE` for targets `Administrator`, `finance_admin`, and `svc_payroll`.
   - The correlation engine detects a credential attack surge.
   - A toast notification appears: `⚡ Windows Event 4625 Brute-Force Spray: 4 events logged, 1 alert triggered!`
3. Switch to the **"Live Security Log Stream"** tab to see the events stream in with glowing severity badges.

#### Scenario B: Unauthorized Backdoor User Account Creation
1. Click the button: **`⚡ Simulate Backdoor User`**
2. **What happens immediately:**
   - Emits a Linux `useradd` / Event 4720 security event: `useradd[41829]: new user added to local shadow: name=backdoor_admin, UID=0, GID=0`.
   - Tagged as **CRITICAL** persistence alert (MITRE T1136.001 - Local Account Creation).
3. Click **"Raw JSON"** on the event to show evaluators that passwords and sensitive fields are sanitized.

#### Scenario C: Honeypot-to-Endpoint Lateral Pivot (The "Killer" Feature)
1. Click the button: **`⚡ Trigger Deception Pivot`**
2. **What happens immediately:**
   - MIRAGE takes an adversary IP that was previously captured probing the Cowrie SSH honeypot (`db-prod-02`) and simulates that same attacker attempting to access employee workstation `LAPTOP-SEC-DEV` via RDP/WinRM!
   - Switch to the **"Honeypot-to-Endpoint Pivot Detections"** tab.
   - A critical banner and card appears:
     - **Title:** `CRITICAL LATERAL PIVOT: Decoy Attacker targeting LAPTOP-SEC-DEV`
     - **Severity:** 98/100 CRITICAL
     - **Automated Recommendations:** Firewall Block Hostile IP + Isolate Target Endpoint Subnet.
     - **One-click Investigation:** Link directly into the Incident Command Center!

---

### Step 3: Demonstrating the 1-Click Enrollment Wizard
1. Click the blue button: **`+ Enroll Endpoint`**
2. The interactive modal opens:
   - Toggle between **Windows 10/11** and **Ubuntu/Debian Linux**.
   - Enter a computer name (e.g., `CFO-SURFACE-PRO`).
   - Click **"Generate Enrollment Token & Install Command"**.
3. Point out the generated 1-line command:
   ```powershell
   python -m mirage_agent.main run --server http://localhost:8000 --token "<one_time_token>"
   ```
4. Click **"Copy Command"** and close. The new device immediately appears in the fleet table!

---

### Step 4: Demonstrating Fleet Actions
In the **"Connected Fleet"** table:
- **`[Simulate]`**: Launch an attack specifically targeted at that computer.
- **`[Key Icon] Rotate`**: Rotates the device's cryptographic bearer token with instant audit logging.
- **`[Trash Icon] Revoke`**: Instantly revokes the agent's authentication, blocking any further log ingestion from that device.

---

## 3. Demonstrating with a Real Live Terminal (Optional CLI)

To demonstrate a live Python agent running on your actual computer:
1. Open a new PowerShell terminal:
   ```powershell
   cd C:\Users\vighn\Desktop\D3DCOY\endpoint-agent
   python -m mirage_agent.main run --server http://localhost:8000
   ```
2. The agent discovers the local Windows machine, establishes outbound TLS session, sends periodic heartbeats, and monitors EventLog channel `Security` for Event IDs 4624, 4625, and 4720.
3. In the UI, the device heartbeat timestamp updates live in real-time!
