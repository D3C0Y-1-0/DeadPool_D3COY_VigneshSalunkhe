"use client";

import React from "react";
import { IncidentSummary } from "../types";

interface Props {
  incidents: IncidentSummary[];
}

export default function RecentCases({ incidents }: Props) {
  // Take top 3 most recent/critical incidents as "cases"
  const cases = incidents
    .sort((a, b) => new Date(b.first_seen).getTime() - new Date(a.first_seen).getTime())
    .slice(0, 3);

  return (
    <div className="panel bg-panel-card border border-line rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[11px] font-bold text-mute uppercase tracking-widest">Recent Cases</h3>
        <span className="text-[10px] text-accent cursor-pointer hover:underline">View all</span>
      </div>

      <div className="flex-1 space-y-4">
        {cases.length === 0 ? (
          <div className="h-full flex items-center justify-center text-mute text-xs italic">
            No active cases requiring attention
          </div>
        ) : (
          cases.map((c) => (
            <div key={c.id} className="p-3 bg-panel border border-line rounded-lg hover:border-accent/30 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-bold text-ink group-hover:text-accent truncate pr-2">
                  {c.verdict === 'targeted' ? 'Suspicious APT Activity' : 'Automated Scan Detected'}
                </span>
                <span className="text-[9px] text-mute uppercase mono shrink-0">#{c.id.slice(0, 8)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    c.severity === 'critical' ? 'bg-crit' : 
                    c.severity === 'high' ? 'bg-high' : 
                    c.severity === 'medium' ? 'bg-med' : 'bg-low'
                  }`} />
                  <span className={`text-[10px] font-bold uppercase ${
                    c.severity === 'critical' ? 'text-crit' : 
                    c.severity === 'high' ? 'text-high' : 
                    c.severity === 'medium' ? 'text-med' : 'text-low'
                  }`}>
                    {c.severity}
                  </span>
                </div>
                <span className="text-[10px] text-mute">
                  {new Date(c.first_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
