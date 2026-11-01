"use client";

import React, { useEffect, useState } from "react";
import { fetchAllActions, approveAction, rejectAction, ActionRow } from "../api";
import { CheckCircle, RefreshCw, Shield, ShieldAlert, X, Zap, AlertCircle, Lock, Download, Search, Info } from "lucide-react";
import Link from "next/link";

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  block_source:       { label: "Block Source IP",     icon: <ShieldAlert size={14} />, color: "#f43f5e" },
  isolate_host:       { label: "Isolate Host",        icon: <Lock size={14} />,        color: "#f97316" },
  rotate_credentials: { label: "Rotate Credentials",  icon: <RefreshCw size={14} />,   color: "#eab308" },
  hunt:               { label: "Threat Hunt",         icon: <Search size={14} />,      color: "#3b82f6" },
  export_iocs:        { label: "Export IOCs",         icon: <Download size={14} />,    color: "#22c55e" },
  monitor:            { label: "Monitor",             icon: <Info size={14} />,        color: "#64748b" },
};

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  recommended: { label: "Recommended", color: "#3b82f6" },
  dry_run:     { label: "Dry Run",     color: "#eab308" },
  approved:    { label: "Approved",    color: "#22c55e" },
  executed:    { label: "Executed",    color: "#22c55e" },
  rejected:    { label: "Rejected",    color: "#f43f5e" },
};

export default function ResponseCenter() {
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState("all");

  const load = () => {
    setLoading(true);
    fetchAllActions()
      .then(setActions)
      .catch(() => setActions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handle = async (id: string, fn: (id: string) => Promise<ActionRow>) => {
    setBusy((p) => ({ ...p, [id]: true }));
    try { await fn(id); load(); } catch { /* ignore */ }
    finally { setBusy((p) => ({ ...p, [id]: false })); }
  };

  const filtered = statusFilter === "all" ? actions : actions.filter((a) => a.status === statusFilter);

  const counts = {
    pending: actions.filter((a) => a.status === "recommended").length,
    approved: actions.filter((a) => a.status === "approved" || a.status === "executed").length,
    rejected: actions.filter((a) => a.status === "rejected").length,
    total: actions.length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 4 }}>Automated Response</div>
          <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Response Center</h1>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", color: "var(--color-mute)" }}>Review, approve or reject AI-recommended containment actions</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} style={{ gap: 6 }}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem" }}>
        {[
          { label: "Total Actions", val: counts.total, color: "var(--color-ink)" },
          { label: "Pending Review", val: counts.pending, color: "#3b82f6" },
          { label: "Approved / Executed", val: counts.approved, color: "#22c55e" },
          { label: "Rejected", val: counts.rejected, color: "#f43f5e" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: "0.85rem 1rem" }}>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-mute)", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: "1.65rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Notice */}
      <div className="notice notice-warning">
        <AlertCircle size={14} style={{ flexShrink: 0 }} />
        Production-affecting actions (block, isolate, rotate) require explicit approval. Dry-run first to preview changes.
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 6 }}>
        <div className="tab-bar">
          {["all","recommended","approved","executed","rejected"].map((s) => (
            <button key={s} className={`tab-btn ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)} style={{ textTransform: "capitalize" }}>
              {s}
              {s === "recommended" && counts.pending > 0 && (
                <span style={{ marginLeft: 4, padding: "1px 5px", borderRadius: 999, background: "#3b82f6", color: "#fff", fontSize: "0.58rem", fontWeight: 800 }}>{counts.pending}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Actions list */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 12, color: "var(--color-mute)" }}>
          <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} />
          Loading actions…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Zap size={28} />
          <p>No {statusFilter !== "all" ? statusFilter : ""} actions found. Trigger a demo scenario to generate recommendations.</p>
        </div>
      ) : filtered.map((act) => {
        const meta = TYPE_META[act.type] ?? { label: act.type, icon: <Zap size={14} />, color: "#64748b" };
        const scfg = STATUS_CFG[act.status] ?? STATUS_CFG.recommended;
        const isPending = act.status === "recommended" || act.status === "dry_run";
        const isDone = act.status === "approved" || act.status === "executed";
        const isRejected = act.status === "rejected";
        return (
          <div key={act.id} className="card" style={{ borderColor: `${meta.color}30`, padding: "1.1rem 1.25rem", opacity: isRejected ? 0.6 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${meta.color}12`, border: `1px solid ${meta.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: meta.color, flexShrink: 0 }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-ink)" }}>{meta.label}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "#93c5fd" }}>
                      {act.incident_id ? <Link href={`/dashboard/incidents/${encodeURIComponent(act.incident_id)}`} style={{ color: "#93c5fd" }}>{act.incident_id}</Link> : "—"}
                    </span>
                    <span style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", padding: "1px 6px", borderRadius: 999, background: `${scfg.color}15`, color: scfg.color, border: `1px solid ${scfg.color}30` }}>{scfg.label}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: "0.72rem", color: "var(--color-mute)", fontFamily: "var(--font-mono)" }}>
                    {Object.entries(act.params ?? {}).slice(0, 3).map(([k, v]) => (
                      <span key={k}><span style={{ color: "rgba(100,116,139,0.7)" }}>{k}:</span> {String(v)}</span>
                    ))}
                  </div>
                  {act.result && (
                    <div style={{ marginTop: 6, padding: "0.4rem 0.65rem", background: isDone ? "rgba(34,197,94,0.06)" : "rgba(234,179,8,0.06)", border: `1px solid ${isDone ? "rgba(34,197,94,0.2)" : "rgba(234,179,8,0.2)"}`, borderRadius: 8, fontSize: "0.72rem", color: isDone ? "#86efac" : "#fde68a", fontFamily: "var(--font-mono)" }}>
                      {act.result}
                    </div>
                  )}
                  <div style={{ marginTop: 4, fontSize: "0.65rem", color: "rgba(100,116,139,0.6)", fontFamily: "var(--font-mono)" }}>
                    Created: {new Date(act.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {isDone && <CheckCircle size={18} style={{ color: "#22c55e" }} />}
                {isRejected && <X size={18} style={{ color: "#f43f5e" }} />}
                {isPending && (
                  <>
                    <button className="btn btn-success btn-sm" disabled={busy[act.id]} onClick={() => handle(act.id, approveAction)}>
                      {busy[act.id] ? "…" : <><CheckCircle size={12} /> Approve</>}
                    </button>
                    <button className="btn btn-danger btn-sm" disabled={busy[act.id]} onClick={() => handle(act.id, rejectAction)}>
                      <X size={12} /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
