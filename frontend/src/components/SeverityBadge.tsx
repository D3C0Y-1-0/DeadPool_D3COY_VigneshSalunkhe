"use client";

import React from "react";

interface Props {
  severity: "critical" | "high" | "medium" | "low" | string;
  score?: number;
  pulse?: boolean;
}

const CFG = {
  critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.22)" },
  high:     { label: "High",     color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.22)" },
  medium:   { label: "Medium",   color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.22)" },
  low:      { label: "Low",      color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.22)" },
};

export default function SeverityBadge({ severity, score, pulse = false }: Props) {
  const cfg = CFG[severity as keyof typeof CFG] ?? CFG.low;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.3rem",
      padding: "0.2rem 0.55rem", borderRadius: 999,
      fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      {pulse && (
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color, flexShrink: 0, animation: "dot-pulse 2s infinite" }} />
      )}
      {cfg.label}
      {score !== undefined && (
        <span style={{ fontFamily: "var(--font-mono)", marginLeft: 1, opacity: 0.75, fontSize: "0.58rem" }}>{score}</span>
      )}
    </span>
  );
}
