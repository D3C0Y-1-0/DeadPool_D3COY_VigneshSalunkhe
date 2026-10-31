#!/usr/bin/env bash
# Verification of honeypot network containment and absence of internet egress.
set -u
FAILED=0

pass(){ echo -e "\033[0;32m[PASS]\033[0m $1"; }
fail(){ echo -e "\033[0;31m[FAIL]\033[0m $1"; FAILED=1; }

chk(){
    docker compose exec -T "$1" python3 - <<EOF
import socket, sys
try:
    socket.create_connection(("$2", int($3)), 3)
    sys.exit(1)
except Exception:
    sys.exit(0)
EOF
}

echo "=== MIRAGE NETWORK ISOLATION & CONTAINMENT AUDIT ==="

chk portal 1.1.1.1 53 && pass "portal has no internet egress" || fail "portal can reach internet"
chk portal prod-sim 80 && pass "portal cannot reach prod-sim" || fail "portal can reach prod-sim"
chk portal api 8000 && pass "portal cannot reach api (mgmt_net)" || fail "portal can reach api"
chk tripwire 1.1.1.1 53 && pass "tripwire has no internet egress" || fail "tripwire can reach internet"
chk tripwire prod-sim 80 && pass "tripwire cannot reach prod-sim" || fail "tripwire can reach prod-sim"
chk tripwire api 8000 && pass "tripwire cannot reach api" || fail "tripwire can reach api"

if [ $FAILED -eq 0 ]; then
    echo "=== ALL ISOLATION CHECKS PASSED ==="
else
    echo "=== WARNING: ISOLATION CHECKS FAILED ==="
fi

exit $FAILED
