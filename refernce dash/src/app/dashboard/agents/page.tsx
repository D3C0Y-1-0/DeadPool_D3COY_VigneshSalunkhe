"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchJson, postJson, type Agent, type ContractItem } from "@/lib/api";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [search, setSearch] = useState("");
  const [agentId, setAgentId] = useState("");
  const [role, setRole] = useState("");
  const [owner, setOwner] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    const [agentData, contractData] = await Promise.all([
      fetchJson<Agent[]>("/agents"),
      fetchJson<ContractItem[]>("/contracts")
    ]);
    setAgents(agentData);
    setContracts(contractData);
    setRole((current) => current || contractData[0]?.role || "");
  }

  useEffect(() => {
    let active = true;
    Promise.all([fetchJson<Agent[]>("/agents"), fetchJson<ContractItem[]>("/contracts")])
      .then(([agentData, contractData]) => {
        if (!active) return;
        setAgents(agentData);
        setContracts(contractData);
        setRole(contractData[0]?.role ?? "");
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load the agent registry."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(
    () => agents.filter((agent) => `${agent.agent_id} ${agent.role} ${agent.owner ?? ""}`.toLowerCase().includes(search.toLowerCase())),
    [agents, search]
  );

  async function registerAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const normalizedId = agentId.trim();
    if (!normalizedId || !role) {
      setError("Enter an agent ID and select an available role contract.");
      return;
    }
    setSaving(true);
    try {
      await postJson<Agent>("/agents", { agent_id: normalizedId, role, owner: owner.trim() || null });
      await reload();
      setMessage(`Agent ${normalizedId} registered with the ${role} contract.`);
      setAgentId("");
      setOwner("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Agent registration failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-content">
      <section className="page-heading">
        <div><div className="eyebrow">IDENTITY INVENTORY</div><h1>Agents</h1><p>Registered identities, declared role contracts, and observed runtime posture from the backend.</p></div>
        <span className="status-badge badge-info">{agents.length} registered</span>
      </section>
      {error && <div className="notice notice-danger" role="alert">{error}</div>}
      {message && <div className="notice">{message}</div>}

      <section className="panel panel-shadow">
        <div className="card-title"><div><div className="eyebrow">OPERATOR ACTION</div><h2 className="section-title">Register agent</h2></div></div>
        <form className="registration-form" onSubmit={(event) => void registerAgent(event)}>
          <label>Agent ID<input required maxLength={120} value={agentId} onChange={(event) => setAgentId(event.target.value)} placeholder="e.g. procurement-demo-01" /></label>
          <label>Role contract<select required value={role} onChange={(event) => setRole(event.target.value)}>{contracts.map((contract) => <option key={contract.role} value={contract.role}>{contract.role} · v{contract.latest_version}</option>)}</select></label>
          <label>Owner (optional)<input value={owner} onChange={(event) => setOwner(event.target.value)} maxLength={120} placeholder="Team or service owner" /></label>
          <button className="primary-btn" disabled={saving || contracts.length === 0}>{saving ? "Registering…" : "Register agent"}</button>
        </form>
        <p className="form-help">Registration creates an identity using an existing contract. Contract contents remain read-only here.</p>
      </section>

      <section className="panel panel-shadow">
        <div className="card-title">
          <h2 className="section-title">Agent fleet</h2>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ID, role, or owner" aria-label="Search agents" />
        </div>
        {loading ? <div className="empty-state">Loading registered agents…</div> : filtered.length === 0 ? (
          <div className="empty-state">{agents.length ? "No agents match this search." : "No agents registered yet. Use the form above to register one."}</div>
        ) : (
          <div className="table-card">
            <table>
              <thead><tr><th>Agent</th><th>Role</th><th>Version</th><th>Owner</th><th>Posture</th><th>Last risk</th><th>Peak risk</th><th>Events</th></tr></thead>
              <tbody>{filtered.map((agent) => (
                <tr key={agent.agent_id}>
                  <td><Link href={`/dashboard/agents/${encodeURIComponent(agent.agent_id)}`}>{agent.agent_id}</Link></td>
                  <td>{agent.role}</td><td>{agent.role_version}</td><td>{agent.owner ?? "—"}</td>
                  <td><span className={`status-badge ${agent.status === "normal" ? "badge-normal" : agent.status === "restricted" ? "badge-warning" : "badge-danger"}`}>{agent.status || "normal"}</span></td>
                  <td>{Math.round(agent.last_risk)}</td><td>{Math.round(agent.max_risk)}</td><td>{agent.event_count}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
