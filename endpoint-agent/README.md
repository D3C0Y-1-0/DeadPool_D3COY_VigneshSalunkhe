# MIRAGE Endpoint Agent

The agent is read-only. It collects selected Windows Security events or Linux authentication activity, stores normalized events and collection cursors in a local SQLite queue, and uploads batches over outbound HTTPS. It has no command execution or remote-control channel.

## Current scope

- Windows Security event IDs: 4624, 4625, 4634, 4648, 4672, 4688, 4720, 4726.
- Linux: journal authentication facility, or `/var/log/auth.log` and `/var/log/secure` when `journalctl` is unavailable.
- Normalized login failures/successes, selected privileged activity, account creation/deletion, and special privileges.
- Per-host event deduplication, cursor persistence, queue acknowledgement, bounded retry, TLS certificate validation, and heartbeats.

This phase does not install a Windows service or Linux systemd unit. It also does not configure a VPN, register the endpoint from the agent, or deliver endpoint logs to the frontend. An administrator must enroll the host through the backend and provision the one-time agent credential out-of-band over the authorized VPN.

## Install

Use Python 3.11 or later. On Windows, install the platform-specific Event Log binding:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item config.example.json mirage-agent.json
```

On Linux, `journalctl` is used where available. Authentication-file fallback may require approved read-only access to `/var/log/auth.log` or `/var/log/secure`; use a dedicated service identity and grant only the needed read permission:

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
cp config.example.json mirage-agent.json
chmod 600 mirage-agent.json
```

The credential is deliberately omitted from the example config. Prefer setting it in the service manager's protected environment as `MIRAGE_AGENT_CREDENTIAL`. If it must be written into the JSON file, protect the file with the operating system's ACL/permissions and exclude it from backups and source control.

## Enroll and run

Connect through the authorized private VPN and configure the central API's HTTPS hostname in `backend_url`. The server certificate must chain to a trusted CA; certificate verification is enabled and is not disabled by the agent.

On an administrator workstation, call `POST /api/agents/register` using `X-MIRAGE-Admin-Token`. Get host metadata with:

```sh
python -m mirage_agent.main --identity
```

Submit those metadata fields to registration, then securely provision the returned credential on that one endpoint. The token is only shown at registration/rotation and is stored hashed on the server.

Set `MIRAGE_AGENT_CREDENTIAL` in a protected environment, then run:

```sh
python -m mirage_agent.main --config mirage-agent.json
```

The agent calls `POST /api/agents/events` and `POST /api/agents/heartbeat`. Failed uploads remain in its local SQLite queue and are retried. On graceful stop, queued records remain on disk. Do not copy one agent credential to multiple hosts.

## Testing

From the repository root, using the existing backend virtual environment:

```powershell
.\backend\venv\Scripts\python.exe -m pytest endpoint-agent\tests -q
```

Tests use synthetic records and do not query host logs or require a VPN.
