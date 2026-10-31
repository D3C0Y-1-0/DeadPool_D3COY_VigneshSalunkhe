import { useEffect, useRef, useState } from "react";
import AlertPanel from "./AlertPanel";
import { Agent, Alert, Approval, Band, Decoy, Outbox, WardenEvent, WS_URL, get, post } from "./api";

const bandClass = (b: Band) => `band band-${b.toLowerCase()}`;

// What Warden DID with an event, not just how risky it looked.
function DecisionChip({ decision, reason }: { decision?: string; reason?: string | null }) {
  if (!decision || decision === "ALLOW") return null;
  const label = decision === "PENDING_APPROVAL" ? "PAUSED" : decision === "ALLOWED_AFTER_APPROVAL" ? "APPROVED"
              : decision === "DENIED_BY_HUMAN" ? "DENIED" : decision === "DENIED_EXPIRED" ? "EXPIRED" : decision;
  return <span className={`dec dec-${label.toLowerCase()}`} title={reason ?? ""}>{label}</span>;
}

function RiskBar({
  risk,
  selected,
  onClose
}: {
  risk: number;
  selected?: string | null;
  onClose?: () => void;
}) {
  return (
    <div className="riskbar" title={`risk ${risk}`}>
      <div className="riskfill" style={{ width: `${Math.min(100, risk)}%` }} />
      {selected && onClose && <AlertPanel id={selected} onClose={onClose} />}
    </div>
  );
}

// Small chips showing which detection lenses fired on an event.
const LENS_LABEL: Record<string, string> = {
  role: "role", provenance: "taint", decoy: "decoy", baseline: "habit", drift: "drift",
};
function LensChips({ lens }: { lens: Record<string, any> }) {
  const fired = Object.keys(LENS_LABEL).filter((k) => lens?.[k]?.score > 0);
  return (
    <>
      {fired.map((k) => (
        <span className={`chip chip-${k}`} key={k} title={lens[k].reason}>
          {LENS_LABEL[k]} {lens[k].score.toFixed(2)}
        </span>
      ))}
    </>
  );
}

export default function App() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [mode, setMode] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [events, setEvents] = useState<WardenEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [decoys, setDecoys] = useState<Decoy[]>([]);
  const [outbox, setOutbox] = useState<Outbox>({ messages: 0, bytes: 0 });
  const wsRef = useRef<WebSocket | null>(null);

  // Initial load + light polling for the fleet table (stats change with every event).
  useEffect(() => {
    const load = async () => {
      try {
        const h = await get<{ mode: string }>("/health");
        setOnline(true);
        setMode(h.mode);
        setAgents(await get<Agent[]>("/agents"));
        setDecoys(await get<Decoy[]>("/decoys"));
        setOutbox(await get<Outbox>("/sim/outbox"));
        setApprovals(await get<Approval[]>("/approvals?status=pending"));
      } catch {
        setOnline(false);
      }
    };
    load();
    get<WardenEvent[]>("/events?limit=50").then(setEvents).catch(() => {});
    get<Alert[]>("/alerts?limit=30").then(setAlerts).catch(() => {});
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, []);

  // Live stream.
  useEffect(() => {
    let closed = false;
    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => setLive(true);
      ws.onclose = () => {
        setLive(false);
        if (!closed) setTimeout(connect, 1500);
      };
      ws.onmessage = (m) => {
        const msg = JSON.parse(m.data);
        if (msg.type === "event") setEvents((e) => [msg.data as WardenEvent, ...e].slice(0, 100));
        if (msg.type === "alert") setAlerts((a) => [msg.data as Alert, ...a].slice(0, 50));
      };
    };
    connect();
    return () => {
      closed = true;
      wsRef.current?.close();
    };
  }, []);

  const decide = async (id: string, action: "approve_once" | "deny") => {
    await post(`/approvals/${id}/resolve`, { action, by: "dashboard" }).catch(() => {});
    setApprovals((a) => a.filter((x) => x.id !== id));
  };
  const restore = async (agentId: string, resume: boolean) => {
    await post(`/agents/${agentId}/${resume ? "resume" : "restore"}`).catch(() => {});
  };

  return (
    <div className="app">
      <header>
        <h1>AGENT WARDEN</h1>
        <span className="tag">Valid credentials. Invalid behavior.</span>
        <span className="spacer" />
        <span className={`pill ${online ? "ok" : "bad"}`}>
          {online === null ? "connecting…" : online ? "Warden online" : "backend offline"}
        </span>
        {online && <span className="pill">{mode} mode</span>}
        <span className={`pill ${live ? "ok" : "bad"}`}>{live ? "live" : "stream off"}</span>
      </header>

      {approvals.length > 0 && (
        <section>
          <h2>Waiting for a human <span className="muted">({approvals.length})</span></h2>
          <ul className="list">
            {approvals.map((a) => (
              <li key={a.id}>
                <b>{a.agent_id}</b> wants to run <code>{a.request.tool}</code>{" "}
                <span className="muted">{JSON.stringify(a.request.args)}</span>
                <div className="actions">
                  <button className="btn ok" onClick={() => decide(a.id, "approve_once")}>approve once</button>
                  <button className="btn bad" onClick={() => decide(a.id, "deny")}>deny</button>
                  <button className="btn" onClick={() => setSelected(null)}>{a.id}</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="tiles">
        <div className={`tile ${outbox.bytes > 0 ? "tile-bad" : ""}`}>
          <span className="tile-n">{outbox.bytes}</span>
          <span className="muted">bytes left the organisation (simulated outbox)</span>
        </div>
        <div className={`tile ${decoys.some((d) => d.hits > 0) ? "tile-bad" : ""}`}>
          <span className="tile-n">{decoys.reduce((n, d) => n + d.hits, 0)}</span>
          <span className="muted">decoy tripwire hits ({decoys.length} planted)</span>
        </div>
      </div>

      <section>
        <h2>Fleet</h2>
        {agents.length === 0 ? (
          <p className="muted">No agents yet. Run <code>make sim</code> to start simulated traffic.</p>
        ) : (
          <div className="cards">
            {agents.map((a) => (
              <div className="card" key={a.agent_id}>
                <div className="card-top">
                  <strong>{a.agent_id}</strong>
                  <span className="muted">{a.role} v{a.role_version}</span>
                </div>
                {a.status !== "normal" && (
                  <div className="posture">
                    <span className={`dec dec-${a.status}`}>{a.status.toUpperCase()}</span>
                    <button className="btn" onClick={() => restore(a.agent_id, false)}>restore</button>
                    <button className="btn" onClick={() => restore(a.agent_id, true)}>resume without tainted input</button>
                  </div>
                )}
                <RiskBar risk={a.last_risk} selected={selected} onClose={() => setSelected(null)} />
                <div className="card-stats">
                  <span>last risk <b>{a.last_risk}</b></span>
                  <span>peak <b>{a.max_risk}</b></span>
                  <span>{a.event_count} actions</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="two-col">
        <section>
          <h2>Alerts <span className="muted">({alerts.length})</span></h2>
          {alerts.length === 0 && <p className="muted">No alerts. Normal behaviour raises none.</p>}
          <ul className="list">
            {alerts.map((a) => (
              <li key={a.id} className="clickable" onClick={() => setSelected(a.id)}>
                <span className={bandClass(a.band)}>{a.band}</span>
                <b>{a.risk}</b> · {a.agent_id} · <DecisionChip decision={a.decision} /> <span className="muted">recommended: {a.shadow_action}</span>
                <div className="reason">{a.message ?? a.reasons?.[0]}</div>
                {a.reasons?.slice(1).map((r, i) => (
                  <div className="reason" key={i}>↳ {r}</div>
                ))}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Live events</h2>
          <ul className="list mono">
            {events.map((e) => (
              <li key={e.id}>
                <span className={bandClass(e.band)}>{e.band}</span>
                <span className="num">{e.risk.toFixed(0).padStart(3, " ")}</span> {e.agent_id} · {e.tool}
                <span className="muted"> {e.resource ?? e.destination ?? ""}</span> <DecisionChip decision={e.decision} reason={e.block_reason} /> <LensChips lens={e.lens} />
              </li>
            ))}
          </ul>
        </section>
      </div>
      {selected && <AlertPanel id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
