import React from "react";
import { IncidentSummary } from "../types";
import { Globe } from "lucide-react";

interface Props {
  incidents: IncidentSummary[];
}

export default function ThreatMap({ incidents }: Props) {
  // Aggregate incidents by country
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

  const countryList = Object.entries(countryCounts).sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="bg-[#111827] border border-[#1f2a3d] rounded-lg p-3 flex flex-col h-full">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1f2a3d]">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#4da3ff]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#e6edf7]">
            Global Threat Origin
          </h3>
        </div>
        <span className="text-[11px] text-[#8a97ad]">
          {countryList.length} distinct geos
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {countryList.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-[#8a97ad]">
            No geopolitical telemetry active
          </div>
        ) : (
          countryList.map(([code, data]) => {
            return (
              <div
                key={code}
                className={`p-2 rounded border flex items-center justify-between text-xs ${
                  data.critical
                    ? "bg-[#ff3b5c]/10 border-[#ff3b5c]/40 text-[#ff3b5c]"
                    : "bg-[#0a0e17] border-[#1f2a3d] text-[#e6edf7]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="mono font-bold text-sm px-1.5 py-0.5 rounded bg-[#1f2a3d]">
                    {code}
                  </span>
                  <div>
                    <div className="font-semibold">{data.asn}</div>
                    <div className="text-[10px] text-[#8a97ad]">
                      {data.targeted ? "Targeted APT campaign" : "Automated scanner"}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="mono font-bold text-sm">
                    {data.count}
                  </div>
                  <div className="text-[10px] uppercase text-[#8a97ad]">
                    {data.count === 1 ? "Incident" : "Incidents"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
