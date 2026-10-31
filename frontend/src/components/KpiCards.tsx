import React from "react";
import { KpiStats } from "../types";
import { Activity, ShieldAlert, Filter, ShieldCheck, Flame, Users, Target, Shield } from "lucide-react";

export default function KpiCards({ stats }: { stats: KpiStats }) {
  const cards = [
    {
      label: "Total Alerts",
      value: stats.incidents.toLocaleString(),
      subtext: "+ 23% vs last 24h",
      icon: Bell,
      color: "text-ink",
      trend: "up",
      chartColor: "bg-crit"
    },
    {
      label: "Critical Alerts",
      value: stats.critical_open.toLocaleString(),
      subtext: "+ 12% vs last 24h",
      icon: Flame,
      color: "text-high",
      trend: "up",
      chartColor: "bg-high"
    },
    {
      label: "Open Incidents",
      value: stats.incidents.toLocaleString(),
      subtext: "- 13% vs last 24h",
      icon: ShieldAlert,
      color: "text-accent",
      trend: "down",
      chartColor: "bg-accent"
    },
    {
      label: "Assets Monitored",
      value: "1,248",
      subtext: "+ 8% vs last 24h",
      icon: Shield,
      color: "text-accent",
      trend: "up",
      chartColor: "bg-accent"
    },
    {
      label: "Threats Blocked",
      value: stats.contained.toLocaleString(),
      subtext: "+ 31% vs last 24h",
      icon: ShieldCheck,
      color: "text-low",
      trend: "up",
      chartColor: "bg-low"
    }
  ];

  // Helper to get Lucide icon (Bell is missing from imports in previous read, adding it)
  const getIcon = (label: string) => {
    switch (label) {
      case "Total Alerts": return <ShieldAlert className="w-4 h-4" />;
      case "Critical Alerts": return <Flame className="w-4 h-4" />;
      case "Open Incidents": return <Activity className="w-4 h-4" />;
      case "Assets Monitored": return <Shield className="w-4 h-4" />;
      case "Threats Blocked": return <ShieldCheck className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((c, i) => {
        return (
          <div
            key={i}
            className="metric-card bg-panel-card border border-line rounded-xl p-5 relative overflow-hidden group hover:border-accent/50 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-panel rounded-lg border border-line group-hover:bg-accent/10 group-hover:border-accent/20 transition-colors">
                {getIcon(c.label)}
              </div>
              <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.trend === 'up' ? 'text-low bg-low/10' : 'text-crit bg-crit/10'}`}>
                {c.subtext}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-mute uppercase tracking-widest">{c.label}</div>
              <div className="text-3xl font-bold text-ink tracking-tight">{c.value}</div>
            </div>

            {/* Simple sparkline decoration */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-line/30">
              <div className={`h-full ${c.chartColor} opacity-50 w-[70%]`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
