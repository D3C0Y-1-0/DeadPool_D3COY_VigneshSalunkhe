import socket
import threading
import time
import json
import uuid
import os
import paramiko

LOG = os.environ.get("COWRIE_LOG_PATH", "/cowrie/cowrie-git/var/log/cowrie/cowrie.json")
os.makedirs(os.path.dirname(LOG), exist_ok=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HONEYFS = os.path.join(BASE_DIR, "honeyfs")

KEY = paramiko.RSAKey.generate(2048)

WEAK = {
    ("root", "root"),
    ("root", "toor"),
    ("admin", "admin123"),
    ("dbadmin", "Passw0rd")
}

FS = {
    "/": ["srv", "home", "etc", "var", "root", "usr", "bin"],
    "/srv": ["backups"],
    "/srv/backups": ["customer_data_2026.csv"],
    "/home": ["dbadmin"],
    "/home/dbadmin": ["notes.txt"],
    "/root": [".mysql_history"]
}

def get_file(path):
    p = os.path.join(HONEYFS, path.lstrip("/"))
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    return "cat: No such file or directory\n"

def emit(eventid, session, ip, **kw):
    rec = {
        "eventid": eventid,
        "session": session,
        "src_ip": ip,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000000Z", time.gmtime()),
        **kw
    }
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec) + "\n")

class CowrieSSHInterface(paramiko.ServerInterface):
    def __init__(self, ip, sid):
        self.ip = ip
        self.sid = sid

    def check_channel_request(self, kind, chanid):
        if kind == "session":
            return paramiko.OPEN_SUCCEEDED
        return paramiko.OPEN_FAILED_ADMINISTRATIVELY_PROHIBITED

    def check_channel_pty_request(self, channel, term, width, height, pixelwidth, pixelheight, modes):
        return True

    def check_channel_shell_request(self, channel):
        return True

    def get_allowed_auths(self, username):
        return "password"

    def check_auth_password(self, username, password):
        ok = (username, password) in WEAK
        emit(
            "cowrie.login.success" if ok else "cowrie.login.failed",
            self.sid,
            self.ip,
            username=username,
            password=password
        )
        return paramiko.AUTH_SUCCESSFUL if ok else paramiko.AUTH_FAILED

def handle_channel(chan, ip, sid):
    cwd = "/home/dbadmin"
    chan.send(b"The programs included with the Debian GNU/Linux system are free software.\r\n")
    chan.send(b"dbadmin@db-prod-02:~$ ")
    
    buf = ""
    while True:
        try:
            data = chan.recv(1024)
            if not data:
                break
            text = data.decode("utf-8", errors="ignore")
            buf += text
            if "\n" in buf or "\r" in buf:
                lines = buf.splitlines()
                for line in lines[:-1]:
                    cmd = line.strip()
                    if cmd:
                        emit("cowrie.command.input", sid, ip, input=cmd)
                        out = ""
                        parts = cmd.split()
                        op = parts[0]
                        if op in ("ls", "dir"):
                            target = parts[1] if len(parts) > 1 else cwd
                            clean_path = target.rstrip("/") or "/"
                            if not clean_path.startswith("/"):
                                clean_path = os.path.normpath(os.path.join(cwd, clean_path)).replace("\\", "/")
                            entries = FS.get(clean_path, ["customer_data_2026.csv"] if "backups" in clean_path else [])
                            out = "  ".join(entries) + "\r\n"
                        elif op == "cat":
                            target = parts[1] if len(parts) > 1 else ""
                            clean_path = target if target.startswith("/") else os.path.normpath(os.path.join(cwd, target)).replace("\\", "/")
                            out = get_file(clean_path).replace("\n", "\r\n") + "\r\n"
                        elif op == "whoami":
                            out = "dbadmin\r\n"
                        elif op == "uname":
                            out = "Linux db-prod-02 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux\r\n"
                        elif op == "pwd":
                            out = cwd + "\r\n"
                        elif op in ("exit", "logout"):
                            chan.close()
                            return
                        else:
                            out = f"bash: {op}: command not found\r\n"
                        
                        chan.send(out.encode("utf-8"))
                    chan.send(b"dbadmin@db-prod-02:~$ ")
                buf = lines[-1] if not buf.endswith(("\r", "\n")) else ""
        except Exception:
            break
    chan.close()

def client_handler(conn, addr):
    ip = addr[0]
    sid = uuid.uuid4().hex[:10]
    emit("cowrie.session.connect", sid, ip)
    
    t = paramiko.Transport(conn)
    t.local_version = "SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.6"
    t.add_server_key(KEY)
    
    server = CowrieSSHInterface(ip, sid)
    try:
        t.start_server(server=server)
        chan = t.accept(20)
        if chan is not None:
            handle_channel(chan, ip, sid)
    except Exception as e:
        pass
    finally:
        try:
            t.close()
        except Exception:
            pass

def main():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(("0.0.0.0", 2222))
    s.listen(100)
    print("[cowrie] SSH Honeypot listening on port 2222...", flush=True)
    while True:
        c, addr = s.accept()
        threading.Thread(target=client_handler, args=(c, addr), daemon=True).start()

if __name__ == "__main__":
    main()
