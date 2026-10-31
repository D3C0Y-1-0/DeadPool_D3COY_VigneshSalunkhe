import { Incident, IncidentSummary, KpiStats, NormalizedEvent, ActionItem, TechniqueItem } from "./types";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...init });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json() as { detail?: string };
      detail = body.detail || detail;
    } catch {
      // The response may be plain text or empty.
    }
    throw new Error(`${response.status} ${detail || "Request failed"}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchStats(): Promise<KpiStats> {
  return requestJson<KpiStats>("/api/stats");
}

export async function fetchEvents(limit: number = 200): Promise<NormalizedEvent[]> {
  return requestJson<NormalizedEvent[]>(`/api/events?limit=${limit}`);
}

export async function fetchIncidents(): Promise<IncidentSummary[]> {
  return requestJson<IncidentSummary[]>("/api/incidents");
}

export async function fetchIncident(id: string): Promise<Incident> {
  return requestJson<Incident>(`/api/incidents/${encodeURIComponent(id)}`);
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

export async function fetchAttackMatrix(): Promise<TechniqueItem[]> {
  return requestJson<TechniqueItem[]>("/api/attack-matrix");
}

export async function triggerDemo(scenario: "targeted" | "noise"): Promise<{ ok: boolean; status?: string }> {
  return requestJson<{ ok: boolean; status?: string }>(`/api/demo/${scenario}`, { method: "POST" });
}

export async function resetDemo(): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>("/api/demo/reset", { method: "POST" });
}
