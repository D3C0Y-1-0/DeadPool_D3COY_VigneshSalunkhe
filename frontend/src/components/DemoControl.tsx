"use client";

import React, { useState } from "react";
import { triggerDemo, resetDemo } from "../api";
import { CheckCircle, Play, Shield, Trash2, X, Zap } from "lucide-react";

interface Props { isOpen: boolean; onClose: () => void; onRefresh: () => void; }

export default function DemoControl({ isOpen, onClose, onRefresh }: Props) {
  const [running, setRunning] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState(true);

  if (!isOpen) return null;

  const trigger = async (scenario: "targeted" | "noise") => {
    setRunning(scenario); setMsg(null);
    try {
      await triggerDemo(scenario);
      setMsg(`Scenario '${scenario}' launched — events appear in 5–15 seconds.`); setMsgOk(true);
      setTimeout(onRefresh, 3000);
    } catch (e: any) { setMsg(`Error: ${e.message}`); setMsgOk(false); }
    finally { setTimeout(() => setRunning(null), 1500); }
  };

  const reset = async () => {
    setRunning("reset"); setMsg(null);
    try { await resetDemo(); setMsg("Platform reset — all data cleared."); setMsgOk(true); onRefresh(); }
    catch (e: any) { setMsg(`Reset error: ${e.message}`); setMsgOk(false); }
    finally { setTimeout(() => setRunning(null), 1000); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(110,68,255,0.08)", border: "1px solid rgba(110,68,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#6e44ff" }}>
              <Zap size={15} />
            </div>
            <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#000", fontFamily: "var(--font-display)" }}>Demo Simulator</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4 }}><X size={15} /></button>
        </div>

        <p style={{ margin: "0 0 1.15rem", fontSize: "0.78rem", color: "#737373", lineHeight: 1.65 }}>
          Authorised lab simulator. Generates synthetic adversary telemetry inside the isolated{" "}
          <code style={{ fontFamily: "var(--font-mono)", background: "#f5f5f5", padding: "1px 5px", borderRadius: 4, color: "#374151", fontSize: "0.72rem" }}>attacker_net</code>{" "}
          container network only.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1rem" }}>
          {[
            { id: "targeted", title: "Targeted APT Attack", desc: "Full kill-chain: SSH brute-force → exec → honeytoken → lateral pivot → CRITICAL incident", color: "#ef4444", bg: "rgba(239,68,68,0.05)", border: "rgba(239,68,68,0.18)" },
            { id: "noise",    title: "Background Noise Storm", desc: "15+ automated scanners and credential-stuffing bots — tests noise suppression", color: "#f59e0b", bg: "rgba(245,158,11,0.05)", border: "rgba(245,158,11,0.18)" },
          ].map((s) => (
            <div key={s.id} style={{ padding: "0.85rem 1rem", background: s.bg, border: `1px solid ${s.border}`, borderRadius: 11, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#000", marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: "0.7rem", color: "#737373" }}>{s.desc}</div>
              </div>
              <button
                disabled={running !== null}
                onClick={() => trigger(s.id as any)}
                style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "0.4rem 0.8rem", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700, background: `${s.color}10`, color: s.color, border: `1px solid ${s.color}30`, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                <Play size={12} fill="currentColor" />
                {running === s.id ? "Launching…" : "Launch"}
              </button>
            </div>
          ))}

          <div style={{ padding: "0.85rem 1rem", background: "#fafafa", border: "1px solid var(--color-border)", borderRadius: 11, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#000", marginBottom: 3 }}>Reset All Data</div>
              <div style={{ fontSize: "0.7rem", color: "#737373" }}>Flush database, incidents, events and blocklist</div>
            </div>
            <button disabled={running !== null} onClick={reset} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "0.4rem 0.8rem", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700, background: "#f5f5f5", color: "#374151", border: "1px solid var(--color-border)", cursor: "pointer", whiteSpace: "nowrap" }}>
              <Trash2 size={12} />
              {running === "reset" ? "Resetting…" : "Reset"}
            </button>
          </div>
        </div>

        {msg && (
          <div style={{ padding: "0.6rem 0.85rem", background: msgOk ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${msgOk ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, borderRadius: 9, fontSize: "0.73rem", color: msgOk ? "#065f46" : "#b91c1c", display: "flex", alignItems: "center", gap: 7 }}>
            <CheckCircle size={13} style={{ flexShrink: 0 }} /> {msg}
          </div>
        )}

        <div style={{ marginTop: "0.85rem", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border)", fontSize: "0.64rem", color: "#9ca3af", textAlign: "center" }}>
          <Shield size={10} style={{ verticalAlign: "middle", marginRight: 4 }} />
          Lab mode · isolated · cap_drop ALL · no internet egress
        </div>
      </div>
    </div>
  );
}
