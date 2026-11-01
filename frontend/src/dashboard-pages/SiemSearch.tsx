"use client";

import React, { useState, useCallback } from "react";
import { fetchEvents } from "../api";
import { NormalizedEvent } from "../types";
import { Search, Filter, X, Clock, Terminal, RefreshCw } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  auth: "#3b82f6", command: "#22c55e", connect: "#8b5cf6", download: "#f97316",
  upload: "#ec4899", scan: "#eab308", web_request: "#06b6d4", firewall: "#64748b",
};
const OUTCOME_COLORS: Record<string, string> = { success: "#22c55e", failure: "#f43f5e", allow: "#3b82f6", drop: "#f97316", unknown: "#64748b" };

const SAVED_QUERIES = [
  { label: "All SSH Auth Failures", params: { action: "auth" } },
  { label: "Command Execution Events", params: { action: "command" } },
  { label: "Deception Zone Events", params: { zone: "deception" } },
  { label: "Production Zone Activity", params: { zone: "production" } },
  { label: "Cowrie Honeypot Events", params: { sensor: "cowrie" } },
];

export default function SiemSearch() {
  const [results, setResults] = useState<NormalizedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [q, setQ] = useState({ ip: "", sensor: "", action: "", zone: "", limit: "200" });

  const search = useCallback(async (overrides?: Partial<typeof q>) => {
    const params = { ...q, ...overrides };
    setLoading(true);
    try {
      const res = await fetchEvents(Number(params.limit) || 200, {
        source_ip: params.ip || undefined,
        sensor: params.sensor || undefined,
        action: params.action || undefined,
        zone: params.zone || undefined,
      });
      setResults(res);
      setSearched(true);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [q]);

  const clear = () => { setQ({ ip: "", sensor: "", action: "", zone: "", limit: "200" }); setResults([]); setSearched(false); };

  const hasFilters = q.ip || q.sensor || q.action || q.zone;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 4 }}>Security Information</div>
        <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em" }}>SIEM Search</h1>
        <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", color: "var(--color-mute)" }}>Query the normalized event store across all deception sensors</p>
      </div>

      {/* Query builder */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-mute)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.85rem" }}>Query Builder</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
          {[
            { label: "Source IP",   key: "ip",     ph: "e.g. 203.0.113.45" },
            { label: "Sensor",      key: "sensor", ph: "cowrie, portal…" },
            { label: "Action",      key: "action", ph: "auth, command…" },
            { label: "Zone",        key: "zone",   ph: "deception / production" },
          ].map(({ label, key, ph }) => (
            <div key={key}>
              <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-mute)", marginBottom: 5 }}>{label}</label>
              <input
                className="input"
                placeholder={ph}
                value={(q as any)[key]}
                onChange={(e) => setQ((p) => ({ ...p, [key]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && search()}
              />
            </div>
          ))}
          <div>
            <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-mute)", marginBottom: 5 }}>Max Results</label>
            <select className="select-input" value={q.limit} onChange={(e) => setQ((p) => ({ ...p, limit: e.target.value }))}>
              {["50","100","200","500","1000","2000"].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => search()} disabled={loading} style={{ gap: 6 }}>
            <Search size={13} /> {loading ? "Searching…" : "Run Query"}
          </button>
          {(hasFilters || searched) && (
            <button className="btn btn-ghost" onClick={clear} style={{ gap: 6 }}>
              <X size={13} /> Clear
            </button>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SAVED_QUERIES.map((sq) => (
              <button key={sq.label} className="btn btn-ghost btn-sm"
                onClick={() => { setQ((p) => ({ ...p, ...sq.params })); search(sq.params); }}>
                {sq.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 12, color: "var(--color-mute)" }}>
          <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} />
          Querying event store…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : searched ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--color-mute)" }}>
              Found <strong style={{ color: "var(--color-ink)" }}>{results.length.toLocaleString()}</strong> events
            </span>
            {results.length > 0 && (
              <span style={{ fontSize: "0.68rem", color: "var(--color-mute)", fontFamily: "var(--font-mono)" }}>
                {results[results.length - 1]?.ts?.slice(0, 10)} → {results[0]?.ts?.slice(0, 10)}
              </span>
            )}
          </div>

          <div className="data-table-wrap" style={{ maxHeight: "calc(100vh - 460px)", overflowY: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Source</th>
                  <th>Action</th>
                  <th>Source IP</th>
                  <th>Sensor</th>
                  <th>Zone</th>
                  <th>Outcome</th>
                  <th>User / Command</th>
                  <th>Stage</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--color-mute)", padding: "2.5rem" }}>No events match your query</td></tr>
                ) : results.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--color-mute)", whiteSpace: "nowrap" }}>
                      {e.ts?.slice(0, 19).replace("T", " ")}
                    </td>
                    <td style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--color-ink)" }}>{e.source}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "1px 7px", borderRadius: 999, fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", background: `${ACTION_COLORS[e.action] ?? "#64748b"}18`, color: ACTION_COLORS[e.action] ?? "#64748b", border: `1px solid ${ACTION_COLORS[e.action] ?? "#64748b"}40` }}>{e.action}</span>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "#93c5fd" }}>{e.src_ip}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--color-mute)" }}>{e.sensor}</td>
                    <td>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", color: e.zone === "deception" ? "#8b5cf6" : "#22c55e" }}>{e.zone}</span>
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "1px 7px", borderRadius: 999, fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", background: `${OUTCOME_COLORS[e.outcome] ?? "#64748b"}18`, color: OUTCOME_COLORS[e.outcome] ?? "#64748b", border: `1px solid ${OUTCOME_COLORS[e.outcome] ?? "#64748b"}40` }}>{e.outcome}</span>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "#a5b4fc", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.cmd ? `$ ${e.cmd}` : e.user ?? "—"}
                    </td>
                    <td style={{ fontSize: "0.7rem", color: "var(--color-mute)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{e.stage ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="empty-state" style={{ minHeight: 250 }}>
          <Search size={32} />
          <p>Enter query parameters above and click "Run Query" to search the event store</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
            {SAVED_QUERIES.slice(0, 3).map((sq) => (
              <button key={sq.label} className="btn btn-ghost btn-sm" onClick={() => { setQ((p) => ({ ...p, ...sq.params })); search(sq.params); }}>
                {sq.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
