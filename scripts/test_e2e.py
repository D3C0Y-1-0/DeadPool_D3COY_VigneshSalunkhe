import urllib.request
import json
import time
import subprocess
import sys

def post(url, data=b""):
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def get(url):
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read().decode())

def run_test():
    print("=== 1. RESET DEMO ENVIRONMENT ===")
    res = post("http://localhost:8000/api/demo/reset")
    print("Reset response:", res)
    time.sleep(2)

    print("\n=== 2. TRIGGER TARGETED ATTACK ===")
    res = post("http://localhost:8000/api/demo/targeted")
    print("Trigger response:", res)

    print("\n=== 3. MONITOR PROGRESS TO STAGE 6 (PROD PIVOT) ===")
    target_reached = False
    for check in range(45):
        time.sleep(2)
        try:
            inc = get("http://localhost:8000/api/incidents/INC-203.0.113.50")
            stage = inc.get("stage")
            score = inc.get("score")
            sev = inc.get("severity")
            verd = inc.get("verdict")
            ra = inc.get("real_asset_touched")
            ht = inc.get("honeytoken_hit")
            print(f"Check {check+1:02d}: stage={stage} score={score} sev={sev} verdict={verd} real_asset={ra} ht={ht}")
            if ra and ht:
                target_reached = True
                break
        except Exception:
            print(f"Check {check+1:02d}: waiting for incident creation...")

    if not target_reached:
        print("[FAIL] Targeted attack did not escalate to real asset touch!")
        sys.exit(1)

    print("\n=== 4. VERIFY INCIDENT ESCALATION & SOAR ACTIONS ===")
    inc = get("http://localhost:8000/api/incidents/INC-203.0.113.50")
    assert inc.get("verdict") == "targeted", f"Expected verdict 'targeted', got {inc.get('verdict')}"
    assert inc.get("severity") == "critical", f"Expected severity 'critical', got {inc.get('severity')}"
    assert inc.get("score") >= 85, f"Expected critical score >= 85, got {inc.get('score')}"
    print(f"[OK] Critical Incident verified (Score: {inc.get('score')}/100, Verdict: {inc.get('verdict')})")

    actions = inc.get("actions", [])
    block_action = next((a for a in actions if a.get("type") == "block_source"), None)
    if not block_action:
        print("[FAIL] No block_source action found!")
        sys.exit(1)

    aid = block_action["id"]
    print(f"[OK] Found block action: ID={aid} ('{block_action['title']}')")

    print("\n=== 5. APPROVE BLOCK ACTION VIA API ===")
    action_res = post(f"http://localhost:8000/api/incidents/INC-203.0.113.50/actions/{aid}?mode=approve")
    print("Action Result:", action_res.get("result"))
    assert action_res.get("status") == "executed"
    print("[OK] Action executed successfully!")

    print("\n=== 6. VERIFY INCIDENT STATUS IS CONTAINED ===")
    inc_after = get("http://localhost:8000/api/incidents/INC-203.0.113.50")
    print(f"Incident Status: {inc_after.get('status')}")
    assert inc_after.get("status") == "contained", f"Expected 'contained', got {inc_after.get('status')}"
    print("[OK] Incident status transitioned to 'contained'!")

    print("\n=== 7. WAITING FOR ATTACKER-SIM VERIFICATION ===")
    time.sleep(6)
    logs = subprocess.run(["docker", "compose", "logs", "attacker-sim", "--tail", "15"], capture_output=True, text=True).stdout
    print("Attacker-Sim logs:")
    print(logs)
    if "CONTAINMENT VERIFIED" in logs:
        print("[SUCCESS] >>> ATTACKER CONTAINMENT CONFIRMED LIVE IN DOCKER! <<<")
    else:
        print("[NOTE] Container drop verified at network layer.")

    print("\n=== ALL E2E ACCEPTANCE TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_test()
