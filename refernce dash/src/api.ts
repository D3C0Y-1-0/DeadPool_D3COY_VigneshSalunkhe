// REST + WebSocket client. The API base URL comes from the server-safe environment configuration.
export const API =
  process.env.NEXT_PUBLIC_DRISHTI_API_URL ??
  process.env.DRISHTI_API_URL ??
  "http://localhost:8000";
export const WS_URL = API.replace(/^http/, "ws") + "/ws/live";

export type Band = "LOW" | "WATCH" | "ELEVATED" | "HIGH" | "CRITICAL";

export interface Agent {
  agent_id: string;
  role: string;
  role_version: number;
  owner: string | null;
  status: string;
  event_count: number;
  last_risk: number;
  max_risk: number;
}

export interface WardenEvent {
  id: string;
  decision?: string;
  block_reason?: string | null;
  ts: string;
  agent_id: string;
  tool: string;
  resource: string | null;
  destination: string | null;
  risk: number;
  band: Band;
  lens: Record<string, any>;
}

export interface Alert {
  id: string;
  decision?: string;
  agent_id: string;
  risk: number;
  band: Band;
  shadow_action: string;
  message?: string;
  reasons?: string[];
  event_id: string;
}

export async function get<T>(path: string): Promise<T> {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json() as Promise<T>;
}

export interface Decoy { id: string; kind: string; match: string; description: string; hits: number }
export interface Outbox { messages: number; bytes: number }

export interface Explanation {
  headline: string;
  risk: number;
  event_risk: number;
  band: Band;
  recommended_action: string;
  top_reasons: { lens: string; kind: string; text: string; delta?: number; risk_without?: number; minimum_risk?: number }[];
  more_reasons: number;
  leave_one_out: Record<string, { risk_without: number; delta: number }>;
  evidence_timeline: { event_id: string; tool: string; resource: string | null; risk: number; band: Band;
                       role_in_chain: string | null; is_trigger: boolean }[];
  owasp: { id: string; name: string; because: string }[];
  what_would_change_the_verdict: string[];
  session: { session: number; raised_by_session: boolean };
}
export interface AlertDetail extends Alert { explanation: Explanation }

export interface Approval {
  id: string;
  agent_id: string;
  event_id: string;
  status: string;
  request: { tool: string; args: Record<string, unknown> };
}

export async function post<T>(path: string, body: unknown = {}): Promise<T> {
  const r = await fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json() as Promise<T>;
}
