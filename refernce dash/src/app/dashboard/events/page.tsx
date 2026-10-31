"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchJson, type EventItem } from "@/lib/api";

function bandClass(band: string) {
  if (band === "CRITICAL" || band === "HIGH") return "badge-danger";
  if (band === "ELEVATED" || band === "WATCH") return "badge-warning";
  return "badge-normal";
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [agent, setAgent] = useState("all");
  const [band, setBand] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchJson<EventItem[]>("/events?limit=100")
      .then((data) => { if (active) setEvents(data); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load events."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const agents = useMemo(() => Array.from(new Set(events.map((event) => event.agent_id))).sort(), [events]);
  const filtered = events.filter((event) => (agent === "all" || event.agent_id === agent) && (band === "all" || event.band === band));

  return (
    <div className="page-content">
      <section className="page-heading">
        <div><div className="eyebrow">RUNTIME TELEMETRY</div><h1>Events</h1><p>Latest 100 records returned by the backend. Filters apply to this displayed window.</p></div>
        <div className="filter-row">
          <select value={agent} onChange={(event) => setAgent(event.target.value)} aria-label="Filter by agent">
            <option value="all">All agents</option>{agents.map((id) => <option value={id} key={id}>{id}</option>)}
          </select>
          <select value={band} onChange={(event) => setBand(event.target.value)} aria-label="Filter by risk band">
            <option value="all">All risk bands</option>{["LOW", "WATCH", "ELEVATED", "HIGH", "CRITICAL"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>
      </section>
      {error && <div className="notice notice-danger" role="alert">Events unavailable: {error}</div>}
      {loading ? <div className="panel panel-shadow empty-state">Loading event records…</div> : (
        <section className="panel panel-shadow">
          <div className="card-title"><h2 className="section-title">Event stream</h2><span className="stat-label">{filtered.length} shown · {events.length} loaded</span></div>
          {filtered.length === 0 ? <div className="empty-state">{error ? "Event records are unavailable." : "No events match these filters."}</div> : (
            <div className="table-card">
              <table>
                <thead><tr><th>Timestamp</th><th>Event</th><th>Agent</th><th>Tool</th><th>Resource / destination</th><th>Risk</th><th>Decision</th></tr></thead>
                <tbody>{filtered.map((event) => (
                  <tr key={event.id}>
                    <td>{new Date(event.ts).toLocaleString()}</td>
                    <td><Link href={`/dashboard/events/${event.id}`}>{event.id}</Link></td>
                    <td><Link href={`/dashboard/agents/${encodeURIComponent(event.agent_id)}`}>{event.agent_id}</Link></td>
                    <td>{event.tool}</td>
                    <td>{event.resource ?? event.destination ?? "—"}</td>
                    <td><span className={`status-badge ${bandClass(event.band)}`}>{event.band} · {Math.round(event.risk)}</span></td>
                    <td>{event.decision ?? "Not returned"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
