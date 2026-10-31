"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { fetchJson, type AlertItem, type EventItem } from "@/lib/api";

type AlertExplanation = AlertItem & {
  explanation?: {
    headline?: string;
    top_reasons?: Array<{ lens: string; kind: string; text: string; delta?: number }>;
    evidence_timeline?: Array<{ event_id: string; tool: string; resource: string | null; risk: number; band: string; is_trigger: boolean }>;
    owasp?: Array<{ id: string; name: string; because: string }>;
    what_would_change_the_verdict?: string[];
  };
};

function riskClass(band: string) {
  return band === "CRITICAL" || band === "HIGH" ? "badge-danger" : band === "ELEVATED" || band === "WATCH" ? "badge-warning" : "badge-normal";
}

export default function EventDetailPage({ params }: { params: { eventId: string } }) {
  const [event, setEvent] = useState<EventItem | null>(null);
  const [alert, setAlert] = useState<AlertExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [eventData, alerts] = await Promise.all([
          fetchJson<EventItem>(`/events/${encodeURIComponent(params.eventId)}`),
          fetchJson<AlertItem[]>("/alerts?limit=500")
        ]);
        const related = alerts.find((item) => item.event_id === eventData.id);
        const explanation = related
          ? await fetchJson<AlertExplanation>(`/alerts/${encodeURIComponent(related.id)}`)
          : null;
        if (active) {
          setEvent(eventData);
          setAlert(explanation);
          setError(null);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load event details.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [params.eventId]);

  return (
    <div className="page-content">
      <Link href="/dashboard/events" className="back-link"><ArrowLeft size={15} /> Back to events</Link>
      {loading ? <div className="panel panel-shadow empty-state">Loading event investigation…</div> : error ? (
        <div className="notice notice-danger" role="alert">Event details unavailable: {error}</div>
      ) : event ? (
        <>
          <section className="page-heading">
            <div><div className="eyebrow">EVENT INVESTIGATION</div><h1>{event.id}</h1><p>{new Date(event.ts).toLocaleString()} · agent {event.agent_id}</p></div>
            <span className={`status-badge ${riskClass(event.band)}`}>{event.band} · {Math.round(event.risk)}</span>
          </section>
          <section className="detail-grid">
            <article className="panel panel-shadow">
              <h2 className="section-title">Event summary</h2>
              <dl className="detail-list">
                <div><dt>Agent</dt><dd><Link href={`/dashboard/agents/${encodeURIComponent(event.agent_id)}`}>{event.agent_id}</Link></dd></div>
                <div><dt>Requested tool</dt><dd>{event.tool}</dd></div>
                <div><dt>Resource</dt><dd>{event.resource ?? "Not reported"}</dd></div>
                <div><dt>Destination</dt><dd>{event.destination ?? "Not reported"}</dd></div>
                <div><dt>Backend decision</dt><dd>{event.decision ?? "Not reported"}</dd></div>
                <div><dt>Block reason</dt><dd>{event.block_reason ?? "None returned"}</dd></div>
              </dl>
            </article>
            <article className="panel panel-shadow">
              <h2 className="section-title">Detection evidence</h2>
              {event.lens && Object.keys(event.lens).length ? (
                <div className="evidence-list">{Object.entries(event.lens).map(([name, evidence]) => {
                  const record = evidence as { score?: number; reason?: string; fired?: boolean };
                  return <div className="evidence-row" key={name}>
                    <div><strong>{name}</strong><p>{record.reason ?? (record.fired ? "Signal fired." : "No explanation provided.")}</p></div>
                    <span className="status-badge badge-info">{typeof record.score === "number" ? record.score.toFixed(2) : "Signal"}</span>
                  </div>;
                })}</div>
              ) : <div className="empty-state">The backend did not return lens evidence for this event.</div>}
            </article>
          </section>
          {alert?.explanation ? (
            <section className="panel panel-shadow">
              <div className="section-heading"><div><div className="eyebrow">EXPLAINABLE RISK</div><h2 className="section-title">{alert.explanation.headline ?? "Risk explanation"}</h2></div><ShieldAlert size={20} color="#fbbf24" /></div>
              <div className="evidence-list">
                {alert.explanation.top_reasons?.map((reason, index) => (
                  <div className="evidence-row" key={`${reason.lens}-${index}`}>
                    <div><strong>{reason.lens} · {reason.kind}</strong><p>{reason.text}</p></div>
                    {typeof reason.delta === "number" && <span className="status-badge badge-warning">+{reason.delta}</span>}
                  </div>
                ))}
              </div>
              {alert.explanation.owasp?.length ? <div className="tag-list">{alert.explanation.owasp.map((item) => <span className="status-badge badge-info" key={item.id}>{item.id} · {item.name}</span>)}</div> : null}
              {alert.explanation.what_would_change_the_verdict?.length ? <div className="verdict-note"><strong>What could change the verdict</strong><ul>{alert.explanation.what_would_change_the_verdict.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
            </section>
          ) : (
            <div className="notice"><ShieldAlert size={18} /><span>No associated alert explanation was returned. This event remains shown with its recorded backend decision and available lenses.</span></div>
          )}
        </>
      ) : <div className="panel panel-shadow empty-state">This event was not found.</div>}
    </div>
  );
}
