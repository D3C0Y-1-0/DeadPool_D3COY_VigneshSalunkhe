import asyncio
import json
import time
import os

LOG = os.environ.get("TRIPWIRE_LOG_PATH", "/logs/tripwire.json")
os.makedirs(os.path.dirname(LOG), exist_ok=True)

PORTS = {
    2323: "telnet",
    4445: "smb",
    3390: "rdp",
    5901: "vnc",
    6380: "redis",
    9201: "elasticsearch"
}

def log_event(**kw):
    kw["ts"] = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + ".000Z"
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(kw) + "\n")

def make_handler(port, name):
    async def handler(reader, writer):
        try:
            peer = writer.get_extra_info("peername")
            ip, sp = peer[0], peer[1]
            log_event(action="connect", src_ip=ip, src_port=sp, dst_port=port, service=name)
        except Exception as e:
            pass
        finally:
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass
    return handler

async def main():
    print(f"[tripwire] Starting decoy listeners on ports {list(PORTS.keys())}...")
    servers = []
    for p, n in PORTS.items():
        try:
            srv = await asyncio.start_server(make_handler(p, n), "0.0.0.0", p)
            servers.append(srv)
        except Exception as e:
            print(f"[tripwire] Could not bind port {p}: {e}")
    await asyncio.Event().wait()

if __name__ == "__main__":
    asyncio.run(main())
