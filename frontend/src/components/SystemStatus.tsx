"use client";

import React from "react";
import { ChevronRight } from "lucide-react";

export default function SystemStatus() {
  const systems = [
    { name: "SIEM", status: "Operational" },
    { name: "EDR", status: "Operational" },
    { name: "Network Sensors", status: "Operational" },
    { name: "Threat Intel Feeds", status: "Operational" },
    { name: "SOAR", status: "Operational" },
  ];

  return (
    <div className="panel bg-panel-card border border-line rounded-xl p-5 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[11px] font-bold text-mute uppercase tracking-widest">System Status</h3>
        <ChevronRight size={14} className="text-mute cursor-pointer" />
      </div>

      <div className="space-y-4">
        {systems.map((s) => (
          <div key={s.name} className="flex items-center justify-between group cursor-pointer">
            <span className="text-[12px] text-ink group-hover:text-accent transition-colors">{s.name}</span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-low shadow-[0_0_8px_rgba(61,214,168,0.5)]" />
              <span className="text-[11px] text-low font-medium">{s.status}</span>
              <ChevronRight size={12} className="text-line group-hover:text-mute" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
