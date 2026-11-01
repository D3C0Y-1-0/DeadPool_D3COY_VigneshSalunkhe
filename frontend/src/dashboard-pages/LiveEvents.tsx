"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLive } from "../useLive";
import { NormalizedEvent } from "../types";
import { Activity, Filter, Pause, Play, Radio, RefreshCw, Search, X } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  auth:        "#3b82f6",
  command:     "#22c55e",
  connect:     "#8b5cf6",
  download:    "#f97316",
  upload:      "#ec4899",
  scan:        "#eab308",
  web_request: "#06b6d4",
  firewall:    "#64748b",
  fingerprint: "#94a3b8",
};

const OUTCOME_COLORS: Record<string, string> = {
  success: "#22c55e",
  failure: "#f43f5e",
  allow:   "#3b82f6",
  drop:    "#f97316",
  unknown: "#64748b",
};

const SOURCE_LABELS: Record<string, string> = {
  cowrie:     "Cowrie SSH",
  portal:     "Web Portal",
  opencanary: "OpenCanary",
  tripwire:   "Tripwire",
  prod:       "Prod Shield",
};

function timeStr(iso: string) {
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
  catch { return iso; }
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "1px 7px",
      borderRadius: 999, fontSize: "0.62rem", fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase",
      background: `${color}18`, color, border: `1px solid ${color}40`,
    }}>{label}</span>
  );
}

export default function LiveEvents() {
  const { events, connected } = useLive();
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSensor, setFilterSensor] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterZone, setFilterZone] = useState("all");
  const [frozen, setFrozen] = useState<NormalizedEvent[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);

  // freeze on pause
  useEffect(() => {
    if (!paused) setFrozen([]);
    else setFrozen(events);
  }, [paused]);

  const display = paused ? frozen : events;

  const sensors = useMemo(() => ["all", ...Array.from(new Set(events.map((e) => e.source)))], [events]);
  const actions = useMemo(() => ["all", ...Array.from(new Set(events.map((e) => e.action)))], [events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return display.filter((e) => {
      if (filterSensor !== "all" && e.source !== filterSensor) return false;
      if (filterAction !== "all" && e.action !== filterAction) return false;
      if (filterZone !== "all" && e.zone !== filterZone) return false;
      if (!q) return true;
      return [e.src_ip, e.sensor, e.action, e.user ?? "", e.cmd ?? ""]
        .some((v) => v.toLowerCase().includes(q));
    });
  }, [display, search, filterSensor, filterAction, filterZone]);

  // Count by sensor
  const sensorCounts = useMemo(() => {
    const c: Record<string, number> = {};
    events.forEach((e) => { c[e.source] = (c[e.source] ?? 0) + 1; });
    return c;
  }, [events]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 4 }}>Live Telemetry</div>
          <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-ink)" }}>Live Events</h1>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", color: "var(--color-mute)" }}>Real-time stream of all honeypot sensor activity</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.4rem 0.85rem", borderRadius: 999, border: `1px solid ${connected ? "rgba(34,197,94,0.3)" : "rgba(244,63,94,0.3)"}`, background: connected ? "rgba(34,197,94,0.06)" : "rgba(244,63,94,0.06)", fontSize: "0.7rem", fontWeight: 700 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: connected ? "#22c55e" : "#f43f5e", animation: connected ? "dot-pulse 2s infinite" : undefined }} />
            <span style={{ color: connected ? "#86efac" : "#fca5a5" }}>{connected ? "Live Feed Active" : "Disconnected"}</span>
          </div>
          <button
            onClick={() => setPaused(!paused)}
            className={`btn btn-sm ${paused ? "btn-primary" : "btn-ghost"}`}
            style={{ gap: 6 }}
          >
            {paused ? <Play size={13} /> : <Pause size={13} />}
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      {/* Sensor KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "0.7rem" }}>
        {Object.entries(SOURCE_LABELS).map(([key, name]) => (
          <div key={key} className="card" style={{ padding: "0.85rem 1rem", cursor: "pointer", borderColor: filterSensor === key ? "rgba(59,130,246,0.5)" : undefined }}
            onClick={() => setFilterSensor(filterSensor === key ? "all" : key)}>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-mute)", marginBottom: 4 }}>{name}</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--color-ink)" }}>{(sensorCounts[key] ?? 0).toLocaleString()}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: "0.65rem", color: "#22c55e", fontWeight: 600 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} /> Active
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", padding: "0.85rem 1rem", background: "var(--color-panel-card)", border: "1px solid var(--color-line)", borderRadius: 12 }}>
        <div className="input-icon-wrap" style={{ flex: "1 1 200px" }}>
          <Search size={14} className="icon" />
          <input
            className="input"
            style={{ paddingLeft: "2.25rem" }}
            placeholder="Search IP, sensor, command…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="select-input" value={filterSensor} onChange={(e) => setFilterSensor(e.target.value)} style={{ flex: "0 1 160px" }}>
          <option value="all">All Sources</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="select-input" value={filterAction} onChange={(e) => setFilterAction(e.target.value)} style={{ flex: "0 1 160px" }}>
          <option value="all">All Actions</option>
          {actions.filter((a) => a !== "all").map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="select-input" value={filterZone} onChange={(e) => setFilterZone(e.target.value)} style={{ flex: "0 1 140px" }}>
          <option value="all">All Zones</option>
          <option value="deception">Deception</option>
          <option value="production">Production</option>
        </select>
        {(search || filterSensor !== "all" || filterAction !== "all" || filterZone !== "all") && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setFilterSensor("all"); setFilterAction("all"); setFilterZone("all"); }}>
            <X size={12} /> Clear
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--color-mute)", fontFamily: "var(--font-mono)" }}>
          {filtered.length.toLocaleString()} events
        </span>
      </div>

      {/* Event table */}
      <div className="data-table-wrap" ref={tableRef} style={{ maxHeight: "calc(100vh - 420px)", overflowY: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Time</th>
              <th>Source</th>
              <th>Action</th>
              <th>Source IP</th>
              <th>Sensor</th>
              <th>Zone</th>
              <th>Outcome</th>
              <th>User / Command</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9}>
                <div className="empty-state">
                  <Activity size={28} />
                  <p>{connected ? "Waiting for events — trigger a demo to start." : "No events. Connect backend and trigger a scenario."}</p>
                </div>
              </td></tr>
            ) : filtered.map((e) => (
              <tr key={e.id} style={{ borderLeft: `2px solid ${ACTION_COLORS[e.action] ?? "#64748b"}` }}>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--color-mute)", whiteSpace: "nowrap" }}>{timeStr(e.ts)}</td>
                <td>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--color-ink)" }}>{SOURCE_LABELS[e.source] ?? e.source}</span>
                </td>
                <td><Pill label={e.action} color={ACTION_COLORS[e.action] ?? "#64748b"} /></td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "#93c5fd" }}>{e.src_ip}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--color-mute)" }}>{e.sensor}</td>
                <td>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: e.zone === "deception" ? "#8b5cf6" : "#22c55e" }}>
                    {e.zone}
                  </span>
                </td>
                <td><Pill label={e.outcome} color={OUTCOME_COLORS[e.outcome] ?? "#64748b"} /></td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "#a5b4fc", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.cmd ? `$ ${e.cmd}` : e.user ? `${e.user}${e.password ? `:${e.password}` : ""}` : "—"}
                </td>
                <td style={{ fontSize: "0.65rem" }}>
                  {(e.flags ?? []).slice(0, 2).map((f) => (
                    <span key={f} style={{ display: "inline-block", marginRight: 3, padding: "1px 5px", borderRadius: 4, background: "rgba(234,179,8,0.1)", color: "#eab308", border: "1px solid rgba(234,179,8,0.2)", fontSize: "0.6rem", fontWeight: 700 }}>{f}</span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
