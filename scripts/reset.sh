#!/usr/bin/env bash
# Reset demo state: truncates DB tables, clears blocklist, and restarts containers.
set -e
echo "[+] Resetting MIRAGE lab state..."
curl -s -X POST http://localhost:8000/api/demo/reset || true
docker compose exec -T prod-sim sh -c "echo -n '' > /shared/blocklist.txt" 2>/dev/null || true
echo "[+] State cleared. Ready for new demonstration run."
