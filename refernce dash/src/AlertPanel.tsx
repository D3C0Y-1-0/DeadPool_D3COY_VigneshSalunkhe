import { useEffect, useState } from "react";
import { AlertDetail, Band, get } from "./api";

const bandClass = (b: Band) => `band band-${b.toLowerCase()}`;

// Everything an analyst needs to decide in under a minute: what, why (with measured effect),
// the causal chain, the standards mapping, and what would change the verdict.
export default function AlertPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setAlert(null);
    setErr(false);
    get<AlertDetail>(`/alerts/${id}`).then(setAlert).catch(() => setErr(true));
  }, [id]);

  if (err) return <aside className="panel"><button onClick={onClose}>close</button><p>Could not load {id}.</p></aside>;
  if (!alert) return <aside className="panel"><p className="muted">loading {id}…</p></aside>;
  const x = alert.explanation;

  return (
    <aside className="panel">
      <button className="close" onClick={onClose}>close ✕</button>
      <h2>{alert.id}</h2>
      <p>
        <span className={bandClass(x.band)}>{x.band}</span>
        <b>{x.risk.toFixed(0)}</b> · recommended: <b>{x.recommended_action}</b>
        {x.session.raised_by_session && <span className="muted"> · raised by session risk</span>}
      </p>
      <p>{x.headline}</p>
      {(x as any).action_taken && (
        <p className="reason">Action taken: <b>{(x as any).action_taken.decision}</b>
          {(x as any).action_taken.block_reason ? ` (${(x as any).action_taken.block_reason})` : ""}
          {(x as any).action_taken.posture_after && (x as any).action_taken.posture_after !== "normal"
            ? ` · agent ${(x as any).action_taken.posture_after}` : ""}</p>
      )}

      <h3>Why</h3>
      <ol>
        {x.top_reasons.map((r, i) => (
          <li key={i}>
            {r.text}
            {r.kind === "conclusive" && <span className="muted"> — conclusive (risk ≥ {r.minimum_risk})</span>}
            {r.delta !== undefined && (
              <span className="muted"> — without this: {r.risk_without!.toFixed(0)} (adds {r.delta.toFixed(0)})</span>
            )}
          </li>
        ))}
      </ol>

      <h3>Causal chain</h3>
      <ul className="timeline">
        {x.evidence_timeline.map((t) => (
          <li key={t.event_id} className={t.is_trigger ? "trigger" : ""}>
            <span className={bandClass(t.band)}>{t.band}</span>
            {t.tool} <span className="muted">{t.resource ?? ""}</span>
            {t.role_in_chain && <div className="reason">← {t.role_in_chain}</div>}
          </li>
        ))}
      </ul>

      <h3>OWASP Agentic Top 10 (2026)</h3>
      {x.owasp.map((o) => (
        <div key={o.id} className="reason"><b>{o.id}</b> {o.name}: {o.because}</div>
      ))}

      <h3>What would change the verdict</h3>
      <ul>{x.what_would_change_the_verdict.map((h, i) => <li key={i} className="reason">{h}</li>)}</ul>
    </aside>
  );
}
