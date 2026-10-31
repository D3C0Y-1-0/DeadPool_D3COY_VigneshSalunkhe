# 06A — Implementation Guide, Part 1: Infrastructure & Deception Layer

> Covers Phases 0–1 (and prod-sim for Phase 5). Reference skeletons: **test every piece**. Keep each step small and verified before moving on.

## 0. Prerequisites
- Docker Engine + Docker Compose v2 (`docker compose version`)
- Node 20+, Python 3.11+, Git
- A **dedicated VM or your laptop with nothing sensitive** (see file 09). Never run on a corporate network.
- ~6 GB RAM free

```bash
mkdir mirage && cd mirage && git init
mkdir -p honeypots/{cowrie,portal,tripwire,opencanary} prod-sim backend frontend sim scripts docs fixtures
cp .env.example .env   # create it first: see below
```
`.env.example`
```
POSTGRES_USER=mirage
POSTGRES_PASSWORD=change_me_locally
POSTGRES_DB=mirage
DATABASE_URL=postgresql+psycopg://mirage:change_me_locally@db:5432/mirage
WEBHOOK_URL=
```

## 1. Network design (decide once, never change)

| Network | Type | Subnet | Members |
|---|---|---|---|
| `attacker_net` | **internal** (no internet) | 172.28.0.0/24 | attacker-sim (.50), noise-sim (.100–.130 aliases), cowrie, portal, tripwire, opencanary |
| `prod_net` | **internal** | 172.29.0.0/24 | prod-sim, attacker-sim (.50, models the attacker's route to prod) |
| `mgmt_net` | normal bridge | default | api/collector, db, web |

> Honeypots are on `attacker_net` only → they have **no network path to prod_net or mgmt_net**.
> Honeypots → SOC only via **read-only shared log volumes**.

**Display-IP aliasing:** simulated attackers have private Docker IPs. The normalizer maps them to documentation-range IPs (RFC 5737: 203.0.113.0/24, 198.51.100.0/24) for display, e.g. `172.28.0.50` and `172.29.0.50` → `203.0.113.50` (same attacker seen from two networks, like NAT). Mention this in docs honestly.

## 2. `docker-compose.yml`

```yaml
name: mirage

networks:
  attacker_net:
    internal: true
    ipam: { config: [{ subnet: 172.28.0.0/24 }] }
  prod_net:
    internal: true
    ipam: { config: [{ subnet: 172.29.0.0/24 }] }
  mgmt_net: {}

volumes:
  cowrie_logs: {}
  portal_logs: {}
  canary_logs: {}
  tripwire_logs: {}
  prod_logs: {}
  blocklist: {}
  sim_cmd: {}
  pgdata: {}

x-hardened: &hardened
  cap_drop: [ALL]
  security_opt: ["no-new-privileges:true"]
  pids_limit: 128
  mem_limit: 256m
  restart: unless-stopped

services:
  cowrie:
    <<: *hardened
    image: cowrie/cowrie:latest
    hostname: db-prod-02
    networks: [attacker_net]
    volumes:
      - cowrie_logs:/cowrie/cowrie-git/var/log/cowrie
      - ./honeypots/cowrie/cowrie.cfg:/cowrie/cowrie-git/etc/cowrie.cfg:ro
      - ./honeypots/cowrie/userdb.txt:/cowrie/cowrie-git/etc/userdb.txt:ro
      - ./honeypots/cowrie/honeyfs:/cowrie/cowrie-git/honeyfs:ro

  portal:
    <<: *hardened
    build: ./honeypots/portal
    networks: [attacker_net]
    volumes: [ "portal_logs:/logs" ]
    read_only: true
    tmpfs: [/tmp]

  tripwire:
    <<: *hardened
    build: ./honeypots/tripwire
    networks: [attacker_net]
    volumes: [ "tripwire_logs:/logs" ]
    read_only: true

  opencanary:
    build: ./honeypots/opencanary          # P1, can be removed if time is short
    networks: [attacker_net]
    cap_drop: [ALL]
    cap_add: [NET_BIND_SERVICE]
    security_opt: ["no-new-privileges:true"]
    mem_limit: 256m
    pids_limit: 128
    volumes: [ "canary_logs:/logs" ]
    restart: unless-stopped

  prod-sim:
    <<: *hardened
    build: ./prod-sim
    hostname: prod-web-01
    networks: [prod_net]
    cap_add: [NET_BIND_SERVICE]
    volumes:
      - prod_logs:/logs
      - blocklist:/shared:ro

  db:
    image: postgres:16
    env_file: .env
    networks: [mgmt_net]
    volumes: [ "pgdata:/var/lib/postgresql/data" ]
    restart: unless-stopped

  api:
    build: ./backend
    env_file: .env
    networks: [mgmt_net]
    depends_on: [db]
    ports: ["8000:8000"]
    volumes:
      - cowrie_logs:/in/cowrie:ro
      - portal_logs:/in/portal:ro
      - canary_logs:/in/canary:ro
      - tripwire_logs:/in/tripwire:ro
      - prod_logs:/in/prod:ro
      - blocklist:/shared            # API writes blocklist
      - sim_cmd:/sim_cmd             # API writes trigger files
    restart: unless-stopped

  web:
    build: ./frontend
    networks: [mgmt_net]
    ports: ["5173:80"]
    depends_on: [api]

  attacker-sim:
    build: ./sim
    networks:
      attacker_net: { ipv4_address: 172.28.0.50 }
      prod_net:     { ipv4_address: 172.29.0.50 }
    volumes: [ "sim_cmd:/sim_cmd:ro" ]
    command: ["python", "watcher.py", "targeted"]

  noise-sim:
    build: ./sim
    networks:
      attacker_net: { ipv4_address: 172.28.0.99 }
    cap_add: [NET_ADMIN]                 # only to add source-IP aliases, lab only
    volumes: [ "sim_cmd:/sim_cmd:ro" ]
    command: ["python", "watcher.py", "noise"]
```
> **Isolation note:** `attacker-sim` and `noise-sim` are **not** on `mgmt_net`. The API triggers them via a file in the one-way `sim_cmd` volume.

## 3. SSH honeypot: Cowrie (preferred)

### 3.1 `honeypots/cowrie/cowrie.cfg`
```ini
[honeypot]
hostname = db-prod-02
auth_class = UserDB

[ssh]
enabled = true
listen_endpoints = tcp:2222:interface=0.0.0.0
version = SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.6

[telnet]
enabled = false

[output_jsonlog]
enabled = true
logfile = ${honeypot:log_path}/cowrie.json
```
Cowrie loads its defaults then overrides with `cowrie.cfg`, so this minimal file is enough.

### 3.2 `honeypots/cowrie/userdb.txt` (simulate weak/default creds)
```
root:x:root
root:x:toor
admin:x:admin123
dbadmin:x:Passw0rd
```
(Format `user:x:password`. Check your Cowrie version's docs for wildcard `*` and negation `!` syntax.)

### 3.3 Lure files (the "fake customer data" & bait)
Content (kept in `honeypots/cowrie/honeyfs/`):
- `srv/backups/customer_data_2026.csv` — **generated fake rows** (no real PII), include canary email `ht001.canary@acme-corp.example` as honeytoken **HT-CUST-001**.
- `home/dbadmin/notes.txt`:
  ```
  TODO: rotate prod-web-01 backup creds
  svc_backup / Bkp!2026#vault   (temp, ask infra)
  db: mysql -u root -p  (see /srv/backups)
  ```
  → **Honeytoken HT-CRED-001** (`svc_backup`). Any use of it anywhere = confirmed attacker.
- `root/.mysql_history` with a few plausible queries.

Make these files **visible in the fake filesystem** with Cowrie's `fsctl` tool (see Cowrie docs "Fake filesystem": `bin/fsctl share/cowrie/fs.pickle`; commands such as `mkdir`, `touch`, `chmod`, `save`). Content is served from `honeyfs/<path>`.

Fake data generator (run once, commit output):
```python
# scripts/gen_customers.py
import csv, random
first = ["Aarav","Diya","Rohan","Sneha","Karan","Meera","Ishaan","Anaya","Vikram","Neha"]
last  = ["Sharma","Patel","Iyer","Reddy","Singh","Nair","Gupta","Das","Mehta","Joshi"]
with open("honeypots/cowrie/honeyfs/srv/backups/customer_data_2026.csv","w",newline="") as f:
    w = csv.writer(f); w.writerow(["id","name","email","card_last4","balance"])
    for i in range(1,201):
        n=f"{random.choice(first)} {random.choice(last)}"
        w.writerow([i,n,f"user{i}@acme-corp.example",random.randint(1000,9999),round(random.uniform(10,9000),2)])
    w.writerow([201,"Canary Test","ht001.canary@acme-corp.example",0000,0.0])
```
All data is synthetic. `.example` is a reserved domain.

### 3.4 Verify
```bash
docker compose up -d cowrie
ssh -p 2222 root@localhost     # not reachable if internal network: test from sim container (see 06C) or temporarily expose
docker compose exec cowrie tail -n 5 /cowrie/cowrie-git/var/log/cowrie/cowrie.json
```
Because `attacker_net` is internal, host ports are not published. For *development only*, temporarily add `ports: ["2222:2222"]` to cowrie on a **separate dev compose override file** (`docker-compose.dev.yml`), not in the final demo config.

### 3.5 Fallback: custom asyncssh honeypot (if Cowrie eats > 60–75 min)
Same JSON log shape as Cowrie (`eventid`, `src_ip`, `session`, `timestamp`, `username`, `password`, `input`), so the parser is unchanged.

```python
# honeypots/cowrie/mini_ssh.py  (pip install asyncssh)
import asyncio, asyncssh, json, time, uuid
LOG = "/logs/cowrie.json"
FS = {"/": ["srv", "home", "etc"], "/srv": ["backups"], "/srv/backups": ["customer_data_2026.csv"],
      "/home": ["dbadmin"], "/home/dbadmin": ["notes.txt"]}
FILES = {"/srv/backups/customer_data_2026.csv": open("customer_data_2026.csv").read(),
         "/home/dbadmin/notes.txt": open("notes.txt").read()}
WEAK = {("root", "root"), ("root", "toor"), ("admin", "admin123"), ("dbadmin", "Passw0rd")}

def emit(eventid, session, ip, **kw):
    rec = {"eventid": eventid, "session": session, "src_ip": ip,
           "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000000Z", time.gmtime()), **kw}
    with open(LOG, "a") as f: f.write(json.dumps(rec) + "\n")

class Srv(asyncssh.SSHServer):
    def connection_made(self, conn):
        self.ip = conn.get_extra_info("peername")[0]; self.sid = uuid.uuid4().hex[:12]
        emit("cowrie.session.connect", self.sid, self.ip)
    def begin_auth(self, username): return True
    def password_auth_supported(self): return True
    def validate_password(self, u, p):
        ok = (u, p) in WEAK
        emit("cowrie.login.success" if ok else "cowrie.login.failed", self.sid, self.ip, username=u, password=p)
        return ok

async def shell(proc):
    srv = proc.get_extra_info("connection")._owner  # may differ by asyncssh version; store sid on proc if needed
    cwd = "/home/dbadmin"; proc.stdout.write("dbadmin@db-prod-02:~$ ")
    async for line in proc.stdin:
        cmd = line.strip()
        if not cmd: proc.stdout.write("$ "); continue
        emit("cowrie.command.input", srv.sid, srv.ip, input=cmd)
        out = ""
        if cmd.startswith("ls"):
            path = cmd.split()[-1] if len(cmd.split()) > 1 else cwd
            out = "  ".join(FS.get(path.rstrip("/") or "/", []))
        elif cmd.startswith("cat "): out = FILES.get(cmd.split()[1], "cat: No such file")
        elif cmd == "whoami": out = "dbadmin"
        elif cmd.startswith("uname"): out = "Linux db-prod-02 5.15.0-91-generic x86_64"
        elif cmd == "exit": break
        proc.stdout.write(out + "\n$ ")
    proc.exit(0)

async def main():
    await asyncssh.create_server(Srv, "", 2222, server_host_keys=["ssh_host_key"], process_factory=shell)
    await asyncio.Event().wait()
asyncio.run(main())
```
(Generate host key: `ssh-keygen -t ed25519 -f ssh_host_key -N ""`. Adjust the `conn` ↔ session lookup for your asyncssh version.)

## 4. Decoy web portal (custom Flask) — explicit downloads + honeytoken IDs

`honeypots/portal/app.py`
```python
import json, time, re, hashlib, io, csv, random
from flask import Flask, request, redirect, make_response, Response, render_template_string

LOG = "/logs/portal.json"
app = Flask(__name__)
SQLI = re.compile(r"('|--|\bor\b\s+1=1|union\s+select|sleep\()", re.I)
TRAV = re.compile(r"(\.\./|%2e%2e)", re.I)

def log(**kw):
    kw["ts"] = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + f".{int(time.time()*1000)%1000:03d}Z"
    kw["src_ip"] = request.remote_addr
    kw["ua"] = request.headers.get("User-Agent", "")
    with open(LOG, "a") as f: f.write(json.dumps(kw) + "\n")

def csv_bytes():
    random.seed(7)
    buf = io.StringIO(); w = csv.writer(buf); w.writerow(["id","name","email","card_last4","balance"])
    for i in range(1, 201):
        w.writerow([i, f"Customer {i}", f"user{i}@acme-corp.example", random.randint(1000,9999), round(random.uniform(10,9000),2)])
    w.writerow([201, "Canary Test", "ht001.canary@acme-corp.example", "0000", "0.00"])
    return buf.getvalue().encode()

PAGE = "<h2>ACME Corp — Customer Data Portal</h2><form method=post>User <input name=u><br>Pass <input name=p type=password><br><button>Login</button></form>"
DASH = "<h2>Customer Exports</h2><ul><li><a href='/download/customer_data_2026.csv'>customer_data_2026.csv</a></li></ul>"

@app.route("/")
def index(): return redirect("/login")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        u, p = request.form.get("u", ""), request.form.get("p", "")
        flags = [n for n, rx in (("sqli", SQLI), ("traversal", TRAV)) if rx.search(u + p)]
        ok = (u, p) in {("admin", "admin"), ("admin", "Welcome1")}
        log(action="login", user=u, password=p, outcome="success" if ok else "failure", flags=flags)
        if ok:
            r = make_response(redirect("/dashboard")); r.set_cookie("sid", "demo"); return r
    return render_template_string(PAGE)

@app.route("/dashboard")
def dash():
    log(action="web_request", path="/dashboard"); return DASH

@app.route("/download/customer_data_2026.csv")
def download():
    data = csv_bytes()
    log(action="download", path=request.path, honeytoken_id="HT-CUST-001",
        file={"name": "customer_data_2026.csv", "size": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    return Response(data, mimetype="text/csv")

@app.route("/robots.txt")
def robots(): return "User-agent: *\nDisallow: /admin-backup/\n"

@app.route("/admin-backup/")
def lure():
    log(action="web_request", path=request.path, flags=["lure_path"]); return "403 Forbidden", 403

@app.after_request
def trace(r):
    if request.path not in ("/login", "/dashboard", "/admin-backup/") and not request.path.startswith("/download"):
        log(action="web_request", path=request.full_path, status=r.status_code)
    return r

if __name__ == "__main__":
    app.run("0.0.0.0", 8080)
```
`honeypots/portal/Dockerfile`
```dockerfile
FROM python:3.11-slim
RUN pip install --no-cache-dir flask gunicorn && useradd -m app
WORKDIR /app
COPY app.py .
USER app
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app"]
```
Note: the `/logs` volume must be writable by uid of `app`; add `chown` via an init step or set `user: "0:0"` for the lab (document the trade-off) if permission errors appear. The Docker network is internal, so Gunicorn on :8080 is reachable from the simulator only; the simulator's scan will also probe :80 → add a socat/redirect or run the portal on 80 with `NET_BIND_SERVICE`. Simplest: simulator targets 8080.

## 5. Tripwire: generic decoy ports (feeds scan detection)

`honeypots/tripwire/tripwire.py`
```python
import asyncio, json, time
PORTS = {23: "telnet", 445: "smb", 3389: "rdp", 5900: "vnc", 6379: "redis", 9200: "elasticsearch"}
def log(**kw):
    kw["ts"] = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + ".000Z"
    with open("/logs/tripwire.json", "a") as f: f.write(json.dumps(kw) + "\n")
def make(port, name):
    async def h(r, w):
        ip, sp = w.get_extra_info("peername")[:2]
        log(action="connect", src_ip=ip, src_port=sp, dst_port=port, service=name)
        w.close()
    return h
async def main():
    for p, n in PORTS.items():
        await asyncio.start_server(make(p, n), "0.0.0.0", p)
    await asyncio.Event().wait()
asyncio.run(main())
```
Ports below 1024 need `cap_add: [NET_BIND_SERVICE]` or use high ports (e.g., 2323, 4445…) mapped for the demo. For simplicity use high decoy ports and have the simulator scan those.

## 6. OpenCanary (P1: MySQL/FTP login capture)

`honeypots/opencanary/Dockerfile`
```dockerfile
FROM python:3.11-slim
RUN pip install --no-cache-dir opencanary scapy
RUN mkdir -p /etc/opencanaryd /logs
COPY opencanary.conf /etc/opencanaryd/opencanary.conf
CMD ["opencanaryd", "--dev"]
```
Generate a base config with `opencanaryd --copyconfig`, then set:
```
"device.node_id": "fileserv-01",
"mysql.enabled": true,  "mysql.port": 3306, "mysql.banner": "5.7.38-log",
"ftp.enabled": true,    "ftp.port": 21,     "ftp.banner": "FTP server ready",
"logger": { "class": "PyLogger", "kwargs": { "formatters": {"plain": {"format": "%(message)s"}},
   "handlers": {"file": {"class": "logging.FileHandler", "filename": "/logs/opencanary.log"}} } }
```
Each log line is JSON with `logtype`, `src_host`, `dst_port`, `logdata` (`USERNAME`, `PASSWORD`). **Time-box: 45 min.** If it fights you, drop it; the demo is complete without it.

## 7. `prod-sim`: the simulated "real" environment

Generates firewall + auth logs, enforces the blocklist (the visible response effect), and treats `svc_backup` as a honeytoken.

`prod-sim/server.py`
```python
import json, os, random, socket, threading, time, paramiko
LOG, BLOCK, HOST = "/logs/prod.json", "/shared/blocklist.txt", "prod-web-01"
HONEYTOKEN_USERS = {"svc_backup"}
lock = threading.Lock()

def emit(**kw):
    kw["ts"] = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + ".000Z"; kw["host"] = HOST
    with lock, open(LOG, "a") as f: f.write(json.dumps(kw) + "\n")

def blocked(ip):
    try: return ip in {l.strip() for l in open(BLOCK)}
    except FileNotFoundError: return False

KEY = paramiko.RSAKey.generate(2048)

class SSH(paramiko.ServerInterface):
    def __init__(self, ip): self.ip = ip
    def get_allowed_auths(self, u): return "password"
    def check_auth_password(self, u, p):
        emit(type="auth", src_ip=self.ip, user=u, outcome="failure", honeytoken=(u in HONEYTOKEN_USERS))
        return paramiko.AUTH_FAILED

def serve(port, handler):
    s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(("0.0.0.0", port)); s.listen(50)
    while True:
        c, (ip, _) = s.accept()
        if blocked(ip):
            emit(type="firewall", action="drop", src_ip=ip, dst_port=port, reason="blocklist"); c.close(); continue
        emit(type="firewall", action="allow", src_ip=ip, dst_port=port)
        threading.Thread(target=handler, args=(c, ip), daemon=True).start()

def ssh_handler(c, ip):
    t = paramiko.Transport(c); t.add_server_key(KEY)
    try: t.start_server(server=SSH(ip)); t.join(20)
    except Exception: pass
    finally: t.close()

def http_handler(c, ip):
    try: c.recv(2048); c.sendall(b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nOK")
    finally: c.close()

def benign():                       # realistic background so correlation isn't trivial
    while True:
        ip = f"10.0.{random.randint(1,5)}.{random.randint(2,200)}"
        emit(type="firewall", action="allow", src_ip=ip, dst_port=random.choice([22, 80, 443]))
        if random.random() < .3: emit(type="auth", src_ip=ip, user=random.choice(["alice","bob","ci"]), outcome="success")
        time.sleep(random.uniform(1.5, 4))

for p, h in ((22, ssh_handler), (80, http_handler)):
    threading.Thread(target=serve, args=(p, h), daemon=True).start()
threading.Thread(target=benign, daemon=True).start()
threading.Event().wait()
```
`prod-sim/Dockerfile`
```dockerfile
FROM python:3.11-slim
RUN pip install --no-cache-dir paramiko
WORKDIR /app
COPY server.py .
CMD ["python", "-u", "server.py"]
```
(Run as root with `cap_add: NET_BIND_SERVICE` to bind 22/80 and write the log volume, or use high ports and adjust the simulator.)

## 8. Isolation verification script (include in submission)
`scripts/isolation_test.sh`
```bash
#!/usr/bin/env bash
set -u
pass(){ echo "PASS: $1"; }; fail(){ echo "FAIL: $1"; FAILED=1; }
chk(){ docker compose exec -T "$1" python3 - <<EOF
import socket,sys
try: socket.create_connection(("$2",$3),3); sys.exit(1)
except Exception: sys.exit(0)
EOF
}
chk portal 1.1.1.1 53 && pass "portal has no internet egress" || fail "portal can reach internet"
chk portal prod-sim 80 && pass "portal cannot reach prod-sim" || fail "portal can reach prod"
chk portal api 8000 && pass "portal cannot reach api" || fail "portal can reach mgmt"
chk tripwire prod-sim 80 && pass "tripwire cannot reach prod-sim" || fail "tripwire can reach prod"
exit ${FAILED:-0}
```
(Container images need `python3`; for the Cowrie image run an equivalent with `/cowrie/cowrie-env/bin/python` or `bash /dev/tcp`.) Capture the output as an **evidence screenshot** for the safety slide.

## 9. Phase 1 exit checklist
- [ ] `docker compose up -d cowrie portal tripwire prod-sim` healthy
- [ ] Logs appear in each volume when you poke them from a throwaway container on `attacker_net`
- [ ] Lure files visible via `ls` / `cat` in the SSH honeypot
- [ ] Isolation script passes
- [ ] Commit + tag `phase-1`
