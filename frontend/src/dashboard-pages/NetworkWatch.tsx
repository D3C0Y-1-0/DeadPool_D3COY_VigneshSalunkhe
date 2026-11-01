"use client";

import React, { useMemo } from "react";
import { useLive } from "../useLive";
import { IncidentSummary, NormalizedEvent } from "../types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Globe, Shield, ShieldAlert } from "lucide-react";

export default function NetworkWatch() {
  const { events, incidents } = useLive();
  const incList = Object.values(incidents) as IncidentSummary[];

  const trendData = useMemo(() => {
    const hourMs = 60 * 60 * 1000;
    const buckets: Record<number, { deception: number; production: number }> = {};
    events.forEach((e) => {
      const timestamp = new Date(e.ts).getTime();
      if (!Number.isFinite(timestamp)) return;
      const key = Math.floor(timestamp / hourMs) * hourMs;
      if (!buckets[key]) buckets[key] = { deception: 0, production: 0 };
      if (e.zone === "deception") buckets[key].deception++;
      else if (e.zone === "production") buckets[key].production++;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => Number(a) - Number(b))
      .slice(-12)
      .map(([timestamp, counts]) => ({
        time: new Date(Number(timestamp)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ...counts,
      }));
  }, [events]);

  const topIPs = useMemo(() => {
    const cnt: Record<string, number> = {};
    events.forEach((e) => { cnt[e.src_ip] = (cnt[e.src_ip] ?? 0) + 1; });
    return Object.entries(cnt).sort(([, a], [, b]) => b - a).slice(0, 8).map(([ip, count]) => ({ ip, count }));
  }, [events]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 4 }}>Network Intelligence</div>
        <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Network Watch</h1>
        <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", color: "var(--color-mute)" }}>Real-time network traffic analysis across deception and production zones</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem" }}>
        {[
          { label: "Total Events",    val: events.length.toLocaleString(), color: "#3b82f6" },
          { label: "Deception Zone",  val: events.filter((e) => e.zone === "deception").length.toLocaleString(), color: "#8b5cf6" },
          { label: "Production Zone", val: events.filter((e) => e.zone === "production").length.toLocaleString(), color: "#f43f5e" },
          { label: "Unique Source IPs",val: new Set(events.map((e) => e.src_ip)).size.toString(), color: "#f97316" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: "0.85rem 1rem" }}>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-mute)", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.25rem" }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Zone Traffic Over Time</div></div>
          {trendData.length > 0 ? <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gDec" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                <linearGradient id="gProd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,45,69,0.6)" />
              <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#0f1927", border: "1px solid #1e2d45", borderRadius: 8, fontSize: "0.73rem" }} />
              <Area type="monotone" dataKey="deception"  stroke="#8b5cf6" strokeWidth={2} fill="url(#gDec)"  name="Deception" />
              <Area type="monotone" dataKey="production" stroke="#f43f5e" strokeWidth={2} fill="url(#gProd)" name="Production" />
            </AreaChart>
          </ResponsiveContainer> : (
            <div className="empty-state" style={{ minHeight: 220 }}>No network activity has been recorded yet.</div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Top Source IPs</div></div>
          {topIPs.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 180 }}><Globe size={22} /><p>No traffic data yet</p></div>
          ) : topIPs.map((item, i) => (
            <div key={item.ip} style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 8, marginBottom: 8, borderBottom: i < topIPs.length - 1 ? "1px solid rgba(30,45,69,0.6)" : undefined }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "#93c5fd", flex: 1 }}>{item.ip}</span>
              <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "#3b82f6", borderRadius: 99, width: `${Math.round((item.count / (topIPs[0]?.count || 1)) * 100)}%` }} />
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", fontWeight: 700, color: "var(--color-ink)", minWidth: 28, textAlign: "right" }}>{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
