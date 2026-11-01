"use client";

import React, { useEffect, useState } from "react";
import { triggerDemo, resetDemo, fetchDemoStatus } from "../api";
import { useLive } from "../useLive";
import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle, RefreshCw, Shield, Target, Terminal, Trash2, Zap } from "lucide-react";

interface ScenarioResult { status: string; id?: string; message?: string; }

export default function DemoConsole() {
  const { refreshAll, stats, incidents } = useLive();
  const [status, setStatus] = useState<{ active_scenario: string | null; sim_ready: boolean } | null>(null);
  const [targetedResult, setTargetedResult] = useState<ScenarioResult | null>(null);
  const [noiseResult, setNoiseResult] = useState<ScenarioResult | null>(null);
  const [running, setRunning] = useState<"targeted"|"noise"|"reset"|null>(null);

  const load = () => {
    fetchDemoStatus().then(setStatus).catch(() => null);
  };
  useEffect(() => { load(); }, []);

  const run = async (scenario: "targeted" | "noise") => {
    setRunning(scenario);
    try {
      const r = await triggerDemo(scenario);
      const result: ScenarioResult = { status: r.status ?? "triggered", message: r.ok ? "Scenario launched successfully. Check incidents in 5–15 seconds." : "Scenario queued." };
      if (scenario === "targeted") setTargetedResult(result);
      else setNoiseResult(result);
      setTimeout(async () => { await refreshAll(); load(); }, 3000);
    } catch (e: any) {
      const err: ScenarioResult = { status: "error", message: e.message };
      if (scenario === "targeted") setTargetedResult(err);
      else setNoiseResult(err);
    } finally { setRunning(null); }
  };

  const handleReset = async () => {
    setRunning("reset");
    try {
      await resetDemo();
      setTargetedResult(null);
      setNoiseResult(null);
      await refreshAll();
      load();
    } finally { setRunning(null); }
  };

  const incList = Object.values(incidents);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 4 }}>Simulation</div>
          <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Demo Console</h1>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", color: "var(--color-mute)" }}>Trigger synthetic attack scenarios to demonstrate MIRAGE detection capabilities</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {status && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.4rem 0.85rem", borderRadius: 999, border: `1px solid ${status.sim_ready ? "rgba(34,197,94,0.3)" : "rgba(100,116,139,0.2)"}`, background: status.sim_ready ? "rgba(34,197,94,0.06)" : "rgba(100,116,139,0.06)", fontSize: "0.7rem", fontWeight: 700 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: status.sim_ready ? "#22c55e" : "#64748b" }} />
              <span style={{ color: status.sim_ready ? "#86efac" : "#64748b" }}>Simulator {status.sim_ready ? "Ready" : "Not Ready"}</span>
            </div>
          )}
          <button className="btn btn-danger btn-sm" onClick={handleReset} disabled={running === "reset"} style={{ gap: 6 }}>
            <Trash2 size={13} /> {running === "reset" ? "Resetting…" : "Reset All Data"}
          </button>
        </div>
      </div>

      {/* Platform stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem" }}>
        {[
          { label: "Total Events",    val: stats.raw_events.toLocaleString(), color: "#3b82f6" },
          { label: "Total Incidents", val: stats.incidents.toString(), color: "#f43f5e" },
          { label: "Critical Open",   val: stats.critical_open.toString(), color: "#f97316" },
          { label: "Contained",       val: stats.contained.toString(), color: "#22c55e" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: "0.85rem 1rem" }}>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-mute)", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: "1.65rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="notice notice-info">
        <Shield size={14} style={{ flexShrink: 0 }} />
        All attack traffic is synthetic and confined within the isolated Docker deception network. No real systems are contacted.
      </div>

      {/* Scenario cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
        {/* Targeted Attack */}
        <div className="card" style={{ borderColor: "rgba(244,63,94,0.3)", padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f43f5e" }}>
              <Target size={22} />
            </div>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(244,63,94,0.12)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.3)" }}>CRITICAL SCENARIO</span>
          </div>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", fontWeight: 800, color: "var(--color-ink)" }}>Targeted APT Attack</h2>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.82rem", color: "var(--color-mute)", lineHeight: 1.6 }}>
            Simulates a sophisticated threat actor: SSH brute-force → successful login → interactive commands → crown-jewel data access → honeytoken exfiltration → lateral movement to production.
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1rem" }}>
            {["SSH Brute Force","Command Exec","Honeytoken Trigger","Lateral Movement","CRITICAL Incident"].map((tag) => (
              <span key={tag} style={{ fontSize: "0.62rem", fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: "rgba(244,63,94,0.08)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.18)" }}>{tag}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-danger" disabled={running === "targeted"} onClick={() => run("targeted")} style={{ gap: 6 }}>
              <Zap size={14} /> {running === "targeted" ? "Launching…" : "Launch Scenario"}
            </button>
            <Link href="/dashboard/incidents" className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
              <Activity size={13} /> Watch Live
            </Link>
          </div>
          {targetedResult && (
            <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: targetedResult.status === "error" ? "rgba(244,63,94,0.07)" : "rgba(34,197,94,0.07)", border: `1px solid ${targetedResult.status === "error" ? "rgba(244,63,94,0.25)" : "rgba(34,197,94,0.25)"}`, borderRadius: 10, fontSize: "0.75rem", color: targetedResult.status === "error" ? "#fca5a5" : "#86efac", display: "flex", alignItems: "flex-start", gap: 8 }}>
              {targetedResult.status === "error" ? <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> : <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />}
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Status: {targetedResult.status}</div>
                <div>{targetedResult.message}</div>
              </div>
            </div>
          )}
        </div>

        {/* Noise Scenario */}
        <div className="card" style={{ borderColor: "rgba(234,179,8,0.3)", padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#eab308" }}>
              <Terminal size={22} />
            </div>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(234,179,8,0.12)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}>BACKGROUND NOISE</span>
          </div>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", fontWeight: 800, color: "var(--color-ink)" }}>Opportunistic Noise</h2>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.82rem", color: "var(--color-mute)", lineHeight: 1.6 }}>
            Simulates mass internet background noise: automated scanners, credential-stuffing bots with common wordlists. Demonstrates MIRAGE's noise suppression and opportunistic classification.
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1rem" }}>
            {["Automated Scanners","Credential Stuffing","Multi-Sensor","Noise Suppression","LOW/MEDIUM Incidents"].map((tag) => (
              <span key={tag} style={{ fontSize: "0.62rem", fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: "rgba(234,179,8,0.08)", color: "#eab308", border: "1px solid rgba(234,179,8,0.18)" }}>{tag}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-sm" disabled={running === "noise"} onClick={() => run("noise")} style={{ gap: 6, background: "rgba(234,179,8,0.1)", color: "#eab308", border: "1px solid rgba(234,179,8,0.25)" }}>
              <Zap size={14} /> {running === "noise" ? "Launching…" : "Launch Noise"}
            </button>
            <Link href="/dashboard/monitor" className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
              <Activity size={13} /> Monitor Events
            </Link>
          </div>
          {noiseResult && (
            <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: noiseResult.status === "error" ? "rgba(244,63,94,0.07)" : "rgba(34,197,94,0.07)", border: `1px solid ${noiseResult.status === "error" ? "rgba(244,63,94,0.25)" : "rgba(34,197,94,0.25)"}`, borderRadius: 10, fontSize: "0.75rem", color: noiseResult.status === "error" ? "#fca5a5" : "#86efac", display: "flex", alignItems: "flex-start", gap: 8 }}>
              {noiseResult.status === "error" ? <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> : <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />}
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Status: {noiseResult.status}</div>
                <div>{noiseResult.message}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent incidents generated */}
      {incList.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Generated Incidents</div>
            <Link href="/dashboard/incidents" style={{ fontSize: "0.72rem", color: "var(--color-accent)", fontWeight: 600 }}>View all →</Link>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Source IP</th><th>Severity</th><th>Score</th><th>Stage</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {incList.slice(0, 6).map((inc: any, i) => (
                  <tr key={inc.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "#93c5fd" }}>
                      <Link href={`/dashboard/incidents/${encodeURIComponent(inc.id)}`}>{inc.id}</Link>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>{inc.src_ip}</td>
                    <td><span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", padding: "2px 7px", borderRadius: 999, background: inc.severity === "critical" ? "rgba(244,63,94,0.12)" : inc.severity === "high" ? "rgba(249,115,22,0.12)" : "rgba(234,179,8,0.12)", color: inc.severity === "critical" ? "#f43f5e" : inc.severity === "high" ? "#f97316" : "#eab308", border: `1px solid ${inc.severity === "critical" ? "rgba(244,63,94,0.3)" : "rgba(234,179,8,0.25)"}` }}>{inc.severity}</span></td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", fontWeight: 700 }}>{inc.score}</td>
                    <td style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--color-mute)" }}>{inc.stage?.replace(/_/g, " ")}</td>
                    <td style={{ fontSize: "0.65rem", fontWeight: 700, color: inc.status === "contained" ? "#22c55e" : "#f43f5e", textTransform: "uppercase" }}>{inc.status}</td>
                    <td>
                      <Link href={`/dashboard/incidents/${encodeURIComponent(inc.id)}`} className="btn btn-ghost btn-sm" style={{ fontSize: "0.65rem", padding: "2px 8px" }}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
