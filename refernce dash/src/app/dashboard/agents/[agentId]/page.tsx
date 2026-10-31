"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { fetchJson, postJson, type Agent, type EventItem } from "@/lib/api";

type AgentDetail = Agent & { recent_events: EventItem[] };
type ContractDetail = {
  role: string;
  version: number;
  purpose: string;
  allowed_tools: string[];
  allowed_resource_classes: string[];
  denied_resource_classes: string[];
  data_sensitivity_ceiling: string;
  typical_sequences: string[][];
  egress_allowlist: string[];
  budgets: Record<string, number>;
};
type Behavior = {
  baseline?: { learned_events?: number; anchor_frozen?: boolean; top_transitions?: unknown[] };
  drift?: { [key: string]: unknown };
  [key: string]: unknown;
};

export default function AgentDetailPage({ params }: { params: { agentId: string } }) {
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [behavior, setBehavior] = useState<Behavior | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const agentPath = `/agents/${encodeURIComponent(params.agentId)}`;

  const load = useCallback(async () => {
    const detail = await fetchJson<AgentDetail>(agentPath);
    const [contractData, behaviorData] = await Promise.all([
      fetchJson<ContractDetail>(`/contracts/${encodeURIComponent(detail.role)}`),
      fetchJson<Behavior>(`${agentPath}/behavior`)
    ]);
    setAgent(detail);
    setContract(contractData);
    setBehavior(behaviorData);
  }, [agentPath]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchJson<AgentDetail>(agentPath),
    ])
      .then(async ([detail]) => {
        const [contractData, behaviorData] = await Promise.all([
          fetchJson<ContractDetail>(`/contracts/${encodeURIComponent(detail.role)}`),
          fetchJson<Behavior>(`${agentPath}/behavior`)
        ]);
        if (!active) return;
        setAgent(detail);
        setContract(contractData);
        setBehavior(behaviorData);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load agent details."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [agentPath]);

  async function changePosture(action: "isolate" | "restore" | "resume") {
    const confirmations: Record<typeof action, string> = {
      isolate: "Isolate this agent? Its current access will be stopped by the backend.",
      restore: "Restore this agent? This lifts the backend restriction.",
      resume: "Resume without tainted input? The backend will clear listed tainted sources."
    };
    if (!window.confirm(confirmations[action])) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await postJson<{ posture?: string; drop_sources?: string[] }>(`${agentPath}/${action}`);
      setMessage(`${action} confirmed by backend${result.posture ? `; posture: ${result.posture}` : ""}${result.drop_sources?.length ? `; cleared sources: ${result.drop_sources.join(", ")}` : ""}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not ${action} this agent.`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="panel panel-shadow empty-state">Loading agent record, contract, and behavior profile…</div>;
  if (!agent) return <div className="page-content"><Link href="/dashboard/agents" className="back-link"><ArrowLeft size={15} /> Back to agents</Link><div className="notice notice-danger" role="alert">{error ?? "Agent not found."}</div></div>;

  return (
    <div className="page-content">
      <Link href="/dashboard/agents" className="back-link"><ArrowLeft size={15} /> Back to agents</Link>
      {error && <div className="notice notice-danger" role="alert">{error}</div>}
      {message && <div className="notice">{message}</div>}
      <section className="page-heading">
        <div><div className="eyebrow">AGENT IDENTITY</div><h1>{agent.agent_id}</h1><p>{agent.role} · contract v{agent.role_version} · owner {agent.owner ?? "unassigned"}</p></div>
        <span className={`status-badge ${agent.status === "normal" ? "badge-normal" : agent.status === "restricted" ? "badge-warning" : "badge-danger"}`}>{agent.status || "normal"}</span>
      </section>
      <section className="metric-strip">
        <div className="metric-card"><div className="stat-label">Current risk</div><div className="kpi-value">{Math.round(agent.last_risk)}</div></div>
        <div className="metric-card"><div className="stat-label">Peak risk</div><div className="kpi-value">{Math.round(agent.max_risk)}</div></div>
        <div className="metric-card"><div className="stat-label">Recorded actions</div><div className="kpi-value">{agent.event_count}</div></div>
        <div className="metric-card"><div className="stat-label">Learned baseline events</div><div className="kpi-value">{behavior?.baseline?.learned_events ?? "—"}</div></div>
      </section>
      <section className="detail-grid">
        <article className="panel panel-shadow">
          <div className="section-heading"><h2 className="section-title">Role contract · v{contract?.version ?? agent.role_version}</h2><span className="status-badge badge-info">Declared authority</span></div>
          <p className="text-muted">{contract?.purpose ?? "No purpose was returned."}</p>
          <h3 className="subsection-title">Permitted tools</h3><div className="tag-list">{contract?.allowed_tools.map((tool) => <span className="status-badge badge-normal" key={tool}>{tool}</span>)}</div>
          <h3 className="subsection-title">Allowed resource classes</h3><div className="tag-list">{contract?.allowed_resource_classes.map((item) => <span className="status-badge badge-info" key={item}>{item}</span>)}</div>
          <h3 className="subsection-title">Denied resource classes</h3><div className="tag-list">{contract?.denied_resource_classes.map((item) => <span className="status-badge badge-danger" key={item}>{item}</span>)}</div>
          <p className="form-help">This contract is read-only in the dashboard. Observed events do not amend the declared role.</p>
        </article>
        <article className="panel panel-shadow">
          <h2 className="section-title">Behavior profile</h2>
          <p className="text-muted">Signals and baseline state returned by the backend; missing values are not treated as zero.</p>
          <pre className="json-panel">{JSON.stringify(behavior, null, 2)}</pre>
        </article>
      </section>
      <section className="panel panel-shadow">
        <div className="section-heading"><h2 className="section-title">Posture controls</h2><ShieldAlert size={18} color="#fbbf24" /></div>
        <p className="text-muted">Actions are applied by the backend and affect the agent’s brokered token scope.</p>
        <div className="action-buttons">
          <button className="danger-btn" disabled={busy} onClick={() => void changePosture("isolate")}>Isolate agent</button>
          <button className="secondary-btn" disabled={busy} onClick={() => void changePosture("restore")}>Restore posture</button>
          <button className="primary-btn" disabled={busy} onClick={() => void changePosture("resume")}>Resume without tainted input</button>
        </div>
      </section>
      <section className="panel panel-shadow">
        <div className="card-title"><h2 className="section-title">Recent events</h2><span className="stat-label">{agent.recent_events.length} returned</span></div>
        {agent.recent_events.length === 0 ? <div className="empty-state">No events are recorded for this agent.</div> : (
          <div className="table-card"><table>
            <thead><tr><th>Timestamp</th><th>Event</th><th>Tool</th><th>Resource</th><th>Risk</th><th>Decision</th></tr></thead>
            <tbody>{agent.recent_events.slice(0, 20).map((event) => (
              <tr key={event.id}><td>{new Date(event.ts).toLocaleString()}</td><td><Link href={`/dashboard/events/${event.id}`}>{event.id}</Link></td><td>{event.tool}</td><td>{event.resource ?? event.destination ?? "—"}</td><td>{event.band} · {Math.round(event.risk)}</td><td>{event.decision ?? "Not returned"}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
