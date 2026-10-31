import json
import os
import random
import socket
import threading
import time
import paramiko

LOG = os.environ.get("PROD_LOG_PATH", "/logs/prod.json")
BLOCK = os.environ.get("BLOCKLIST_PATH", "/shared/blocklist.txt")
HOST = "prod-web-01"
HONEYTOKEN_USERS = {"svc_backup"}
lock = threading.Lock()

os.makedirs(os.path.dirname(LOG), exist_ok=True)
if os.path.dirname(BLOCK):
    os.makedirs(os.path.dirname(BLOCK), exist_ok=True)

def emit(**kw):
    kw["ts"] = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + ".000Z"
    kw["host"] = HOST
    with lock, open(LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(kw) + "\n")

def blocked(ip):
    try:
        if not os.path.exists(BLOCK):
            return False
        with open(BLOCK, "r", encoding="utf-8") as f:
            blocked_ips = {line.strip() for line in f if line.strip()}
        return ip in blocked_ips
    except Exception:
        return False

KEY = paramiko.RSAKey.generate(2048)

class SSHInterface(paramiko.ServerInterface):
    def __init__(self, ip):
        self.ip = ip

    def get_allowed_auths(self, username):
        return "password"

    def check_auth_password(self, username, password):
        is_ht = username in HONEYTOKEN_USERS
        emit(
            type="auth",
            src_ip=self.ip,
            user=username,
            outcome="failure",
            honeytoken=is_ht,
            dst_port=22
        )
        return paramiko.AUTH_FAILED

def serve(port, handler):
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(("0.0.0.0", port))
    s.listen(50)
    print(f"[prod-sim] Listening on port {port}...", flush=True)
    while True:
        try:
            c, (ip, _) = s.accept()
            if blocked(ip):
                emit(type="firewall", action="drop", src_ip=ip, dst_port=port, reason="blocklist")
                c.close()
                continue
            emit(type="firewall", action="allow", src_ip=ip, dst_port=port)
            threading.Thread(target=handler, args=(c, ip), daemon=True).start()
        except Exception as e:
            time.sleep(0.1)

def ssh_handler(c, ip):
    t = paramiko.Transport(c)
    t.add_server_key(KEY)
    try:
        t.start_server(server=SSHInterface(ip))
        t.join(20)
    except Exception:
        pass
    finally:
        try:
            t.close()
        except Exception:
            pass

def http_handler(c, ip):
    try:
        c.settimeout(5)
        c.recv(2048)
        c.sendall(b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 2\r\n\r\nOK")
    except Exception:
        pass
    finally:
        try:
            c.close()
        except Exception:
            pass

def benign():
    """Generates realistic internal production traffic so correlation is non-trivial."""
    time.sleep(2)
    while True:
        try:
            ip = f"10.0.{random.randint(1, 5)}.{random.randint(2, 200)}"
            port = random.choice([22, 80, 443])
            emit(type="firewall", action="allow", src_ip=ip, dst_port=port)
            if random.random() < 0.3:
                emit(type="auth", src_ip=ip, user=random.choice(["alice", "bob", "ci_deploy"]), outcome="success", dst_port=22)
        except Exception:
            pass
        time.sleep(random.uniform(2.5, 5.0))

if __name__ == "__main__":
    for p, h in ((22, ssh_handler), (80, http_handler)):
        threading.Thread(target=serve, args=(p, h), daemon=True).start()
    threading.Thread(target=benign, daemon=True).start()
    print("[prod-sim] Production Simulator running.", flush=True)
    threading.Event().wait()
