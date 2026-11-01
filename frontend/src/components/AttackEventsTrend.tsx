"use client";

import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { NormalizedEvent } from "../types";

interface Props { events: NormalizedEvent[]; }

export default function AttackEventsTrend({ events }: Props) {
  const data = useMemo(() => {
    const intervalMs = 15 * 60 * 1000;
    const buckets: Record<number, { events: number; failed: number; success: number; blocked: number }> = {};
    events.forEach((e) => {
      const timestamp = new Date(e.ts).getTime();
      if (!Number.isFinite(timestamp)) return;
      const key = Math.floor(timestamp / intervalMs) * intervalMs;
      if (!buckets[key]) buckets[key] = { events: 0, failed: 0, success: 0, blocked: 0 };
      buckets[key].events++;
      if (e.outcome === "failure") buckets[key].failed++;
      else if (e.outcome === "success") buckets[key].success++;
      else if (e.outcome === "drop") buckets[key].blocked++;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => Number(a) - Number(b))
      .slice(-24)
      .map(([timestamp, counts]) => ({
        time: new Date(Number(timestamp)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ...counts,
      }));
  }, [events]);

  return (
    <div className="card" style={{ height: "100%" }}>
      <div className="card-header">
        <div>
          <div className="card-title">Event Activity</div>
          <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: 2 }}>15-minute buckets from the current event stream</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {[
            { label: "Events", color: "#111827" },
            { label: "Failed", color: "#ef4444" },
            { label: "Success", color: "#10b981" },
            { label: "Dropped", color: "#6e44ff" },
          ].map((l) => (
            <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.65rem", color: "#737373" }}>
              <span style={{ width: 8, height: 2, background: l.color, display: "inline-block", borderRadius: 1 }} /> {l.label}
            </span>
          ))}
        </div>
      </div>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="tgEvents" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#111827" stopOpacity={0.14}/><stop offset="95%" stopColor="#111827" stopOpacity={0}/></linearGradient>
              <linearGradient id="tgF" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
              <linearGradient id="tgS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.12}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
              <linearGradient id="tgB" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6e44ff" stopOpacity={0.15}/><stop offset="95%" stopColor="#6e44ff" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: "0.73rem", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }} labelStyle={{ color: "#374151" }} />
            <Area type="monotone" dataKey="events"  stroke="#111827" strokeWidth={1.7} fill="url(#tgEvents)" name="All events" />
            <Area type="monotone" dataKey="failed"  stroke="#ef4444" strokeWidth={1.5} fill="url(#tgF)" name="Failed" />
            <Area type="monotone" dataKey="success" stroke="#10b981" strokeWidth={1.5} fill="url(#tgS)" name="Successful" />
            <Area type="monotone" dataKey="blocked" stroke="#6e44ff" strokeWidth={1.5} fill="url(#tgB)" name="Dropped" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="empty-state" style={{ minHeight: 220 }}>
          <span>No event activity to chart</span>
          <span>Start a lab simulation or wait for sensor telemetry.</span>
        </div>
      )}
    </div>
  );
}
