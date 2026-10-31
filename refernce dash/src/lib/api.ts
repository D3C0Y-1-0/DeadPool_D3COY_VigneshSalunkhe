export const apiBase = process.env.NEXT_PUBLIC_DRISHTI_API_URL ?? process.env.DRISHTI_API_URL ?? "http://localhost:8000";
export const WS_URL = `${apiBase.replace(/^http/, "ws")}/ws/live`;

export type Band = "LOW" | "WATCH" | "ELEVATED" | "HIGH" | "CRITICAL";

export type Agent = {
  agent_id: string;
  role: string;
  role_version: number;
  owner: string | null;
  status: string;
  event_count: number;
  last_risk: number;
  max_risk: number;
};

export type EventItem = {
  id: string;
  agent_id: string;
  role?: string;
  tool: string;
  resource: string | null;
  resource_class?: string | null;
  sensitivity?: number;
  destination: string | null;
  risk: number;
  band: Band;
  decision?: string;
  block_reason?: string | null;
  ts: string;
  lens?: Record<string, any>;
};

export type ScenarioResult = {
  scenario: "normal" | "injection" | "drift" | "mimicry";
  agent_id: string;
  mode: string;
  summary: Record<string, unknown>;
  events: EventItem[];
};

export type AlertItem = {
  id: string;
  agent_id: string;
  risk: number;
  band: Band;
  decision?: string;
  shadow_action: string;
  message?: string;
  reasons?: string[];
  event_id: string;
};

export type ApprovalItem = {
  id: string;
  agent_id: string;
  status: string;
  event_id: string;
  request: { tool: string; args: Record<string, unknown> };
};

export type ContractItem = {
  role: string;
  latest_version: number;
};

export type ToolItem = {
  name: string;
  resource_class: string;
  sensitivity: string;
  sink_type?: string;
  is_irreversible?: boolean;
};

export type DecoyItem = {
  id: string;
  kind: string;
  match: string;
  description: string;
  hits: number;
};

export type OutboxItem = {
  messages: number;
  bytes: number;
  items?: Array<Record<string, unknown>>;
};

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${path} -> ${response.status}: ${text || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function postJson<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  return fetchJson<T>(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}
