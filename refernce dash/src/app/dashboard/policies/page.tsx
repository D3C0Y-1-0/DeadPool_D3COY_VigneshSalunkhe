"use client";

import { useEffect, useState } from "react";
import { fetchJson, type ContractItem } from "@/lib/api";

type ContractDetail = ContractItem & {
  purpose: string;
  allowed_tools: string[];
  allowed_resource_classes: string[];
  denied_resource_classes: string[];
  data_sensitivity_ceiling: string;
  egress_allowlist: string[];
  typical_sequences: string[][];
  budgets: Record<string, number>;
};

export default function PoliciesPage() {
  const [mode, setMode] = useState<string | null>(null);
  const [contracts, setContracts] = useState<ContractDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [health, contractIndex] = await Promise.all([
          fetchJson<{ mode: string }>("/health"),
          fetchJson<ContractItem[]>("/contracts")
        ]);
        const details = await Promise.all(contractIndex.map((item) => fetchJson<ContractDetail>(`/contracts/${encodeURIComponent(item.role)}`)));
        if (!active) return;
        setMode(health.mode);
        setContracts(details);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load backend policies.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  return (
    <div className="page-content">
      <section className="page-heading"><div><div className="eyebrow">DECLARED AUTHORITY</div><h1>Policies & contracts</h1><p>Read-only role contract definitions and the backend runtime mode. Policy decisions remain exclusively in FastAPI.</p></div><span className={`status-badge ${mode === "enforce" ? "badge-normal" : "badge-warning"}`}>{mode?.toUpperCase() ?? "UNKNOWN"}</span></section>
      {error && <div className="notice notice-danger" role="alert">Policy catalog unavailable: {error}</div>}
      {loading ? <div className="panel panel-shadow empty-state">Loading role contracts…</div> : contracts.length === 0 ? <div className="panel panel-shadow empty-state">The backend did not return any role contracts.</div> : (
        <section className="contract-grid">{contracts.map((contract) => (
          <article className="panel panel-shadow" key={contract.role}>
            <div className="section-heading"><div><div className="eyebrow">ROLE CONTRACT · v{contract.latest_version}</div><h2 className="section-title">{contract.role}</h2></div><span className={`status-badge ${mode === "enforce" ? "badge-normal" : "badge-warning"}`}>{mode === "enforce" ? "Enforce mode" : "Shadow mode"}</span></div>
            <p className="text-muted">{contract.purpose}</p>
            <div className="contract-columns">
              <div><h3 className="subsection-title">Allowed tools</h3><div className="tag-list">{contract.allowed_tools.map((tool) => <span className="status-badge badge-normal" key={tool}>{tool}</span>)}</div></div>
              <div><h3 className="subsection-title">Allowed resource classes</h3><div className="tag-list">{contract.allowed_resource_classes.map((item) => <span className="status-badge badge-info" key={item}>{item}</span>)}</div></div>
              <div><h3 className="subsection-title">Denied resource classes</h3><div className="tag-list">{contract.denied_resource_classes.map((item) => <span className="status-badge badge-danger" key={item}>{item}</span>)}</div></div>
              <div><h3 className="subsection-title">Sensitivity ceiling</h3><span>{contract.data_sensitivity_ceiling}</span></div>
              <div><h3 className="subsection-title">Egress allowlist</h3><div className="tag-list">{contract.egress_allowlist.map((host) => <span className="status-badge badge-info" key={host}>{host}</span>)}</div></div>
            </div>
            {contract.typical_sequences?.length > 0 && <div className="contract-sequences"><h3 className="subsection-title">Typical sequences</h3>{contract.typical_sequences.map((sequence, index) => <code key={index}>{sequence.join(" → ")}</code>)}</div>}
            {contract.budgets && <div className="contract-sequences"><h3 className="subsection-title">Declared budgets</h3><div className="tag-list">{Object.entries(contract.budgets).map(([name, value]) => <span className="status-badge badge-info" key={name}>{name.replaceAll("_", " ")}: {value}</span>)}</div></div>}
          </article>
        ))}</section>
      )}
    </div>
  );
}
