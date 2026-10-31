#!/usr/bin/env bash
# Automates updating Cowrie's fake filesystem pickle to make lures discoverable.
set -e

echo "[+] Updating Cowrie fake filesystem with lure files..."

# If cowrie container is running, we can run fsctl inside it:
if docker compose ps -q cowrie >/dev/null 2>&1; then
    docker compose exec -T cowrie bash -c '
        if [ -f bin/fsctl ]; then
            python bin/fsctl share/cowrie/fs.pickle <<EOF || true
mkdir /srv
mkdir /srv/backups
touch /srv/backups/customer_data_2026.csv
mkdir /home/dbadmin
touch /home/dbadmin/notes.txt
touch /root/.mysql_history
save
exit
EOF
            echo "[+] Cowrie fs.pickle successfully updated."
        fi
    ' || echo "[*] Note: fsctl may run during startup or Cowrie reads honeyfs directly."
fi
