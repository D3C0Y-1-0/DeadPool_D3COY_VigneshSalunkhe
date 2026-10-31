import React from "react";
import { useLive } from "../useLive";
import KpiCards from "../components/KpiCards";
import AlertQueue from "../components/AlertQueue";
import LiveFeed from "../components/LiveFeed";
import ThreatMap from "../components/ThreatMap";
import { IncidentSummary } from "../types";

export default function CommandCenter() {
  const { events, incidents, stats } = useLive();
  const incidentList = Object.values(incidents) as IncidentSummary[];

  return (
    <div className="space-y-4 max-w-[1800px] mx-auto">
      {/* KPI Cards Row */}
      <KpiCards stats={stats} />

      {/* Middle Grid: Alert Queue (2/3) + Threat Map (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[380px]">
        <div className="lg:col-span-2 h-full">
          <AlertQueue incidents={incidentList} />
        </div>
        <div className="h-full">
          <ThreatMap incidents={incidentList} />
        </div>
      </div>

      {/* Bottom Row: Live Event Feed */}
      <div className="h-[360px]">
        <LiveFeed events={events} />
      </div>
    </div>
  );
}
