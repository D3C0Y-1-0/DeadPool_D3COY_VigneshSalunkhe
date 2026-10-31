import React from "react";
import { KpiStats } from "../types";
import { Activity, ShieldAlert, Filter, ShieldCheck, Flame } from "lucide-react";

export default function KpiCards({ stats }: { stats: KpiStats }) {
  const cards = [
    {
      label: "RAW SENSOR EVENTS",
      value: stats.raw_events.toLocaleString(),
      subtext: "Ingested across all decoys",
      icon: Activity,
      color: "text-[#4da3ff]",
      borderColor: "border-[#4da3ff]/30",
      bgGradient: "from-[#4da3ff]/5 to-transparent"
    },
    {
      label: "TOTAL INCIDENTS",
      value: stats.incidents.toLocaleString(),
      subtext: `${stats.raw_events > 0 ? (stats.raw_events / Math.max(1, stats.incidents)).toFixed(1) : 0}:1 reduction ratio`,
      icon: ShieldAlert,
      color: "text-[#ff8a3d]",
      borderColor: "border-[#ff8a3d]/30",
      bgGradient: "from-[#ff8a3d]/5 to-transparent"
    },
    {
      label: "CRITICAL (OPEN)",
      value: stats.critical_open.toLocaleString(),
      subtext: "Active hostile adversaries",
      icon: Flame,
      color: stats.critical_open > 0 ? "text-[#ff3b5c]" : "text-[#8a97ad]",
      borderColor: stats.critical_open > 0 ? "border-[#ff3b5c]/50" : "border-[#1f2a3d]",
      bgGradient: stats.critical_open > 0 ? "from-[#ff3b5c]/10 to-transparent" : "from-transparent"
    },
    {
      label: "NOISE SUPPRESSED",
      value: `${stats.noise_suppressed_pct}%`,
      subtext: `${stats.opportunistic} opportunistic scans deflected`,
      icon: Filter,
      color: "text-[#3dd6a8]",
      borderColor: "border-[#3dd6a8]/30",
      bgGradient: "from-[#3dd6a8]/5 to-transparent"
    },
    {
      label: "CONTAINED / BLOCKED",
      value: stats.contained.toLocaleString(),
      subtext: "Enforced at prod firewall",
      icon: ShieldCheck,
      color: "text-[#3dd6a8]",
      borderColor: "border-[#3dd6a8]/30",
      bgGradient: "from-[#3dd6a8]/5 to-transparent"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`bg-[#111827] border ${c.borderColor} bg-gradient-to-b ${c.bgGradient} rounded-lg p-3.5 flex flex-col justify-between shadow-sm hover:border-slate-600 transition-all`}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#8a97ad] tracking-wider mb-2">
              <span>{c.label}</span>
              <Icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <div>
              <div className={`text-2xl font-bold mono ${c.color}`}>
                {c.value}
              </div>
              <div className="text-[11px] text-[#8a97ad] mt-1 truncate">
                {c.subtext}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
