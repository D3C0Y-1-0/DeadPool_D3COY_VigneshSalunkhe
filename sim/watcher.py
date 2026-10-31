import json
import sys
import time
import os
import importlib

mode = sys.argv[1] if len(sys.argv) > 1 else "targeted"
last_id = None
cmd_path = "/sim_cmd/trigger.json"

print(f"[sim:{mode}] Waiting for triggers at {cmd_path}...", flush=True)

while True:
    try:
        if os.path.exists(cmd_path):
            with open(cmd_path, "r", encoding="utf-8") as f:
                t = json.load(f)
            t_id = t.get("id")
            scenario = t.get("scenario")
            if t_id != last_id:
                last_id = t_id
                if scenario == mode:
                    print(f"[sim:{mode}] Triggered scenario '{scenario}' (id={t_id})", flush=True)
                    mod = importlib.import_module(mode)
                    importlib.reload(mod)
                    mod.run()
    except Exception as e:
        print(f"[sim:{mode}] Error checking trigger: {e}", flush=True)
    time.sleep(1)
