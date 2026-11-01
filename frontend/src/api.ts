import { Incident, IncidentSummary, KpiStats, NormalizedEvent, ActionItem, TechniqueItem } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const response = await fetch(url, { cache: "no-store", ...init });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json() as { detail?: string };
      detail = body.detail || detail;
    } catch {
      /* plain text or empty */
    }
    throw new Error(`${response.status} ${detail || "Request failed"}`);
  }
  return response.json() as Promise<T>;
}

// ── Core stats ──────────────────────────────────────────────────────────────
export async function fetchStats(): Promise<KpiStats> {
  return requestJson<KpiStats>("/api/stats");
}

// ── Events ───────────────────────────────────────────────────────────────────
export async function fetchEvents(
  limit = 200,
  params?: { sensor?: string; source_ip?: string; action?: string; zone?: string; offset?: number }
): Promise<NormalizedEvent[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (params?.sensor) q.set("sensor", params.sensor);
  if (params?.source_ip) q.set("source_ip", params.source_ip);
  if (params?.action) q.set("action", params.action);
  if (params?.zone) q.set("zone", params.zone);
  if (params?.offset) q.set("offset", String(params.offset));
  return requestJson<NormalizedEvent[]>(`/api/v1/events?${q}`);
}

// ── Incidents ────────────────────────────────────────────────────────────────
export async function fetchIncidents(params?: {
  severity?: string;
  status?: string;
  verdict?: string;
}): Promise<IncidentSummary[]> {
  const q = new URLSearchParams();
  if (params?.severity) q.set("severity", params.severity);
  if (params?.status) q.set("status", params.status);
  if (params?.verdict) q.set("verdict", params.verdict);
  const qs = q.toString() ? `?${q}` : "";
  return requestJson<IncidentSummary[]>(`/api/incidents${qs}`);
}

export async function fetchIncident(id: string): Promise<Incident> {
  return requestJson<Incident>(`/api/incidents/${encodeURIComponent(id)}`);
}

export async function updateIncidentStatus(
  id: string,
  status: "open" | "investigating" | "contained" | "resolved" | "false_positive"
): Promise<{ id: string; status: string }> {
  return requestJson(`/api/v1/incidents/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export async function executeAction(
  incidentId: string,
  actionId: string,
  mode: "approve" | "dry_run"
): Promise<ActionItem> {
  return requestJson<ActionItem>(
    `/api/incidents/${encodeURIComponent(incidentId)}/actions/${encodeURIComponent(actionId)}?mode=${mode}`,
    { method: "POST" }
  );
}

// ── Attackers ────────────────────────────────────────────────────────────────
export interface AttackerProfile {
  id: string;
  source_ip: string;
  display_identity: string;
  first_seen: string;
  last_seen: string;
  total_events: number;
  total_incidents: number;
  sensors_touched: string[];
  risk_level: string;
  verdict?: string;
  cadence?: string;
  country?: string;
  asn?: string;
}

export async function fetchAttackers(): Promise<AttackerProfile[]> {
  return requestJson<AttackerProfile[]>("/api/v1/attackers");
}

export async function fetchAttacker(id: string): Promise<AttackerProfile> {
  return requestJson<AttackerProfile>(`/api/v1/attackers/${encodeURIComponent(id)}`);
}

// ── MITRE ATT&CK ─────────────────────────────────────────────────────────────
export async function fetchAttackMatrix(): Promise<TechniqueItem[]> {
  return requestJson<TechniqueItem[]>("/api/attack-matrix");
}

// ── Metrics ───────────────────────────────────────────────────────────────────
export interface TimelinePoint {
  time: string;
  count: number;
}

export interface SensorCount {
  sensor: string;
  count: number;
}

export interface SeverityCount {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export async function fetchMetricsTimeline(): Promise<TimelinePoint[]> {
  return requestJson<TimelinePoint[]>("/api/v1/metrics/timeline");
}

export async function fetchMetricsSensors(): Promise<SensorCount[]> {
  return requestJson<SensorCount[]>("/api/v1/metrics/sensors");
}

export async function fetchMetricsSeverity(): Promise<SeverityCount> {
  return requestJson<SeverityCount>("/api/v1/metrics/severity");
}

// ── Exports ───────────────────────────────────────────────────────────────────
export interface IocEntry {
  type: "ipv4" | "sha256" | string;
  value: string;
  incident: string;
  severity?: string;
  name?: string;
}

export async function fetchAllIocs(): Promise<IocEntry[]> {
  return requestJson<IocEntry[]>("/api/v1/exports/iocs");
}

export function exportStixUrl(incidentId: string): string {
  return `${API_BASE}/api/incidents/${encodeURIComponent(incidentId)}/export/stix`;
}

export function exportCsvUrl(incidentId: string): string {
  return `${API_BASE}/api/incidents/${encodeURIComponent(incidentId)}/export/csv`;
}

export function exportEcsUrl(): string {
  return `${API_BASE}/api/export/ecs.ndjson`;
}

// ── Demo ─────────────────────────────────────────────────────────────────────
export async function triggerDemo(scenario: "targeted" | "noise"): Promise<{ ok: boolean; status?: string }> {
  return requestJson<{ ok: boolean; status?: string }>(`/api/demo/${scenario}`, { method: "POST" });
}

export async function resetDemo(): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>("/api/demo/reset", { method: "POST" });
}

export async function fetchDemoStatus(): Promise<{ active_scenario: string | null; sim_ready: boolean }> {
  return requestJson("/api/v1/demo/status");
}

// ── Health ─────────────────────────────────────────────────────────────────────
export interface SensorStatus {
  sensor: string;
  asset: string;
  zone: string;
  status: string;
  last_event: string | null;
  total_events: number;
}

export async function fetchSensorStatus(): Promise<SensorStatus[]> {
  return requestJson<SensorStatus[]>("/api/v1/health/sensors");
}

export async function fetchHealth(): Promise<{ status: string; mode: string; db: string; utc: string }> {
  return requestJson("/health");
}

// ── Response Actions ─────────────────────────────────────────────────────────
export interface ActionRow {
  id: string;
  incident_id: string;
  type: string;
  status: string;
  params: Record<string, unknown>;
  result?: string;
  created_at: string;
}

export async function fetchAllActions(): Promise<ActionRow[]> {
  return requestJson<ActionRow[]>("/api/v1/actions");
}

export async function approveAction(actionId: string): Promise<ActionRow> {
  return requestJson<ActionRow>(`/api/v1/actions/${encodeURIComponent(actionId)}/approve`, { method: "POST" });
}

export async function rejectAction(actionId: string): Promise<ActionRow> {
  return requestJson<ActionRow>(`/api/v1/actions/${encodeURIComponent(actionId)}/reject`, { method: "POST" });
}


// ── Endpoint Monitoring ───────────────────────────────────────────────────────
export interface EndpointAgent {
  agentId: string;
  hostname: string;
  operatingSystem: string;
  osVersion: string;
  agentVersion: string;
  status: "online" | "offline" | "pending" | "revoked" | "unknown";
  registeredAt: string;
  lastHeartbeat: string | null;
  lastEvent: string | null;
  revokedAt: string | null;
  credential?: string;
}

export interface EndpointSecurityEvent {
  id: string;
  eventId: string;
  agentId: string;
  hostname: string;
  operatingSystem: string;
  timestamp: string;
  receivedAt: string;
  source: string;
  eventType: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  message: string;
  sourceIp?: string | null;
  raw: Record<string, unknown>;
}

export interface EndpointSummary {
  totalEndpoints: number;
  onlineEndpoints: number;
  offlineEndpoints: number;
  pendingEndpoints: number;
  revokedEndpoints: number;
  totalEventsIngested: number;
  highCriticalAlerts: number;
  osBreakdown: Record<string, number>;
}

// The admin token is stored as a public env var only for the demo dashboard
// (no secrets, just the SOC operator bearer for this hackathon-grade build).
const AGENT_ADMIN_TOKEN =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_AGENT_ADMIN_TOKEN) ||
  "mirage_soc_admin_super_secret_token_2026_demo";

function agentAdminHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "X-MIRAGE-Admin-Token": AGENT_ADMIN_TOKEN,
    ...extra,
  };
}

export async function fetchEndpointSummary(): Promise<EndpointSummary> {
  return requestJson<EndpointSummary>("/api/agents/summary", {
    headers: agentAdminHeaders(),
  });
}

export async function fetchAgents(): Promise<EndpointAgent[]> {
  return requestJson<EndpointAgent[]>("/api/agents", {
    headers: agentAdminHeaders(),
  });
}

export async function fetchAgent(agentId: string): Promise<EndpointAgent> {
  return requestJson<EndpointAgent>(`/api/agents/${encodeURIComponent(agentId)}`, {
    headers: agentAdminHeaders(),
  });
}

export async function fetchEndpointEvents(params?: {
  agent_id?: string;
  severity?: string;
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; events: EndpointSecurityEvent[] }> {
  const q = new URLSearchParams();
  if (params?.agent_id) q.set("agent_id", params.agent_id);
  if (params?.severity) q.set("severity", params.severity);
  if (params?.source) q.set("source", params.source);
  if (params?.search) q.set("search", params.search);
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const qs = q.toString() ? `?${q}` : "";
  return requestJson<{ total: number; events: EndpointSecurityEvent[] }>(`/api/agents/events${qs}`, {
    headers: agentAdminHeaders(),
  });
}

export async function registerEndpointAgent(data: {
  hostname: string;
  operatingSystem: string;
  osVersion: string;
  agentVersion: string;
}): Promise<EndpointAgent & { credential: string }> {
  return requestJson<EndpointAgent & { credential: string }>("/api/agents/register", {
    method: "POST",
    headers: agentAdminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      hostname: data.hostname,
      operatingSystem: data.operatingSystem,
      osVersion: data.osVersion,
      agentVersion: data.agentVersion,
    }),
  });
}

export async function revokeEndpointAgent(agentId: string): Promise<EndpointAgent> {
  return requestJson<EndpointAgent>(`/api/agents/${encodeURIComponent(agentId)}/revoke`, {
    method: "POST",
    headers: agentAdminHeaders(),
  });
}

export async function rotateEndpointAgent(agentId: string): Promise<EndpointAgent & { credential: string }> {
  return requestJson<EndpointAgent & { credential: string }>(`/api/agents/${encodeURIComponent(agentId)}/rotate`, {
    method: "POST",
    headers: agentAdminHeaders(),
  });
}

export async function simulateEndpointScenario(
  scenario: "windows_brute_force" | "linux_account_creation" | "honeypot_pivot",
  hostname?: string
): Promise<{
  ok: boolean;
  scenario: string;
  title: string;
  targetHost: string;
  eventsGenerated: number;
  alertsTriggered: number;
  timestamp: string;
}> {
  return requestJson("/api/agents/demo/simulate", {
    method: "POST",
    headers: agentAdminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ scenario, hostname }),
  });
}
