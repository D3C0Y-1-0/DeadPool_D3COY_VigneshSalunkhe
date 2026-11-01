"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useLive } from "../useLive";
import { updateIncidentStatus } from "../api";
import { IncidentSummary } from "../types";
import SeverityBadge from "../components/SeverityBadge";
import IncidentAttackGraph from "../components/IncidentAttackGraph";
import { ArrowRight, Crosshair, Globe, Plus, Search, X, Network, List } from "lucide-react";

function timeAgo(iso: string) {
  try {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return "Just now"; if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  } catch { return "—"; }
}

function incTitle(inc: IncidentSummary) {
  if (inc.real_asset_touched) return `Production pivot from ${inc.src_ip}`;
  if (inc.honeytoken_hit) return `Honeytoken exfiltration by ${inc.src_ip}`;
  if (inc.verdict === "targeted") return `Targeted brute-force from ${inc.src_ip}`;
  return `Automated recon probe from ${inc.src_ip}`;
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  open:           { label: "Open",          color: "#f43f5e" },
  investigating:  { label: "Investigating", color: "#eab308" },
  contained:      { label: "Contained",     color: "#22c55e" },
  resolved:       { label: "Resolved",      color: "#3b82f6" },
  false_positive: { label: "False +",       color: "#64748b" },
};

export default function IncidentsList() {
  const { incidents, refreshAll } = useLive();
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verdictFilter, setVerdictFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(true);

  const list = useMemo(() => Object.values(incidents) as IncidentSummary[], [incidents]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return list
      .filter((i) => {
        if (sevFilter !== "all" && i.severity !== sevFilter) return false;
        if (statusFilter !== "all" && i.status !== statusFilter) return false;
        if (verdictFilter !== "all" && i.verdict !== verdictFilter) return false;
        if (!q) return true;
        return [i.src_ip, i.country, i.asn, i.stage, i.id].some((v) => (v ?? "").toLowerCase().includes(q));
      })
      .sort((a, b) => b.score - a.score);
  }, [list, search, sevFilter, statusFilter, verdictFilter]);

  const stats = useMemo(() => ({
    total: list.length,
    open: list.filter((i) => (i.status as string) === "open").length,
    inProgress: list.filter((i) => (i.status as string) === "investigating").length,
    resolved: list.filter((i) => (i.status as string) === "contained" || (i.status as string) === "closed" || (i.status as string) === "resolved").length,
  }), [list]);

  const handleStatusChange = async (inc: IncidentSummary, newStatus: string) => {
    setUpdatingId(inc.id);
    try {
      await updateIncidentStatus(inc.id, newStatus as any);
      await refreshAll();
    } catch { /* silently continue */ }
    finally { setUpdatingId(null); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 4 }}>Incident Response</div>
          <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Security Incidents</h1>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", color: "var(--color-mute)" }}>Investigate, contain and respond to active threat actor attacks</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGraph(!showGraph)}
            className={`btn btn-sm ${showGraph ? "btn-primary" : "btn-ghost"}`}
            style={{ gap: 6 }}
          >
            <Network size={13} /> {showGraph ? "Attack Graph Visible" : "Show Attack Graph"}
          </button>
          <Link href="/dashboard/demo" className="btn btn-ghost btn-sm" style={{ gap: 6 }}>
            <Plus size={14} /> Simulate Incident
          </Link>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: "0.75rem" }}>
        {[
          { label: "Total Incidents", val: stats.total, color: "var(--color-ink)" },
          { label: "Open", val: stats.open, color: "#f43f5e" },
          { label: "Investigating", val: stats.inProgress, color: "#eab308" },
          { label: "Resolved", val: stats.resolved, color: "#22c55e" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: "0.85rem 1rem" }}>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-mute)", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: "1.65rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Interactive Attack Graph */}
      {showGraph && (
        <IncidentAttackGraph allIncidents={list} height={420} />
      )}

      {/* Filter bar */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", padding: "0.85rem 1rem", background: "var(--color-panel-card)", border: "1px solid var(--color-line)", borderRadius: 12 }}>
        <div className="input-icon-wrap" style={{ flex: "1 1 220px" }}>
          <Search size={13} className="icon" />
          <input className="input" style={{ paddingLeft: "2.25rem" }} placeholder="Search IP, country, stage…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select-input" value={sevFilter} onChange={(e) => setSevFilter(e.target.value)} style={{ flex: "0 1 140px" }}>
          <option value="all">All Severities</option>
          {["critical","high","medium","low"].map((s) => <option key={s} value={s} style={{ textTransform: "capitalize" }}>{s}</option>)}
        </select>
        <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ flex: "0 1 140px" }}>
          <option value="all">All Statuses</option>
          {["open","investigating","contained","resolved","false_positive"].map((s) => <option key={s} value={s}>{STATUS_CFG[s]?.label ?? s}</option>)}
        </select>
        <select className="select-input" value={verdictFilter} onChange={(e) => setVerdictFilter(e.target.value)} style={{ flex: "0 1 160px" }}>
          <option value="all">All Verdicts</option>
          <option value="targeted">Targeted</option>
          <option value="opportunistic">Opportunistic</option>
        </select>
        {(search || sevFilter !== "all" || statusFilter !== "all" || verdictFilter !== "all") && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setSevFilter("all"); setStatusFilter("all"); setVerdictFilter("all"); }}>
            <X size={12} /> Clear
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--color-mute)", fontFamily: "var(--font-mono)" }}>{filtered.length} incidents</span>
      </div>

      {/* Table */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Incident</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Score</th>
              <th>Origin</th>
              <th>Stage</th>
              <th>Flags</th>
              <th>Last Seen</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10}>
                <div className="empty-state"><Crosshair size={24} /><p>No incidents match your filters</p></div>
              </td></tr>
            ) : filtered.map((inc, idx) => {
              const scfg = STATUS_CFG[inc.status] ?? STATUS_CFG.open;
              return (
                <tr key={inc.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.72rem", color: "var(--color-accent)" }}>
                    <Link href={`/dashboard/incidents/${encodeURIComponent(inc.id)}`}>#{`INC-${String(idx + 1).padStart(3, "0")}`}</Link>
                  </td>
                  <td>
                    <Link href={`/dashboard/incidents/${encodeURIComponent(inc.id)}`}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-ink)" }}>{incTitle(inc)}</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--color-mute)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{inc.src_ip} · {inc.country}</div>
                    </Link>
                  </td>
                  <td><SeverityBadge severity={inc.severity} score={inc.score} pulse={inc.status === "open"} /></td>
                  <td>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: `${scfg.color}15`, color: scfg.color, border: `1px solid ${scfg.color}35` }}>{scfg.label}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden", width: 40 }}>
                        <div style={{ height: "100%", background: inc.severity === "critical" ? "#f43f5e" : inc.severity === "high" ? "#f97316" : inc.severity === "medium" ? "#eab308" : "#22c55e", width: `${inc.score}%`, borderRadius: 99 }} />
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", fontWeight: 700 }}>{inc.score}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--color-mute)" }}>
                    <div>{inc.country}</div>
                    <div style={{ fontSize: "0.62rem", color: "rgba(100,116,139,0.7)" }}>{inc.asn?.slice(0, 18)}</div>
                  </td>
                  <td style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-mute)" }}>{inc.stage.replace(/_/g, " ")}</td>
                  <td style={{ fontSize: "0.65rem" }}>
                    {inc.honeytoken_hit && <span style={{ display: "inline-block", marginRight: 3, padding: "1px 5px", borderRadius: 4, background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)", fontWeight: 700 }}>Token</span>}
                    {inc.real_asset_touched && <span style={{ display: "inline-block", padding: "1px 5px", borderRadius: 4, background: "rgba(244,63,94,0.12)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.25)", fontWeight: 700 }}>Prod</span>}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--color-mute)" }}>{timeAgo(inc.last_seen)}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                      {inc.status === "open" && (
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={updatingId === inc.id}
                          onClick={() => handleStatusChange(inc, "investigating")}
                          style={{ fontSize: "0.65rem", padding: "0.25rem 0.55rem" }}
                        >Investigate</button>
                      )}
                      <Link href={`/dashboard/incidents/${encodeURIComponent(inc.id)}`} className="btn btn-ghost btn-sm" style={{ gap: 4, fontSize: "0.65rem", padding: "0.25rem 0.55rem" }}>
                        Details <ArrowRight size={11} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
