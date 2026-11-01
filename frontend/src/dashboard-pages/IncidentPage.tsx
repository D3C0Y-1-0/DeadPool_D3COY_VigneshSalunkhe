"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchIncident, executeAction, updateIncidentStatus, exportStixUrl, exportCsvUrl } from "../api";
import { Incident, ActionItem, TimelineItem } from "../types";
import SeverityBadge from "../components/SeverityBadge";
import IncidentAttackGraph from "../components/IncidentAttackGraph";
import AttackTimeline from "../components/AttackTimeline";
import { downloadIncidentPdf } from "../utils/pdfReports";
import {
  ArrowLeft, CheckCircle, Crosshair, Download, FileText,
  Flame, Globe, RefreshCw, Shield, ShieldAlert, Terminal, Zap,
  AlertTriangle, ChevronRight, Info, Lock, CheckSquare, Square
} from "lucide-react";

interface Props { id: string; }

const SEV_COLOR: Record<string, string> = {
  critical: "#f43f5e", high: "#f97316", medium: "#eab308", low: "#22c55e",
};

const STAGE_ORDER = ["recon","credential_attack","initial_access","execution","discovery","collection","exfiltration","persistence","lateral_movement","impact"];
const STAGE_LABELS: Record<string, string> = {
  recon: "Recon", credential_attack: "Cred Attack", initial_access: "Initial Access",
  execution: "Execution", discovery: "Discovery", collection: "Collection",
  exfiltration: "Exfiltration", persistence: "Persistence",
  lateral_movement: "Lateral Move", impact: "Impact",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  block_source:        <ShieldAlert size={14} />,
  isolate_host:        <Lock size={14} />,
  rotate_credentials:  <RefreshCw size={14} />,
  hunt:                <Crosshair size={14} />,
  export_iocs:         <Download size={14} />,
  monitor:             <Info size={14} />,
};

const ACTION_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  block_source:       { bg: "rgba(244,63,94,0.08)",  color: "#f43f5e", border: "rgba(244,63,94,0.25)"  },
  isolate_host:       { bg: "rgba(249,115,22,0.08)", color: "#f97316", border: "rgba(249,115,22,0.25)" },
  rotate_credentials: { bg: "rgba(234,179,8,0.08)",  color: "#eab308", border: "rgba(234,179,8,0.25)"  },
  hunt:               { bg: "rgba(59,130,246,0.08)", color: "#3b82f6", border: "rgba(59,130,246,0.25)" },
  export_iocs:        { bg: "rgba(34,197,94,0.08)",  color: "#22c55e", border: "rgba(34,197,94,0.25)"  },
  monitor:            { bg: "rgba(100,116,139,0.08)",color: "#64748b", border: "rgba(100,116,139,0.25)"},
};

export default function IncidentPage({ id }: Props) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview"|"timeline"|"commands"|"techniques"|"actions">("overview");
  const [executing, setExecuting] = useState<Record<string, boolean>>({});
  const [actionResults, setActionResults] = useState<Record<string, string>>({});
  const [pdfReportMessage, setPdfReportMessage] = useState<string | null>(null);
  const [pdfReportError, setPdfReportError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const inc = await fetchIncident(id);
      setIncident(inc);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Failed to load incident");
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (act: ActionItem, mode: "approve" | "dry_run") => {
    if (!incident) return;
    setExecuting((p) => ({ ...p, [act.id]: true }));
    try {
      const updated = await executeAction(incident.id, act.id, mode);
      setActionResults((p) => ({ ...p, [act.id]: updated.result ?? (mode === "dry_run" ? "Dry-run succeeded. No changes applied." : "Action executed successfully.") }));
      await load();
    } catch (e: any) {
      setActionResults((p) => ({ ...p, [act.id]: `Error: ${e.message}` }));
    } finally {
      setExecuting((p) => ({ ...p, [act.id]: false }));
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!incident) return;
    try { await updateIncidentStatus(incident.id, status as any); await load(); } catch { /* ignore */ }
  };

  const handleDownloadPdf = () => {
    if (!incident) return;
    setPdfReportMessage(null);
    setPdfReportError(false);
    try {
      downloadIncidentPdf(incident);
      setPdfReportMessage("Incident PDF report downloaded.");
    } catch (e) {
      setPdfReportError(true);
      setPdfReportMessage(e instanceof Error ? e.message : "Could not generate the incident report.");
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12, color: "var(--color-mute)" }}>
      <RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} />
      <span>Loading incident…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !incident) return (
    <div className="notice notice-danger" style={{ maxWidth: 500, margin: "2rem auto" }}>
      <AlertTriangle size={16} /> {error ?? "Incident not found."}{" "}
      <Link href="/dashboard/incidents" style={{ color: "var(--color-accent)", marginLeft: 4 }}>← Back to incidents</Link>
    </div>
  );

  const inc = incident;
  const color = SEV_COLOR[inc.severity] ?? "#64748b";
  const stageIdx = STAGE_ORDER.indexOf(inc.stage);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Back + export bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <Link href="/dashboard/incidents" className="btn btn-ghost btn-sm">
          <ArrowLeft size={13} /> Back to Incidents
        </Link>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleDownloadPdf} style={{ gap: 5 }}>
            <FileText size={13} /> Export PDF
          </button>
          <a href={exportCsvUrl(inc.id)} target="_blank" className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
            <FileText size={13} /> Export CSV
          </a>
          <a href={exportStixUrl(inc.id)} target="_blank" className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
            <Download size={13} /> Export STIX 2.1
          </a>
          <button className="btn btn-ghost btn-sm" onClick={load} style={{ gap: 5 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {pdfReportMessage && (
        <div className={`notice ${pdfReportError ? "notice-warning" : "notice-success"}`} role={pdfReportError ? "alert" : "status"} aria-live="polite">
          {pdfReportMessage}
        </div>
      )}

      {/* Hero card */}
      <div className="card" style={{ borderColor: `${color}40`, padding: "1.5rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: `${color}15`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
              <Crosshair size={26} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(59,130,246,0.1)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.2)" }}>{inc.id}</span>
                <SeverityBadge severity={inc.severity} score={inc.score} pulse={inc.status === "open"} />
                <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, background: inc.verdict === "targeted" ? "rgba(244,63,94,0.12)" : "rgba(100,116,139,0.1)", color: inc.verdict === "targeted" ? "#f43f5e" : "#94a3b8", border: `1px solid ${inc.verdict === "targeted" ? "rgba(244,63,94,0.3)" : "rgba(100,116,139,0.2)"}` }}>{inc.verdict}</span>
              </div>
              <h1 style={{ margin: 0, fontSize: "clamp(1.1rem,2vw,1.5rem)", fontWeight: 800, color: "var(--color-ink)" }}>
                {inc.real_asset_touched ? "Production Host Pivot" : inc.honeytoken_hit ? "Honeytoken Exfiltration Attack" : "Deception Fabric Intrusion"} from {inc.src_ip}
              </h1>
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.8rem", color: "var(--color-mute)", maxWidth: 700 }}>{inc.narrative}</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <select
              className="select-input"
              value={inc.status}
              onChange={(e) => handleStatusUpdate(e.target.value)}
              style={{ width: 180, fontSize: "0.75rem" }}
            >
              <option value="open">🔴 Open</option>
              <option value="investigating">🟡 Investigating</option>
              <option value="contained">🟢 Contained</option>
              <option value="resolved">🔵 Resolved</option>
              <option value="false_positive">⚪ False Positive</option>
            </select>
            <div style={{ display: "flex", gap: 5 }}>
              {inc.honeytoken_hit && <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)" }}>Honeytoken</span>}
              {inc.real_asset_touched && <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(244,63,94,0.12)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.25)" }}>Prod Touched</span>}
            </div>
          </div>
        </div>

        {/* Stat row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "0.75rem", marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--color-line)" }}>
          {[
            { label: "Source IP",     val: inc.src_ip, mono: true },
            { label: "Country / ASN", val: `${inc.country} · ${inc.asn}` },
            { label: "First Seen",    val: inc.first_seen ? new Date(inc.first_seen).toLocaleString() : "—", mono: true },
            { label: "Duration",      val: inc.duration_s ? `${Math.round(inc.duration_s / 60)}m ${inc.duration_s % 60}s` : "—" },
            { label: "Events",        val: (inc.timeline?.length ?? 0).toString(), mono: true },
            { label: "Techniques",    val: (inc.techniques?.length ?? 0).toString(), mono: true },
          ].map((d) => (
            <div key={d.label}>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-mute)", marginBottom: 3 }}>{d.label}</div>
              <div style={{ fontSize: "0.78rem", fontFamily: d.mono ? "var(--font-mono)" : undefined, color: "var(--color-ink)", wordBreak: "break-all" }}>{d.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Incident Attack Graph (Flow Graph instead of linear chain) */}
      <IncidentAttackGraph incident={inc} height={460} />

      {/* Risk score */}
      <div className="card" style={{ padding: "1rem 1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <div className="card-title"><Flame size={13} style={{ verticalAlign: "middle", marginRight: 6, color }} />Risk Score</div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 800, color }}>{inc.score} <span style={{ fontSize: "0.7rem", color: "var(--color-mute)", fontWeight: 400 }}>/ 100</span></span>
        </div>
        <div className="risk-gauge-track">
          <div className="risk-gauge-fill" style={{ width: `${Math.max(5, inc.score)}%` }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "0.85rem" }}>
          {(inc.factors ?? []).map((f, i) => (
            <div key={i} style={{ padding: "0.35rem 0.65rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-line)", borderRadius: 8, fontSize: "0.7rem" }}>
              <span style={{ color: "var(--color-mute)" }}>{f.label} </span>
              <span style={{ fontWeight: 800, fontFamily: "var(--font-mono)", color: f.points >= 0 ? "#f43f5e" : "#22c55e" }}>{f.points > 0 ? "+" : ""}{f.points}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabbed content */}
      <div className="tab-bar">
        {(["overview","timeline","commands","techniques","actions"] as const).map((t) => (
          <button key={t} className={`tab-btn ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)} style={{ textTransform: "capitalize" }}>
            {t === "actions" ? `Actions (${(inc.actions ?? []).length})` : t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: "0.85rem" }}>Behavioral Profile</div>
            {[
              { label: "Cadence",     val: inc.profile?.cadence ?? "—" },
              { label: "Median Gap",  val: inc.profile?.median_gap_s ? `${inc.profile.median_gap_s}s` : "—" },
              { label: "Sessions",    val: String(inc.profile?.sessions ?? "—") },
              { label: "SSH Client",  val: inc.profile?.ssh_client ?? "—" },
              { label: "HASSH",       val: inc.profile?.hassh ?? "—" },
              { label: "Sensors Hit", val: (inc.profile?.sensors ?? []).join(", ") || "—" },
            ].map((d) => (
              <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0.55rem 0", borderBottom: "1px solid rgba(30,45,69,0.6)", gap: 12 }}>
                <span style={{ fontSize: "0.75rem", color: "var(--color-mute)" }}>{d.label}</span>
                <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--color-ink)", textAlign: "right", wordBreak: "break-all", maxWidth: "60%" }}>{d.val}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: "0.85rem" }}>Credentials Probed</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {(inc.profile?.creds_tried ?? []).slice(0, 20).map((c, i) => (
                <span key={i} style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "#fca5a5" }}>{c}</span>
              ))}
              {(inc.profile?.creds_tried ?? []).length === 0 && <span style={{ fontSize: "0.78rem", color: "var(--color-mute)" }}>No credentials captured</span>}
            </div>
            {(inc.real_asset_events ?? []).length > 0 && (
              <>
                <div className="card-title" style={{ marginTop: "1rem", marginBottom: "0.6rem" }}>Real Asset Contacts</div>
                {inc.real_asset_events.slice(0, 4).map((e, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "0.5rem 0", borderBottom: "1px solid rgba(30,45,69,0.5)", fontSize: "0.75rem" }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-mute)" }}>{e.ts.slice(11, 19)}</span>
                    <span style={{ color: "#22c55e" }}>{e.sensor}</span>
                    <span style={{ color: "var(--color-ink)" }}>{e.action}</span>
                    <span style={{ color: e.outcome === "success" ? "#f43f5e" : "#64748b" }}>{e.outcome}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      {activeTab === "timeline" && (
        <AttackTimeline events={inc.timeline ?? []} maxHeight={720} />
      )}

      {/* Commands */}
      {activeTab === "commands" && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: "0.85rem" }}>
            <Terminal size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />
            SSH Command Transcript ({(inc.transcript ?? []).length} commands)
          </div>
          <div className="terminal" style={{ maxHeight: 400, overflowY: "auto" }}>
            <div style={{ color: "#475569", marginBottom: 8 }}># Cowrie SSH honeypot — captured shell session</div>
            {(inc.transcript ?? []).length === 0
              ? <div style={{ color: "#64748b", fontStyle: "italic" }}>No commands captured in this session.</div>
              : (inc.transcript ?? []).map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 10 }}>
                    <span className="ts">[{t.ts.slice(11, 19)}]</span>
                    <span className="prompt">root@db-prod-02:~#</span>
                    <span className="cmd">{t.cmd}</span>
                  </div>
                ))
            }
          </div>
        </div>
      )}

      {/* Techniques */}
      {activeTab === "techniques" && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: "0.85rem" }}>MITRE ATT&CK Techniques Observed</div>
          {(inc.techniques ?? []).length === 0 ? (
            <div className="empty-state"><Shield size={24} /><p>No techniques mapped</p></div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 8 }}>
              {inc.techniques.map((t) => (
                <div key={t.id} style={{ padding: "0.75rem 0.85rem", background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", fontWeight: 800, color: "#3b82f6" }}>{t.id}</span>
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "1px 6px", borderRadius: 4, background: "rgba(59,130,246,0.1)", color: "#93c5fd" }}>{t.tactic}</span>
                  </div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-ink)" }}>{t.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {activeTab === "actions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div className="notice notice-info">
            <Info size={14} style={{ flexShrink: 0 }} />
            Production-affecting actions require explicit approval. Use "Dry Run" to preview impact before applying.
          </div>
          {(inc.actions ?? []).length === 0 ? (
            <div className="empty-state"><Zap size={24} /><p>No actions recommended yet</p></div>
          ) : (inc.actions ?? []).map((act) => {
            const cfg = ACTION_COLOR[act.type] ?? ACTION_COLOR.monitor;
            const isExecuting = executing[act.id];
            const result = actionResults[act.id];
            const isDone = act.status === "approved" || act.status === "executed";
            return (
              <div key={act.id} className="card" style={{ borderColor: cfg.border, padding: "1.1rem 1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: cfg.color, flexShrink: 0, marginTop: 2 }}>
                      {ACTION_ICONS[act.type] ?? <Zap size={14} />}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-ink)" }}>{act.title}</span>
                        <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "1px 6px", borderRadius: 999, background: isDone ? "rgba(34,197,94,0.1)" : "rgba(100,116,139,0.1)", color: isDone ? "#22c55e" : "#64748b", border: `1px solid ${isDone ? "rgba(34,197,94,0.25)" : "rgba(100,116,139,0.2)"}`, textTransform: "uppercase" }}>{act.status}</span>
                        {act.requires_approval && <span style={{ fontSize: "0.6rem", padding: "1px 5px", borderRadius: 4, background: "rgba(234,179,8,0.1)", color: "#eab308", border: "1px solid rgba(234,179,8,0.2)" }}>Requires Approval</span>}
                      </div>
                      <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-mute)" }}>{act.why}</p>
                      {result && (
                        <div style={{ marginTop: 6, padding: "0.5rem 0.75rem", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, fontSize: "0.72rem", color: "#86efac", fontFamily: "var(--font-mono)" }}>
                          {result}
                        </div>
                      )}
                    </div>
                  </div>
                  {!isDone && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-sm" disabled={isExecuting} onClick={() => handleAction(act, "dry_run")}>
                        {isExecuting ? "…" : "Dry Run"}
                      </button>
                      {act.requires_approval && (
                        <button className="btn btn-danger btn-sm" disabled={isExecuting} onClick={() => handleAction(act, "approve")}>
                          {isExecuting ? "Executing…" : "Approve & Execute"}
                        </button>
                      )}
                    </div>
                  )}
                  {isDone && <CheckCircle size={18} style={{ color: "#22c55e", flexShrink: 0 }} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
