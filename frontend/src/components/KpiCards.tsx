"use client";

import { Activity, AlertTriangle, Crosshair, ShieldCheck, Siren } from "lucide-react";
import { KpiStats } from "../types";

interface Props {
  stats: KpiStats;
}

export default function KpiCards({ stats }: Props) {
  const cards = [
    { id: "raw-events", label: "Raw Events", value: stats.raw_events, icon: Activity, color: "#2563eb" },
    { id: "incidents", label: "Incidents", value: stats.incidents, icon: Crosshair, color: "#6e44ff" },
    { id: "critical-open", label: "Critical Open", value: stats.critical_open, icon: Siren, color: "#ef4444" },
    { id: "contained", label: "Contained", value: stats.contained, icon: ShieldCheck, color: "#10b981" },
    { id: "opportunistic", label: "Opportunistic", value: stats.opportunistic, icon: AlertTriangle, color: "#f59e0b" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {cards.map(({ id, label, value, icon: Icon, color }) => (
        <div
          key={id}
          className="min-w-0 rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `${color}14`, color }}>
              <Icon size={15} />
            </span>
            <span className="min-w-0 text-[11px] font-semibold tracking-tight text-[#525252]">{label}</span>
          </div>
          <div className="mt-3 font-display text-2xl font-bold tracking-tight text-black">
            {value.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">Current recorded total</div>
        </div>
      ))}
    </div>
  );
}
