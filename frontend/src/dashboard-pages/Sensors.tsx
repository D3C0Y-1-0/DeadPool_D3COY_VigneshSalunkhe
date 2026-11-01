"use client";

import React, { useEffect, useState } from "react";
import { fetchSensorStatus, SensorStatus } from "../api";
import { Activity, RefreshCw, Server, Shield, Wifi } from "lucide-react";

const SENSOR_META: Record<string, { name: string; type: string; color: string; desc: string }> = {
  cowrie:     { name: "Cowrie SSH Decoy",   type: "SSH Honeypot",      color: "#f43f5e", desc: "Simulates db-prod-02 SSH on port 2222" },
  portal:     { name: "Web Portal Trap",    type: "HTTP Honeypot",     color: "#3b82f6", desc: "Fake customer portal on port 8080" },
  opencanary: { name: "OpenCanary Decoy",   type: "MySQL / FTP Trap",  color: "#22c55e", desc: "MySQL 3306 + FTP 21 decoy services" },
  tripwire:   { name: "Tripwire Listener",  type: "TCP Port Monitor",  color: "#eab308", desc: "Canary token on ports 2323, 9200" },
  prod:       { name: "Production Shield",  type: "Firewall Monitor",  color: "#8b5cf6", desc: "prod-web-01 firewall / auth log feed" },
};

export default function Sensors() {
  const [sensors, setSensors] = useState<SensorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchSensorStatus()
      .then(setSensors)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load sensor telemetry."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const combined = sensors.map((sensor) => ({
    ...{
      name: sensor.asset || sensor.sensor,
      type: "Telemetry source",
      color: "#111827",
      desc: "Configured sensor returned by the backend.",
    },
    ...SENSOR_META[sensor.sensor],
    ...sensor,
  }));
  const seenSensors = combined.filter((sensor) => sensor.last_event).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 4 }}>Deception Infrastructure</div>
          <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Honeypot Fleet</h1>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", color: "var(--color-mute)" }}>Status and telemetry for all active deception sensors</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} style={{ gap: 6 }}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem" }}>
        {[
          { label: "Total Sensors",     val: combined.length, color: "#3b82f6" },
          { label: "Deception Decoys",  val: combined.filter((s) => s.zone === "deception").length, color: "#8b5cf6" },
          { label: "Sources with telemetry", val: `${seenSensors}/${combined.length}`, color: "#111827" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: "0.85rem 1rem" }}>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-mute)", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {error && <div className="notice notice-warning" role="status">Sensor telemetry unavailable: {error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: "1rem" }}>
        {loading ? (
          <div className="card empty-state" style={{ minHeight: 180 }}>Loading sensor telemetry…</div>
        ) : combined.length === 0 ? (
          <div className="card empty-state" style={{ minHeight: 180 }}>No configured sensor sources were returned.</div>
        ) : combined.map((s) => (
          <div key={s.sensor} className="card" style={{ borderColor: `${s.color}30`, padding: "1.25rem" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: "0.85rem" }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: `${s.color}12`, border: `1px solid ${s.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: s.color, flexShrink: 0 }}>
                <Server size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-ink)" }}>{s.name}</div>
                <div style={{ fontSize: "0.68rem", color: "var(--color-mute)", marginTop: 2 }}>{s.type}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.65rem", fontWeight: 700, color: s.last_event ? "#15803d" : "#737373" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.last_event ? "#22c55e" : "#d1d5db" }} />
                {s.last_event ? "Telemetry observed" : "Awaiting telemetry"}
              </div>
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--color-mute)", marginBottom: "0.75rem", lineHeight: 1.5 }}>{s.desc}</div>
            <div style={{ display: "flex", gap: 12, fontSize: "0.72rem" }}>
              <div>
                <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(100,116,139,0.7)", marginBottom: 2 }}>Zone</div>
                <div style={{ fontWeight: 700, color: s.zone === "deception" ? "#8b5cf6" : "#22c55e", textTransform: "uppercase", fontSize: "0.7rem" }}>{s.zone}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(100,116,139,0.7)", marginBottom: 2 }}>Total Events</div>
                <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: s.color }}>{s.total_events.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(100,116,139,0.7)", marginBottom: 2 }}>Last Event</div>
                <div style={{ fontFamily: "var(--font-mono)", color: "var(--color-mute)", fontSize: "0.68rem" }}>
                  {s.last_event ? new Date(s.last_event).toLocaleTimeString() : "—"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
