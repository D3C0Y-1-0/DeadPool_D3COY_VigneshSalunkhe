"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useLive } from "../useLive";
import { fetchIncident, executeAction } from "../api";
import { Incident, IncidentSummary } from "../types";
import SeverityBadge from "../components/SeverityBadge";
import AttackTimeline from "../components/AttackTimeline";
import { downloadIncidentPdf } from "../utils/pdfReports";
import {
  ArrowLeft, ArrowRight, CheckCircle, Crosshair, Download,
  Flame, Globe, Search, Shield, ShieldAlert, Terminal, User
} from "lucide-react";

const SEV_COLOR: Record<string, string> = {
  critical: "#f43f5e", high: "#f97316", medium: "#eab308", low: "#22c55e",
};

function RelTime(iso: string) {
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return "Time unavailable";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

function formatTimestamp(iso?: string) {
  if (!iso) return "Not recorded";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function formatDuration(seconds?: number) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "Not recorded";
  const total = Math.floor(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  if (days) return `${days}d ${hours}h ${minutes}m`;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${remainder}s`;
  return `${remainder}s`;
}

function buildActivityBuckets(timeline: Incident["timeline"]) {
  const timestamps = timeline
    .map((event) => new Date(event.ts).getTime())
    .filter((timestamp) => Number.isFinite(timestamp));
  if (!timestamps.length) return [];

  const { start, end } = timestamps.reduce(
    (range, timestamp) => ({
      start: Math.min(range.start, timestamp),
      end: Math.max(range.end, timestamp),
    }),
    { start: Number.POSITIVE_INFINITY, end: Number.NEGATIVE_INFINITY },
  );
  const span = Math.max(end - start, 1);
  const bucketCount = Math.min(8, Math.max(4, timestamps.length));
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = start + (span * index) / bucketCount;
    return {
      label: new Date(bucketStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      count: 0,
    };
  });

  timestamps.forEach((timestamp) => {
    const index = Math.min(bucketCount - 1, Math.floor(((timestamp - start) / span) * bucketCount));
    buckets[index].count += 1;
  });
  return buckets;
}

export default function Attackers() {
  const { incidents } = useLive();
  const [filter, setFilter] = useState<"all" | "targeted" | "opportunistic" | "contained">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Incident | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"behavior" | "iocs" | "commands" | "timeline">("behavior");
  const [containMsg, setContainMsg] = useState<string | null>(null);
  const [containError, setContainError] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportError, setReportError] = useState(false);

  const list = useMemo(() => Object.values(incidents) as IncidentSummary[], [incidents]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return list.filter((i) => {
      if (filter === "targeted" && i.verdict !== "targeted") return false;
      if (filter === "opportunistic" && i.verdict !== "opportunistic") return false;
      if (filter === "contained" && i.status !== "contained") return false;
      if (!q) return true;
      return [i.src_ip, i.country, i.asn, i.stage].some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [list, filter, search]);

  const openProfile = async (id: string) => {
    setLoadingId(id);
    setProfileError(null);
    setContainMsg(null);
    setContainError(false);
    setReportMessage(null);
    setReportError(false);
    try {
      const full = await fetchIncident(id);
      setSelected(full);
      setActiveTab("behavior");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not load the attacker profile.");
    } finally { setLoadingId(null); }
  };

  const handleDownloadReport = () => {
    if (!selected) return;
    setReportMessage(null);
    setReportError(false);
    try {
      downloadIncidentPdf(selected);
      setReportMessage("Attacker investigation PDF downloaded.");
    } catch (error) {
      setReportError(true);
      setReportMessage(error instanceof Error ? error.message : "Could not generate the attacker report.");
    }
  };

  const handleContain = async () => {
    if (!selected) return;
    setContainMsg(null);
    setContainError(false);
    try {
      const blockAction = selected.actions?.find((a) => a.type === "block_source" && a.status === "recommended");
      if (!blockAction) {
        setContainError(true);
        setContainMsg("No recommended source-block action is available for this incident.");
        return;
      }
      const result = await executeAction(selected.id, blockAction.id, "approve");
      setContainMsg(result.result || `Containment approval recorded for ${selected.src_ip}.`);
    } catch (error) {
      setContainError(true);
      setContainMsg(error instanceof Error ? error.message : "Containment approval failed.");
    }
  };

  // ── Profile View ──────────────────────────────────────────────────────────
  if (selected) {
    const inc = selected;
    const color = SEV_COLOR[inc.severity] ?? "#64748b";

    return (
      <div className="profile-enter" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Back bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(null); setContainMsg(null); setContainError(false); setReportMessage(null); }}>
            <ArrowLeft size={13} /> Back to Adversaries
          </button>
          <Link href={`/dashboard/incidents/${encodeURIComponent(inc.id)}`} className="btn btn-ghost btn-sm">
            View Full Incident <ArrowRight size={13} />
          </Link>
        </div>

        {containMsg && (
          <div className={`notice ${containError ? "notice-warning" : "notice-success"}`}>
            {containError ? <ShieldAlert size={15} style={{ flexShrink: 0 }} /> : <CheckCircle size={15} style={{ flexShrink: 0 }} />} {containMsg}
          </div>
        )}
        {reportMessage && (
          <div className={`notice ${reportError ? "notice-warning" : "notice-success"}`} role={reportError ? "alert" : "status"} aria-live="polite">
            {reportError ? <ShieldAlert size={15} style={{ flexShrink: 0 }} /> : <CheckCircle size={15} style={{ flexShrink: 0 }} />} {reportMessage}
          </div>
        )}
        {profileError && <div className="notice notice-warning" role="alert">{profileError}</div>}

        {/* Hero card */}
        <div className="card" style={{ padding: "1.5rem", borderColor: `${color}40` }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: `${color}18`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
                <Crosshair size={28} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--color-ink)" }}>{inc.src_ip}</span>
                  <SeverityBadge severity={inc.severity} />
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, background: inc.verdict === "targeted" ? "rgba(244,63,94,0.12)" : "rgba(100,116,139,0.12)", color: inc.verdict === "targeted" ? "#f43f5e" : "#64748b", border: `1px solid ${inc.verdict === "targeted" ? "rgba(244,63,94,0.3)" : "rgba(100,116,139,0.3)"}` }}>{inc.verdict}</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--color-mute)", marginTop: 4 }}>
                  {inc.country} • {inc.asn}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={handleDownloadReport} style={{ gap: 6, fontSize: "0.72rem", padding: "0.4rem 0.75rem" }}>
                <Download size={13} /> Download PDF report
              </button>
              {inc.status === "contained" ? (
                <span className="profile-contained-status"><CheckCircle size={14} /> Source already contained</span>
              ) : selected.actions?.some((action) => action.type === "block_source" && action.status === "recommended") ? (
                <button className="btn btn-danger" onClick={handleContain} style={{ gap: 6 }}>
                  <ShieldAlert size={14} /> Contain Adversary
                </button>
              ) : (
                <button className="btn btn-danger" disabled title="No recommended source-block action is available" style={{ gap: 6 }}>
                  <ShieldAlert size={14} /> Containment unavailable
                </button>
              )}
              <a href={`/api/incidents/${encodeURIComponent(inc.id)}/export/stix`} target="_blank" className="btn btn-ghost" style={{ gap: 6, fontSize: "0.72rem", padding: "0.4rem 0.75rem" }}>
                Export STIX
              </a>
            </div>
          </div>

          {/* Detail strip */}
          <div className="profile-stat-grid" style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--color-line)" }}>
            {[
              { label: "First observed", val: formatTimestamp(inc.first_seen), title: inc.first_seen },
              { label: "Last activity", val: formatTimestamp(inc.last_seen), title: inc.last_seen },
              { label: "Activity duration", val: formatDuration(inc.duration_s) },
              { label: "Recorded events", val: String(inc.timeline?.length ?? 0) },
              { label: "Observed sessions", val: inc.profile?.sessions == null ? "Not recorded" : String(inc.profile.sessions) },
              { label: "Current status", val: inc.status.replace(/_/g, " ") },
            ].map((d) => (
              <div key={d.label} title={d.title ? `Displayed in local time · source timestamp ${d.title}` : undefined}>
                <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-mute)", marginBottom: 4 }}>{d.label}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--color-ink)" }}>{d.val}</div>
                {d.label === "Last activity" && inc.last_seen && (
                  <div style={{ fontSize: "0.64rem", color: "var(--color-accent)", marginTop: 3 }}>{RelTime(inc.last_seen)}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main content: Timeline + Dossier */}
        <div className="profile-layout">
          <AttackTimeline events={inc.timeline ?? []} maxHeight={520} />

          {/* Right panel: Risk + Dossier */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Risk Gauge */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: "0.85rem" }}>
                <div className="card-title"><Flame size={13} style={{ marginRight: 6, verticalAlign: "middle", color: "var(--color-crit)" }} />Threat Risk Score</div>
                <span style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "var(--font-mono)", color }}>
                  {inc.score} <span style={{ fontSize: "0.7rem", color: "var(--color-mute)", fontWeight: 400 }}>/ 100</span>
                </span>
              </div>
              <div className="risk-gauge-track" style={{ marginBottom: "1rem" }}>
                <div className="risk-gauge-fill" style={{ width: `${Math.max(5, inc.score)}%` }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 6 }}>
                {(inc.factors ?? []).slice(0, 8).map((f, i) => (
                  <div key={i} style={{ padding: "0.5rem 0.65rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-line)", borderRadius: 8, textAlign: "center" }}>
                    <div style={{ fontSize: "0.65rem", color: "var(--color-mute)" }}>{f.label}</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: f.points < 0 ? "#22c55e" : "#f43f5e", marginTop: 2 }}>
                      {f.points > 0 ? "+" : ""}{f.points}
                    </div>
                  </div>
                ))}
                {(inc.factors ?? []).length === 0 && <div style={{ color: "var(--color-mute)", fontSize: "0.75rem" }}>No scoring factors returned by the incident engine.</div>}
              </div>
            </div>

            {/* Dossier Tabs */}
            <div className="card" style={{ flex: 1 }}>
              <div className="tab-bar" style={{ marginBottom: "1rem" }}>
                {(["behavior", "iocs", "commands", "timeline"] as const).map((t) => (
                  <button key={t} className={`tab-btn ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
                    {t === "behavior" ? "Behavioral Profile" : t === "iocs" ? "IOCs" : t === "commands" ? "Commands" : "Raw Events"}
                  </button>
                ))}
              </div>

              {activeTab === "behavior" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="profile-behavior-grid">
                    {[
                      { label: "Source address", val: inc.src_ip },
                      { label: "Origin", val: [inc.country, inc.asn].filter(Boolean).join(" · ") || "Not recorded" },
                      { label: "Cadence classification", val: inc.profile?.cadence ?? "Not recorded" },
                      { label: "Median event gap", val: inc.profile?.median_gap_s == null ? "Not recorded" : `${inc.profile.median_gap_s}s` },
                      { label: "SSH client", val: inc.profile?.ssh_client ?? "Not observed" },
                      { label: "HASSH fingerprint", val: inc.profile?.hassh ?? "Not observed" },
                      { label: "Sensors touched", val: (inc.profile?.sensors ?? []).join(", ") || "Not recorded" },
                      { label: "Attack stage", val: inc.stage.replace(/_/g, " ") },
                    ].map((d) => (
                      <div key={d.label} style={{ padding: "0.6rem 0.75rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-line)", borderRadius: 8 }}>
                        <div style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-mute)", fontWeight: 700, marginBottom: 4 }}>{d.label}</div>
                        <div style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono)", color: "var(--color-ink)", wordBreak: "break-all" }}>{d.val}</div>
                      </div>
                    ))}
                  </div>
                  <div className="profile-activity-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--color-ink)" }}>Activity over time</div>
                        <div style={{ fontSize: "0.62rem", color: "var(--color-mute)", marginTop: 2 }}>Event frequency · local time</div>
                      </div>
                      <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--color-mute)" }}>{inc.timeline?.length ?? 0} events</span>
                    </div>
                    {(() => {
                      const buckets = buildActivityBuckets(inc.timeline ?? []);
                      const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));
                      return buckets.length ? (
                        <>
                          <div className="profile-activity-bars" role="img" aria-label="Recorded event frequency over the incident duration">
                            {buckets.map((bucket, index) => (
                              <div className="profile-activity-column" key={`${bucket.label}-${index}`} title={`${bucket.label} · ${bucket.count} events`}>
                                <span className="profile-activity-bar" style={{ height: `${Math.max(8, (bucket.count / maxCount) * 100)}%`, animationDelay: `${index * 45}ms` }} />
                              </div>
                            ))}
                          </div>
                          <div className="profile-activity-labels"><span>{buckets[0].label}</span><span>{buckets[buckets.length - 1].label}</span></div>
                        </>
                      ) : <div className="profile-chart-empty">No timestamped activity is available to chart.</div>;
                    })()}
                  </div>
                  {(inc.techniques ?? []).length > 0 && (
                    <div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-mute)", marginBottom: 6 }}>Observed MITRE ATT&CK techniques</div>
                      <div className="profile-chip-list">
                        {inc.techniques.map((technique) => (
                          <span className="profile-technique-chip" key={`${technique.id}-${technique.tactic}`} title={technique.tactic}>
                            <strong>{technique.id}</strong> {technique.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="profile-evidence-flags">
                    <span className={inc.real_asset_touched ? "is-detected" : ""}><Shield size={13} /> Real asset touched: {inc.real_asset_touched ? "Yes" : "No"}</span>
                    <span className={inc.honeytoken_hit ? "is-detected" : ""}><Crosshair size={13} /> Honeytoken activity: {inc.honeytoken_hit ? "Yes" : "No"}</span>
                  </div>
                  {(inc.profile?.creds_tried ?? []).length > 0 && (
                    <div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-mute)", marginBottom: 6 }}>Credentials Probed</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {inc.profile!.creds_tried.slice(0, 20).map((c, i) => (
                          <span key={i} style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "#fca5a5" }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "iocs" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ padding: "0.75rem 1rem", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "0.65rem", color: "var(--color-mute)", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>IPv4 Source</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#f43f5e" }}>{inc.src_ip}</div>
                    </div>
                    <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(244,63,94,0.15)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.3)" }}>OBSERVED SOURCE</span>
                  </div>
                  {inc.honeytoken_hit && (
                    <div style={{ padding: "0.75rem 1rem", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "0.65rem", color: "var(--color-mute)", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Honeytoken evidence</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "#a78bfa" }}>A honeytoken interaction was recorded for this incident.</div>
                      </div>
                      <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}>HONEYTOKEN</span>
                    </div>
                  )}
                  {(inc.files ?? []).slice(0, 3).map((f, i) => (
                    <div key={i} style={{ padding: "0.75rem 1rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-line)", borderRadius: 10 }}>
                      <div style={{ fontSize: "0.65rem", color: "var(--color-mute)", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{f.name || "Captured artifact"}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "#94a3b8", wordBreak: "break-all" }}>{f.sha256 ? `SHA-256 · ${f.sha256}` : "No file hash recorded"}</div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "commands" && (
                <div className="terminal" style={{ maxHeight: 280, overflowY: "auto" }}>
                  <div style={{ color: "#64748b", marginBottom: 6 }}># Cowrie SSH shell transcript:</div>
                  {(inc.transcript ?? []).length > 0
                    ? inc.transcript.map((t, i) => (
                        <div key={i} style={{ display: "flex", gap: 10 }}>
                          <span className="ts" title={`Displayed in local time · source timestamp ${t.ts}`}>[{formatTimestamp(t.ts)}]</span>
                          <span className="prompt">$</span>
                          <span className="cmd">{t.cmd}</span>
                        </div>
                      ))
                    : <div className="profile-chart-empty">No command transcript was captured for this incident.</div>
                  }
                </div>
              )}

              {activeTab === "timeline" && (
                <div className="data-table-wrap" style={{ maxHeight: 280, overflowY: "auto" }}>
                  <table className="data-table">
                    <thead><tr><th>Time</th><th>Sensor</th><th>Zone</th><th>Action</th><th>Outcome</th></tr></thead>
                    <tbody>
                      {(inc.timeline ?? []).length > 0
                        ? inc.timeline.map((e, i) => (
                            <tr key={i}>
                              <td title={`Displayed in local time · source timestamp ${e.ts}`} style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--color-mute)" }}>{formatTimestamp(e.ts)}</td>
                              <td style={{ color: "#93c5fd" }}>{e.sensor}</td>
                              <td><span style={{ fontSize: "0.65rem", fontWeight: 700, color: e.zone === "deception" ? "#8b5cf6" : "#22c55e", textTransform: "uppercase" }}>{e.zone}</span></td>
                              <td style={{ fontFamily: "var(--font-mono)" }}>{e.action}</td>
                              <td style={{ color: e.outcome === "success" ? "#22c55e" : e.outcome === "failure" ? "#f43f5e" : "#64748b", fontFamily: "var(--font-mono)" }}>{e.outcome}</td>
                            </tr>
                          ))
                        : <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--color-mute)", padding: "1.5rem" }}>No events captured</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Table View ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 4 }}>Adversaries</div>
          <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Attacker Profiles</h1>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", color: "var(--color-mute)" }}>Investigate observed sources, event timing, and behavioral evidence · times shown in your local timezone</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="input-icon-wrap" style={{ width: 220 }}>
            <Search size={13} className="icon" />
            <input className="input" style={{ paddingLeft: "2.25rem" }} placeholder="Search IP, country, ASN…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="tab-bar">
            {(["all", "targeted", "opportunistic", "contained"] as const).map((k) => (
              <button key={k} className={`tab-btn ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>{k}</button>
            ))}
          </div>
        </div>
      </div>

      {profileError && <div className="notice notice-warning" role="alert">{profileError}</div>}

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem" }}>
        {[
          { label: "Total Actors", val: list.length, color: "#3b82f6" },
          { label: "Targeted", val: list.filter((i) => i.verdict === "targeted").length, color: "#f43f5e" },
          { label: "Opportunistic", val: list.filter((i) => i.verdict === "opportunistic").length, color: "#f97316" },
          { label: "Contained", val: list.filter((i) => i.status === "contained").length, color: "#22c55e" },
        ].map((c) => (
          <div key={c.label} className="card" style={{ padding: "0.85rem 1rem" }}>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-mute)", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: "1.65rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: c.color }}>{c.val}</div>
          </div>
        ))}
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Source IP</th>
              <th>Origin / ASN</th>
              <th>Risk Level</th>
              <th>Verdict</th>
              <th>Kill-Chain Stage</th>
              <th>First Seen</th>
              <th>Last Activity</th>
              <th>Score</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10}>
                <div className="empty-state"><User size={24} /><p>No threat actors matching current filters</p></div>
              </td></tr>
            ) : filtered.map((inc) => (
              <tr key={inc.id} style={{ cursor: "pointer" }} onClick={() => openProfile(inc.id)}>
                <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#93c5fd" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${SEV_COLOR[inc.severity] ?? "#64748b"}15`, border: `1px solid ${SEV_COLOR[inc.severity] ?? "#64748b"}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <User size={13} style={{ color: SEV_COLOR[inc.severity] }} />
                    </div>
                    {inc.src_ip}
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-ink)" }}>{inc.country}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--color-mute)", fontFamily: "var(--font-mono)" }}>{inc.asn}</div>
                </td>
                <td><SeverityBadge severity={inc.severity} /></td>
                <td>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", padding: "2px 7px", borderRadius: 999, background: inc.verdict === "targeted" ? "rgba(244,63,94,0.12)" : "rgba(100,116,139,0.1)", color: inc.verdict === "targeted" ? "#f43f5e" : "#64748b", border: `1px solid ${inc.verdict === "targeted" ? "rgba(244,63,94,0.3)" : "rgba(100,116,139,0.2)"}` }}>{inc.verdict}</span>
                </td>
                <td style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-mute)" }}>{inc.stage.replace(/_/g, " ")}</td>
                <td title={inc.first_seen ? `Source timestamp ${inc.first_seen}` : undefined} style={{ fontSize: "0.67rem", fontFamily: "var(--font-mono)", color: "var(--color-mute)", whiteSpace: "nowrap" }}>
                  {inc.first_seen ? formatTimestamp(inc.first_seen) : "Not recorded"}
                </td>
                <td title={`Source timestamp ${inc.last_seen}`} style={{ fontSize: "0.67rem", fontFamily: "var(--font-mono)", color: "var(--color-mute)", whiteSpace: "nowrap" }}>
                  <span>{formatTimestamp(inc.last_seen)}</span>
                  <span style={{ display: "block", color: "var(--color-accent)", fontFamily: "inherit", fontSize: "0.6rem", marginTop: 2 }}>{RelTime(inc.last_seen)}</span>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden", width: 48 }}>
                      <div style={{ height: "100%", background: SEV_COLOR[inc.severity], width: `${inc.score}%`, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", fontWeight: 700, color: SEV_COLOR[inc.severity] }}>{inc.score}</span>
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: inc.status === "contained" ? "rgba(34,197,94,0.1)" : "rgba(244,63,94,0.1)", color: inc.status === "contained" ? "#22c55e" : "#f43f5e", border: `1px solid ${inc.status === "contained" ? "rgba(34,197,94,0.25)" : "rgba(244,63,94,0.25)"}` }}>{inc.status === "contained" ? "CONTAINED" : "ACTIVE"}</span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-ghost btn-sm" disabled={loadingId === inc.id} onClick={(ev) => { ev.stopPropagation(); openProfile(inc.id); }} style={{ gap: 5 }}>
                    {loadingId === inc.id ? "Loading…" : <><Globe size={12} /> Inspect</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
