import React from "react";

interface Props {
  severity: "critical" | "high" | "medium" | "low" | string;
  score?: number;
  pulse?: boolean;
}

export default function SeverityBadge({ severity, score, pulse = false }: Props) {
  const sev = severity.toLowerCase();

  const styles: Record<string, string> = {
    critical: "bg-[#ff3b5c]/15 text-[#ff3b5c] border-[#ff3b5c]/40",
    high: "bg-[#ff8a3d]/15 text-[#ff8a3d] border-[#ff8a3d]/40",
    medium: "bg-[#f5c542]/15 text-[#f5c542] border-[#f5c542]/40",
    low: "bg-[#3dd6a8]/15 text-[#3dd6a8] border-[#3dd6a8]/40"
  };

  const styleClass = styles[sev] || "bg-slate-800 text-slate-300 border-slate-700";
  const shouldPulse = pulse && sev === "critical";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold tracking-wider uppercase border mono transition-all ${styleClass} ${
        shouldPulse ? "pulse-crit ring-1 ring-[#ff3b5c]" : ""
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${
        sev === "critical" ? "bg-[#ff3b5c]" : sev === "high" ? "bg-[#ff8a3d]" : sev === "medium" ? "bg-[#f5c542]" : "bg-[#3dd6a8]"
      }`} />
      {severity}
      {score !== undefined && (
        <span className="text-opacity-80 border-l border-current pl-1.5 font-bold">
          {score}
        </span>
      )}
    </span>
  );
}
