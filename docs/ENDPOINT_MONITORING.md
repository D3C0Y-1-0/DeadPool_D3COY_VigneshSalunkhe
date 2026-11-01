# MIRAGE Endpoint Monitoring

## Status

The backend foundation is implemented: administrator-gated enrollment, per-agent bearer credentials, heartbeat, event ingestion, deduplication, event listing, credential rotation, and revocation. This is not yet a complete remote monitoring deployment. The Windows/Linux collection agent, dashboard workflows, authenticated real-time delivery, and endpoint-specific detection rules remain future phases.

The read-only Python agent foundation is also implemented for supported Windows and Linux endpoints: selected event collection, normalization, a durable local SQLite queue and cursors, retrying outbound HTTPS delivery, and heartbeats. Endpoint events are stored separately from honeypot events. They are not yet broadcast over the existing unauthenticated WebSocket or correlated into MIRAGE incidents. This avoids exposing endpoint log data to dashboard connections that do not have user authentication.

## Secure network setup

Use the private VPN option selected for this project. The current Compose networks are for the isolated lab; they do not configure a VPN, remote routing, or HTTPS. Do not expose port 8000 directly to the public internet. Before connecting remote agents, make the backend reachable only through the authorized VPN and terminate valid TLS in front of it. Agent clients must validate the server certificate.

Create a random administrator credential with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Store it as `MIRAGE_AGENT_ADMIN_TOKEN` in the ignored root `.env` file and pass it to the API service. Never put it in the frontend or commit it. The API returns `503` for administrator operations if this setting is missing or shorter than 32 characters.

The current dashboard login is not authentication. Until dashboard-user authentication and role checks are implemented, administer endpoints through a trusted VPN client using an API client, not from an unauthenticated web page.

## API

Administrator routes require `X-MIRAGE-Admin-Token`:

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/agents/register` | Register a device and return its credential once |
| `GET` | `/api/agents` | List registered devices; credentials are never returned |
| `GET` | `/api/agents/{agent_id}` | Get device details |
| `GET` | `/api/agents/{agent_id}/status` | Get heartbeat-derived status |
| `GET` | `/api/agents/{agent_id}/events` | Read paginated endpoint events |
| `POST` | `/api/agents/{agent_id}/rotate` | Rotate an active device credential |
| `POST` | `/api/agents/{agent_id}/revoke` | Revoke device access |

Agent routes require an individual `Authorization: Bearer <credential>`:

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/agents/heartbeat` | Update heartbeat and optional agent version |
| `POST` | `/api/agents/events` | Submit a batch of normalized security events |

Registration accepts `hostname`, `operatingSystem`, `osVersion`, and `agentVersion`. The generated agent credential is returned only by enrollment or rotation; the database stores its SHA-256 hash. Revocation invalidates it. The API assigns the agent ID itself and does not trust an ID in event payloads.

Event batches accept 1–100 events. Each event includes `eventId`, timezone-aware `timestamp`, `source`, `eventType`, `severity`, and `message`, with optional `sourceIp` and `raw`. Duplicate `eventId` values for the same agent are acknowledged but not reinserted. Sensitive-looking keys such as password, token, credential, and private-key fields are removed from raw metadata before storage.

Example registration request:

```powershell
$headers = @{ "X-MIRAGE-Admin-Token" = $env:MIRAGE_AGENT_ADMIN_TOKEN }
$body = @{
  hostname = "authorized-linux-host"
  operatingSystem = "Linux"
  osVersion = "Ubuntu 24.04"
  agentVersion = "0.1.0"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "https://mirage-vpn.example/api/agents/register" -Headers $headers -ContentType "application/json" -Body $body
```

Treat the returned credential as a secret and place it only in the managed endpoint's protected configuration. Do not paste it into tickets, logs, source control, or frontend code.

## Storage and safeguards

`endpoint_agents` stores device metadata and only the credential hash. `endpoint_security_events` stores normalized events, with a unique `(agent_id, event_id)` constraint and indexes for agent, timestamp, severity, event type, source, and source IP. Apply the Alembic migration before deploying a new backend version; application startup also uses SQLAlchemy `create_all` for local development.

The current in-process limiter allows up to 120 heartbeat/event requests per minute per agent. Run one API worker until this limiter is replaced by a shared store for multi-worker deployments. The endpoint event API is intentionally separate from the existing honeypot incident engine; correlation and detection will only be enabled after explicit endpoint rules and evidence tests are added.

## Agent setup

See [endpoint-agent/README.md](../endpoint-agent/README.md) for installing the collector, protected credential provisioning, config, and run instructions. Windows collects only selected Security channel event IDs. Linux uses journald `auth`/`authpriv` facilities, then approved authentication log files when `journalctl` is unavailable. Test inputs are synthetic; the tests do not read host logs.

## Not yet implemented

- Service installers, device health queue metrics, and endpoint UI
- Dashboard-user authentication, administrator roles, and authenticated WebSocket subscriptions
- Endpoint-specific alert rules and evidence-backed incident correlation
- Retention and deletion policy for endpoint events

Do not treat the current backend foundation as an EDR product or connect unmanaged devices. Enroll only explicitly authorized endpoints and configure collection to the minimum approved security logs.
