"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchJson, type EventItem } from "@/lib/api";

function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\t\r =+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export default function AuditPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchJson<EventItem[]>("/events?limit=500")
      .then((rows) => { if (active) setEvents(rows); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load event history."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => events.filter((event) => {
    const search = query.trim().toLowerCase();
    const matchesQuery = !search || event.agent_id.toLowerCase().includes(search) || event.id.toLowerCase().includes(search);
    const matchesRisk = riskFilter === "all" || event.band === riskFilter;
    const matchesDecision = decisionFilter === "all" || event.decision === decisionFilter;
    return matchesQuery && matchesRisk && matchesDecision;
  }), [events, query, riskFilter, decisionFilter]);

  function exportCsv() {
    const header = ["timestamp", "event_id", "agent", "tool", "resource", "destination", "decision", "block_reason", "risk", "band"];
    const rows = filtered.map((event) => [
      event.ts, event.id, event.agent_id, event.tool, event.resource, event.destination,
      event.decision, event.block_reason, event.risk, event.band
    ]);
    const content = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "drishti-event-history.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-content">
      <section className="page-heading"><div><div className="eyebrow">RECORDED ACTIVITY</div><h1>Event history</h1><p>This view contains the latest 500 stored events. Response actions are not represented as a complete audit ledger by the current backend.</p></div></section>
      <div className="notice"><span>CSV export includes only the backend records currently loaded and matching the filters.</span></div>
      {error && <div className="notice notice-danger" role="alert">Event history unavailable: {error}</div>}
      <section className="panel panel-shadow">
        <div className="filter-toolbar">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agent or event ID" aria-label="Search by agent or event ID" />
          <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} aria-label="Filter risk band">
            <option value="all">All risk bands</option>{["LOW", "WATCH", "ELEVATED", "HIGH", "CRITICAL"].map((band) => <option key={band}>{band}</option>)}
          </select>
          <select value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value)} aria-label="Filter decision">
            <option value="all">All decisions</option>{Array.from(new Set(events.map((event) => event.decision).filter((decision): decision is string => Boolean(decision)))).map((decision) => <option key={decision}>{decision}</option>)}
          </select>
          <button className="primary-btn" disabled={filtered.length === 0} onClick={exportCsv}>Export filtered CSV</button>
        </div>
        <div className="card-title"><h2 className="section-title">Stored event records</h2><span className="stat-label">{filtered.length} shown · {events.length} loaded</span></div>
        {loading ? <div className="empty-state">Loading event history…</div> : filtered.length === 0 ? <div className="empty-state">No event records match these filters.</div> : (
          <div className="table-card"><table>
            <thead><tr><th>Timestamp</th><th>Agent</th><th>Action</th><th>Resource</th><th>Risk</th><th>Decision</th><th>Outcome</th></tr></thead>
            <tbody>{filtered.map((event) => <tr key={event.id}>
              <td>{new Date(event.ts).toLocaleString()}</td>
              <td><Link href={`/dashboard/agents/${encodeURIComponent(event.agent_id)}`}>{event.agent_id}</Link></td>
              <td><Link href={`/dashboard/events/${encodeURIComponent(event.id)}`}>{event.tool}</Link></td>
              <td>{event.resource ?? event.destination ?? "—"}</td>
              <td>{event.band} · {Math.round(event.risk)}</td>
              <td>{event.decision ?? "Not returned"}</td>
              <td>{event.decision === "BLOCK" ? "Blocked decision; execution result not recorded here" : "See event details"}</td>
            </tr>)}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
