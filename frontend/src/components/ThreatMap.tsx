import React from "react";
import { IncidentSummary } from "../types";
import { Globe, ShieldAlert } from "lucide-react";

interface Props {
  incidents: IncidentSummary[];
}

export default function ThreatMap({ incidents }: Props) {
  const countryCounts: Record<string, { count: number; critical: boolean; targeted: boolean; asn: string }> = {};

  incidents.forEach((inc) => {
    const c = inc.country || "UNKNOWN";
    if (!countryCounts[c]) {
      countryCounts[c] = {
        count: 0,
        critical: false,
        targeted: false,
        asn: inc.asn || "Unknown"
      };
    }
    countryCounts[c].count += 1;
    if (inc.severity === "critical") countryCounts[c].critical = true;
    if (inc.verdict === "targeted") countryCounts[c].targeted = true;
  });

  const countryList = Object.entries(countryCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  return (
    <div className="panel bg-panel-card border border-line rounded-xl p-5 h-full flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-[11px] font-bold text-mute uppercase tracking-widest">Real-time Attack Map</h3>
        <select className="bg-panel border border-line text-[10px] text-mute rounded px-2 py-1 outline-none">
          <option>Last 24 Hours</option>
        </select>
      </div>

      <div className="flex-1 relative min-h-[200px] mb-4">
        {/* Mock World Map Background */}
        <div className="absolute inset-0 opacity-10 flex items-center justify-center">
          <Globe size={240} className="text-accent" />
        </div>
        
        {/* Visual Attack Indicators (Mock dots) */}
        <div className="absolute top-[20%] left-[30%] w-2 h-2 rounded-full bg-crit animate-ping" />
        <div className="absolute top-[40%] left-[60%] w-2 h-2 rounded-full bg-high animate-pulse" />
        <div className="absolute top-[70%] left-[20%] w-2 h-2 rounded-full bg-med" />
        <div className="absolute top-[30%] left-[80%] w-2 h-2 rounded-full bg-crit animate-ping" />
        
        {/* Arc lines (mocking connections) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" viewBox="0 0 400 200">
          <path d="M 120 40 Q 200 100 240 80" stroke="#ff3b5c" strokeWidth="1" fill="none" strokeDasharray="5,5" />
          <path d="M 80 140 Q 200 100 320 60" stroke="#ff8a3d" strokeWidth="1" fill="none" strokeDasharray="5,5" />
        </svg>

        <div className="absolute bottom-4 left-0 right-0 z-10">
          <div className="text-[10px] font-bold text-mute uppercase tracking-widest mb-2">Top Attacking Countries</div>
          <div className="space-y-3">
            {countryList.length > 0 ? countryList.map(([code, data]) => (
              <div key={code} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-ink">{code}</span>
                  <span className="text-mute font-bold">{data.count}</span>
                </div>
                <div className="h-1 bg-line rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${data.critical ? 'bg-crit' : 'bg-high'}`} 
                    style={{ width: `${Math.min(100, (data.count / (incidents.length || 1)) * 200)}%` }} 
                  />
                </div>
              </div>
            )) : (
              <div className="text-[11px] text-mute italic">No active threats mapped</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-line">
        <div className="text-[10px] font-bold text-mute uppercase tracking-widest mb-2">Attack Types</div>
        <div className="flex flex-wrap gap-2">
          {['Brute Force', 'Malware', 'Phishing', 'Exploitation'].map(type => (
            <div key={type} className="px-2 py-0.5 rounded bg-panel border border-line text-[9px] text-mute uppercase tracking-wider">
              {type}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
