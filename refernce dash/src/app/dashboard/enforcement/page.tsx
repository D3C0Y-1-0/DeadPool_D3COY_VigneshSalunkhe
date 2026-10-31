"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson, type Agent, type ApprovalItem } from "@/lib/api";

type Health = { mode: string; status: string };

export default function EnforcementPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchJson<Health>("/health"),
      fetchJson<Agent[]>("/agents"),
      fetchJson<ApprovalItem[]>("/approvals?status=pending")
    ])
      .then(([healthData, agentData, approvalData]) => {
        if (!active) return;
        setHealth(healthData);
        setAgents(agentData);
        setApprovals(approvalData);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Enforcement status unavailable."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const restricted = agents.filter((agent) => agent.status === "restricted").length;
  const isolated = agents.filter((agent) => agent.status === "isolated").length;

  return (
    <div className="page-content">
      <section className="page-heading"><div><div className="eyebrow">RUNTIME CONTROL</div><h1>Enforcement</h1><p>Current backend mode, outstanding approvals, and agent posture. Decisions and actual execution outcomes are distinct.</p></div><span className={`status-badge ${health?.mode === "enforce" ? "badge-normal" : "badge-warning"}`}>{health?.mode?.toUpperCase() ?? "UNKNOWN"}</span></section>
      {error && <div className="notice notice-danger" role="alert">Enforcement information unavailable: {error}</div>}
      {health && health.mode !== "enforce" && <div className="notice notice-warning">Shadow mode records and scores actions but does not enforce blocks. This dashboard cannot switch runtime mode.</div>}
      <section className="metric-strip">
        {[{ label: "Restricted agents", value: restricted }, { label: "Isolated agents", value: isolated }, { label: "Pending approvals", value: approvals.length }, { label: "Runtime mode", value: health?.mode?.toUpperCase() ?? "—" }].map((item) => <div className="metric-card panel-shadow" key={item.label}><div className="stat-label">{item.label}</div><div className="kpi-value">{loading ? "…" : error && !health ? "—" : item.value}</div></div>)}
      </section>
      <section className="panel panel-shadow">
        <div className="card-title"><h2 className="section-title">Agent posture</h2><Link href="/dashboard/agents">Open agent inventory →</Link></div>
        {loading ? <div className="empty-state">Loading backend posture…</div> : agents.length === 0 ? <div className="empty-state">{error ? "Agent posture unavailable." : "No agents are registered."}</div> : (
          <div className="table-card"><table><thead><tr><th>Agent</th><th>Role</th><th>Posture</th><th>Latest risk</th><th>Response</th></tr></thead><tbody>
            {agents.map((agent) => <tr key={agent.agent_id}>
              <td><Link href={`/dashboard/agents/${encodeURIComponent(agent.agent_id)}`}>{agent.agent_id}</Link></td><td>{agent.role}</td>
              <td><span className={`status-badge ${agent.status === "normal" ? "badge-normal" : agent.status === "restricted" ? "badge-warning" : "badge-danger"}`}>{agent.status || "normal"}</span></td>
              <td>{Math.round(agent.last_risk)}</td><td><Link href={`/dashboard/agents/${encodeURIComponent(agent.agent_id)}`}>Manage posture →</Link></td>
            </tr>)}
          </tbody></table></div>
        )}
      </section>
    </div>
  );
}
