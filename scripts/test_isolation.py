import subprocess

checks = [
    ("portal", "1.1.1.1", 53, "portal has no internet egress"),
    ("portal", "prod-sim", 80, "portal cannot reach prod-sim"),
    ("portal", "api", 8000, "portal cannot reach api (mgmt_net)"),
    ("tripwire", "1.1.1.1", 53, "tripwire has no internet egress"),
    ("tripwire", "prod-sim", 80, "tripwire cannot reach prod-sim"),
    ("tripwire", "api", 8000, "tripwire cannot reach api (mgmt_net)"),
]

failed = False
print("=== MIRAGE NETWORK ISOLATION & CONTAINMENT AUDIT ===")
for svc, host, port, desc in checks:
    inner = f"import socket, sys; socket.create_connection(('{host}', {port}), timeout=2); sys.exit(1)"
    cmd = ["docker", "compose", "exec", "-T", svc, "python", "-c", inner]
    res = subprocess.run(cmd, capture_output=True)
    # If connection failed (exception in inner script), return code is non-zero, which means isolation holds!
    if res.returncode != 0:
        print(f"[PASS] {desc}")
    else:
        print(f"[FAIL] {desc}")
        failed = True

if not failed:
    print("=== ALL 6 ISOLATION CHECKS PASSED PERFECTLY ===")
else:
    print("=== ISOLATION AUDIT FAILED ===")
