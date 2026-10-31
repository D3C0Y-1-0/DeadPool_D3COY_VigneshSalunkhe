"use client";

import { IncidentSummary } from "../types";
import SeverityBadge from "./SeverityBadge";
import { AlertTriangle, ShieldCheck, Crosshair, Globe, ExternalLink, MoreVertical } from "lucide-react";

interface Props {
  incidents: IncidentSummary[];
}

export default function AlertQueue({ incidents }: Props) {
  return (
    <div className="panel bg-panel-card border border-line rounded-xl h-full flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-bold text-mute uppercase tracking-widest">Recent Alerts</h3>
          <span className="bg-accent/20 text-accent text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
            {incidents.length} New
          </span>
        </div>
        <span className="text-[10px] text-accent cursor-pointer hover:underline">View all alerts</span>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-line bg-panel/30">
              <th className="px-5 py-3 text-[10px] font-bold text-mute uppercase tracking-widest">Time</th>
              <th className="px-5 py-3 text-[10px] font-bold text-mute uppercase tracking-widest">Alert Name</th>
              <th className="px-5 py-3 text-[10px] font-bold text-mute uppercase tracking-widest">Severity</th>
              <th className="px-5 py-3 text-[10px] font-bold text-mute uppercase tracking-widest">Source</th>
              <th className="px-5 py-3 text-[10px] font-bold text-mute uppercase tracking-widest">Destination</th>
              <th className="px-5 py-3 text-[10px] font-bold text-mute uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-mute text-xs italic">
                  No active alerts detected in the system
                </td>
              </tr>
            ) : (
              incidents.map((inc) => (
                <tr 
                  key={inc.id} 
                  className="hover:bg-panel/50 cursor-pointer transition-colors group"
                  onClick={() => window.location.assign(`/dashboard/incidents/${encodeURIComponent(inc.id)}`)}
                >
                  <td className="px-5 py-3 text-[11px] text-mute mono">
                    {new Date(inc.first_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-[12px] font-bold text-ink group-hover:text-accent transition-colors">
                      {inc.verdict === 'targeted' ? 'Brute Force Login Attempt' : 'Automated Scanner Detected'}
                    </div>
                    <div className="text-[10px] text-mute truncate max-w-[200px]">
                      Stage: {inc.stage} • {inc.techniques.length} Techniques
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        inc.severity === 'critical' ? 'bg-crit' : 
                        inc.severity === 'high' ? 'bg-high' : 
                        inc.severity === 'medium' ? 'bg-med' : 'bg-low'
                      }`} />
                      <span className={`text-[10px] font-bold uppercase ${
                        inc.severity === 'critical' ? 'text-crit' : 
                        inc.severity === 'high' ? 'text-high' : 
                        inc.severity === 'medium' ? 'text-med' : 'text-low'
                      }`}>
                        {inc.severity}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[11px] text-ink mono">
                    {inc.src_ip}
                  </td>
                  <td className="px-5 py-3 text-[11px] text-ink mono">
                    192.168.1.{Math.floor(Math.random() * 255)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        inc.status === 'contained' ? 'border-low/30 text-low bg-low/10' : 'border-crit/30 text-crit bg-crit/10'
                      }`}>
                        {inc.status === 'contained' ? 'CLOSED' : 'NEW'}
                      </span>
                      <MoreVertical size={14} className="text-mute opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
