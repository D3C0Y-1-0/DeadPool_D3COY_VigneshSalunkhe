import React from "react";

interface Props {
  severity: "critical" | "high" | "medium" | "low" | string;
  score?: number;
  pulse?: boolean;
}

export default function SeverityBadge({ severity, score, pulse = false }: Props) {
  const sev = severity.toLowerCase();

  const styles: Record<string, string> = {
    critical: "badge-danger",
    high: "badge-warning",
    medium: "badge-warning",
    low: "badge-normal"
  };

  const dotColors: Record<string, string> = {
    critical: "bg-red-500",
    high: "bg-amber-500",
    medium: "bg-amber-500",
    low: "bg-emerald-500"
  };

  const styleClass = styles[sev] || "badge-info";
  const dotClass = dotColors[sev] || "bg-slate-400";
  const shouldPulse = pulse && sev === "critical";

  return (
    <span
      className={`status-badge mono gap-1.5 ${styleClass} ${
        shouldPulse ? "pulse-crit" : ""
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {severity}
      {score !== undefined && (
        <span className="border-l border-current pl-1.5 font-bold">
          {score}
        </span>
      )}
    </span>
  );
}
