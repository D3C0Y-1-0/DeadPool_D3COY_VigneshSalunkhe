#!/usr/bin/env bash
# MIRAGE Endpoint Agent - Automated Linux Deployment Script (Ubuntu/Debian)
# Run as root or with sudo

set -euo pipefail

SERVER_URL="${1:-http://localhost:8000}"
AGENT_TOKEN="${2:-}"

echo -e "\033[1;36m==========================================================\033[0m"
echo -e "\033[1;37m  MIRAGE DEFENSE: Remote Linux Endpoint Provisioning     \033[0m"
echo -e "\033[1;36m==========================================================\033[0m"

# 1. Check Python
if ! command -v python3 &>/dev/null; then
    echo -e "\033[1;31m[-] python3 is required. Installing python3 and python3-venv...\033[0m"
    apt-get update && apt-get install -y python3 python3-pip python3-venv systemd
fi

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$AGENT_DIR"

echo -e "\033[1;32m[+] Working directory: $AGENT_DIR\033[0m"

# 2. Setup dependencies
echo -e "\033[1;33m[+] Installing agent dependencies from requirements.txt...\033[0m"
python3 -m pip install --quiet -r requirements.txt || pip3 install --break-system-packages --quiet -r requirements.txt

# 3. Write configuration if token provided
if [ -n "$AGENT_TOKEN" ]; then
    cat <<EOF > "$AGENT_DIR/config.json"
{
  "server_url": "$SERVER_URL",
  "token": "$AGENT_TOKEN",
  "log_level": "INFO",
  "batch_size": 50,
  "flush_interval_seconds": 5
}
EOF
    echo -e "\033[1;32m[+] Configuration saved to $AGENT_DIR/config.json\033[0m"
fi

echo -e "\033[1;32m==========================================================\033[0m"
echo -e "\033[1;32m  PROVISIONING COMPLETE: Outbound Agent Ready\033[0m"
echo -e "\033[1;32m==========================================================\033[0m"
echo -e "To start the monitoring agent in foreground:"
echo -e "  \033[1;33mpython3 -m mirage_agent.main run --server $SERVER_URL\033[0m"
echo ""
