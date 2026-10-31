# 02 — Phase Prompts: Infrastructure & Deception Layer (P1 – P7)

> Paste **one prompt at a time** into your AI editor (Agent mode). Each ends with acceptance checks. Commit after each passes.

---

## P1 — Repo scaffold + Docker Compose skeleton

```text
ROLE
You are a senior DevOps/security engineer building a defensive honeypot lab.

CONTEXT
Read AGENTS.md/CLAUDE.md and docs/06A_IMPLEMENTATION_PART1_INFRA_HONEYPOTS.md (sections 1, 2) and
docs/09_SAFETY_ISOLATION_CONTAINMENT.md. The repo is empty except /docs.

TASK
1. Create the exact repo layout from the master context (empty dirs get a .gitkeep).
2. Create .gitignore (node_modules, __pycache__, .env, *.db, dist, volumes), .env.example
   (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, DATABASE_URL, WEBHOOK_URL), PROGRESS.md.
3. Create docker-compose.yml following docs/06A section 2 with:
   - networks: attacker_net (internal:true, subnet 172.28.0.0/24), prod_net (internal:true, 172.29.0.0/24), mgmt_net
   - named volumes: cowrie_logs, portal_logs, canary_logs, tripwire_logs, prod_logs, blocklist, sim_cmd, pgdata
   - an x-hardened YAML anchor (cap_drop ALL, no-new-privileges, pids_limit, mem_limit, restart)
   - all services listed in the doc, but for services whose build context does not exist yet
     add a minimal placeholder Dockerfile (python:3.11-slim, sleep infinity) so `docker compose config`
     and `docker compose build` succeed. Mark placeholders with a comment "REPLACE IN PHASE X".
4. Put db (postgres:16), api and web on mgmt_net only. attacker-sim: attacker_net + prod_net,
   static IPs 172.28.0.50 and 172.29.0.50. noise-sim: attacker_net, ip 172.28.0.99, cap_add NET_ADMIN only.
5. Add a docker-compose.dev.yml override that publishes host ports for cowrie(2222), portal(8080)
   for LOCAL DEVELOPMENT ONLY, with a loud comment that it must not be used for the demo.

CONSTRAINTS
- Compose v2 syntax, no `version:` key. Pin image tags (postgres:16, python:3.11-slim, nginx:alpine).
- No privileged, no network_mode: host, no docker.sock mounts.
- Do not write application code yet.

ACCEPTANCE (run these and show output)
- docker compose config -q              -> exits 0
- docker compose build                  -> succeeds
- docker network ls | grep mirage       -> shows 3 networks
- docker network inspect mirage_attacker_net | grep -i '"Internal": true'

OUTPUT
List files created, any deviations from docs/06A, and what is NOT verified.
```

---

## P2 — Cowrie SSH honeypot "db-prod-02" with lures

```text
ROLE
Honeypot engineer. You know Cowrie's config, userdb, honeyfs and fsctl tool.

CONTEXT
Read docs/06A section 3 and docs/04_TECH_STACK_AND_RESEARCH.md section 3.1. P1 is done.

TASK
1. Create honeypots/cowrie/cowrie.cfg (hostname db-prod-02, SSH on 2222, telnet disabled, JSON log
   output to var/log/cowrie/cowrie.json, SSH version string of OpenSSH 8.9p1 Ubuntu).
2. Create honeypots/cowrie/userdb.txt allowing root/root, root/toor, admin/admin123, dbadmin/Passw0rd
   (check the exact userdb format for the pinned Cowrie version and note it).
3. Write scripts/gen_customers.py generating 200 SYNTHETIC customer rows (+ one canary row with email
   ht001.canary@acme-corp.example) into honeypots/cowrie/honeyfs/srv/backups/customer_data_2026.csv.
   Use reserved .example domains only.
4. Create honeyfs lure files: home/dbadmin/notes.txt (bait credential svc_backup / Bkp!2026#vault,
   labelled temporary), root/.mysql_history (plausible queries).
5. Make the lures VISIBLE in Cowrie's fake filesystem. Investigate Cowrie's fsctl workflow for the pinned
   image and automate it in scripts/build_cowrie_fs.sh (idempotent). Document the exact commands.
6. Wire the service in docker-compose.yml (volumes: logs, cfg:ro, userdb:ro, honeyfs:ro).

FALLBACK (use only if Cowrie fake-FS work exceeds ~60 minutes)
Implement honeypots/cowrie/mini_ssh.py with asyncssh per docs/06A section 3.5, same JSON log shape
(eventid, session, src_ip, timestamp, username, password, input), plus Dockerfile. Fix the
session lookup for the installed asyncssh version. Tell me you used the fallback.

CONSTRAINTS
- Everything synthetic. Bait credentials must be fictitious and appear nowhere else.
- Container hardening from the x-hardened anchor; the network stays internal.
- Never execute anything attackers type.

ACCEPTANCE
- From a throwaway container on mirage_attacker_net run paramiko (or ssh) to cowrie:2222 with root/root,
  run: whoami; ls /srv/backups; cat /home/dbadmin/notes.txt
- docker compose exec cowrie tail -n 20 <json log>  -> shows connect, login.failed/success, command.input events
- Output of `ls /srv/backups` shows customer_data_2026.csv

OUTPUT
Files changed, exact fsctl commands used, whether fallback was needed, gaps.
```

---

## P3 — Decoy customer portal (Flask) with honeytokens

```text
ROLE
Python web + deception engineer.

CONTEXT
Read docs/06A section 4 and docs/07 section 6.3 (honeytokens). P1 done.

TASK
Build honeypots/portal/ (app.py, Dockerfile, requirements.txt with pinned flask+gunicorn):
1. Routes: / -> /login; GET/POST /login; /dashboard; /download/customer_data_2026.csv;
   /robots.txt (Disallow: /admin-backup/); /admin-backup/ (lure, returns 403 but is logged).
2. Credentials admin/admin and admin/Welcome1 "succeed" (set a dummy cookie). All others fail.
3. JSON-lines logging to /logs/portal.json: ts (ISO8601 UTC ms), src_ip (request.remote_addr ONLY,
   never X-Forwarded-For), ua, action(login|web_request|download), user, password, outcome, path, flags.
4. Flags: sqli and traversal detected by regex on user/password/path/query.
5. The CSV download: generate deterministic fake data (200 rows + canary row), log
   action=download with honeytoken_id=HT-CUST-001 and file{name,size,sha256}.
6. Run with gunicorn on 0.0.0.0:8080 as a non-root user; fix /logs volume permissions properly
   (chown in image + volume init) or document the lab-only root exception.
7. Look believable: simple professional HTML ("ACME Corp - Customer Data Portal"), no obvious "honeypot" strings.

CONSTRAINTS
- Escape/encode anything echoed back (no reflected XSS in our own decoy).
- Cap request body size (e.g. 16 KB). Never execute or eval input.
- read_only root fs with tmpfs for /tmp if gunicorn allows.

ACCEPTANCE (from a container on attacker_net)
- curl -s -d 'u=admin&p=admin' http://portal:8080/login -i   -> 302 + log line outcome=success
- curl -s -d "u=' or 1=1--&p=x" http://portal:8080/login     -> log line flags contains sqli
- curl -s http://portal:8080/download/customer_data_2026.csv | head -3
- last log line has honeytoken_id HT-CUST-001 and a sha256

OUTPUT
Files, log sample lines (3), gaps.
```

---

## P4 — Tripwire decoy ports

```text
ROLE
Python asyncio engineer.

CONTEXT
docs/06A section 5. Purpose: feed scan detection ("4 distinct ports in 10 s from one IP").

TASK
Create honeypots/tripwire/tripwire.py + Dockerfile: asyncio servers on HIGH ports
2323(telnet), 4445(smb), 3390(rdp), 5901(vnc), 6380(redis), 9201(elasticsearch). On connect: log JSON
line to /logs/tripwire.json {ts, action:"connect", src_ip, src_port, dst_port, service}, then close.
Optionally send a tiny plausible banner for telnet/redis before closing. Handle exceptions without crashing.

CONSTRAINTS
- High ports only (works with cap_drop ALL). Non-root. No data read from the client beyond a tiny cap.
- Bound resources (limit concurrent connections, e.g. semaphore 100).

ACCEPTANCE
From a container on attacker_net: connect to tripwire on all six ports; verify six log lines with
distinct dst_port values.

OUTPUT
Files + sample log lines.
```

---

## P5 — OpenCanary (MySQL + FTP) [time-box 45 min]

```text
ROLE
Deception engineer experienced with OpenCanary.

CONTEXT
docs/06A section 6; docs/04 section 3.2. This service is OPTIONAL: if it consumes >45 minutes, stop,
report, and remove it from compose (the demo works without it).

TASK
1. honeypots/opencanary/Dockerfile (pinned python 3.11-slim, pip install opencanary scapy), config at
   /etc/opencanaryd/opencanary.conf generated from `opencanaryd --copyconfig` and edited to enable ONLY
   mysql (3306, banner 5.7.38-log) and ftp (21), node_id fileserv-01, JSON file logger -> /logs/opencanary.log.
2. Add NET_BIND_SERVICE cap only if needed to bind <1024 (3306 is fine; 21 needs it).
3. Document (comment in a README snippet) the exact `logtype` codes and the real log line format you
   observe for a MySQL login and an FTP login in THIS installed version.

ACCEPTANCE
From a container on attacker_net: python -c with pymysql.connect(host='opencanary', user='root', password='root');
and an ftplib login attempt. Show both resulting JSON log lines.

OUTPUT
Files, REAL sample log lines (so the backend parser can be corrected in P9), gaps.
```

---

## P6 — prod-sim: the simulated production environment

```text
ROLE
Security engineer building a safe simulated production host that produces firewall/auth telemetry.

CONTEXT
docs/06A section 7 and docs/07 section 6. prod-sim must live ONLY on prod_net.

TASK
Create prod-sim/server.py + Dockerfile (paramiko pinned):
1. Listen on :22 (paramiko ServerInterface that always rejects auth but LOGS every attempt) and :80 (tiny HTTP 200).
2. JSON lines to /logs/prod.json with ts, host "prod-web-01", and:
   - {type:"firewall", action:"allow"|"drop", src_ip, dst_port, reason?}
   - {type:"auth", src_ip, user, outcome, honeytoken:boolean}  (honeytoken true when user == "svc_backup")
3. Blocklist enforcement: read /shared/blocklist.txt (mounted read-only) on EVERY accepted connection;
   if src_ip is listed -> log firewall drop and close immediately.
4. Background benign traffic thread: internal 10.0.x.x firewall allows and occasional successful auth
   for alice/bob/ci every 1.5-4 s (so correlation is not trivial).
5. Handle bad clients without crashing (timeouts, exceptions). Bind 22/80 with NET_BIND_SERVICE cap only,
   or document using high ports if you choose that.

CONSTRAINTS
- No real authentication ever succeeds. No shell. Nothing executed from input.
- Thread-safe log writes.

ACCEPTANCE (from a container on prod_net)
- paramiko connect with svc_backup/anything -> AuthenticationException and a log line honeytoken:true
- add the container's IP to /shared/blocklist.txt via a temporary writer container, reconnect -> connection
  closed + firewall drop line

OUTPUT
Files, sample log lines, gaps.
```

---

## P7 — Isolation test script + evidence

```text
ROLE
Security engineer proving containment.

CONTEXT
docs/09_SAFETY_ISOLATION_CONTAINMENT.md sections 3, 4, 6. All honeypots and prod-sim are running.

TASK
Write scripts/isolation_test.sh (bash, set -u, exit non-zero on any FAIL) that runs these NEGATIVE tests
from inside the decoy containers (use python3 sockets or bash /dev/tcp as available in each image):
- decoy -> internet (1.1.1.1:53) fails
- decoy -> prod-sim:80 fails (name resolution or connect)
- decoy -> api:8000 fails
- tripwire/portal/cowrie each tested
Also POSITIVE checks: attacker-sim can reach decoys and prod-sim; api can read log volumes but cannot write them.
Add a hardening audit section printing, via `docker inspect`, CapDrop, SecurityOpt, ReadonlyRootfs, Memory,
PidsLimit and Networks for every honeypot, and FAIL if any container is privileged or on mgmt_net/prod_net.
Print a PASS/FAIL table at the end with colors disabled if not a TTY.

CONSTRAINTS
- Tests must not require internet. Use short timeouts (3 s). Handle images lacking python3.

ACCEPTANCE
Run it and paste the final table; every line PASS. Also save output to docs/evidence/isolation_test.txt.

OUTPUT
Script path, evidence path, any container where a test needed a workaround.
```
